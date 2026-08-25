import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Branch, Device, User } from '../entities';
import { getTenantManager } from '../tenant/tenant-context';
import { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  private accessExpires(typ: JwtPayload['typ']) {
    if (typ === 'admin') return process.env.JWT_ADMIN_ACCESS_EXPIRES ?? '30d';
    return process.env.JWT_DEVICE_ACCESS_EXPIRES ?? process.env.JWT_REFRESH_EXPIRES ?? '7d';
  }

  private tokens(payload: JwtPayload, refreshExpires: string) {
    const accessToken = this.jwt.sign(payload as object, {
      expiresIn: this.accessExpires(payload.typ) as never,
    });
    const refreshToken = this.jwt.sign({ ...payload, refresh: true } as object, {
      expiresIn: refreshExpires as never,
    });
    return { accessToken, refreshToken };
  }

  async adminLogin(email: string, password: string) {
    const manager = getTenantManager();
    const rows = await manager.query(
      `SELECT user_id, organization_id, password_hash, role, is_active FROM lookup_admin_by_email($1)`,
      [email],
    );
    const row = rows[0];
    if (!row?.password_hash) throw new UnauthorizedException('Invalid credentials');
    if (!row.is_active) throw new UnauthorizedException('Inactive user');
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await manager.query(`SELECT set_config('app.current_org_id', $1, true)`, [row.organization_id]);
    const user = await manager.findOneByOrFail(User, { id: row.user_id });
    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
        organizationId: user.organizationId,
      },
      ...this.tokens(
        {
          sub: user.id,
          typ: 'admin',
          organizationId: user.organizationId,
          userId: user.id,
          role: user.role,
        },
        process.env.JWT_ADMIN_REFRESH_EXPIRES ?? '30d',
      ),
    };
  }

  async pairDevice(activationCode: string, name: string, platform: string) {
    const manager = getTenantManager();
    const rows = await manager.query(
      `SELECT branch_id, organization_id FROM lookup_branch_by_activation_code($1)`,
      [activationCode],
    );
    const row = rows[0];
    if (!row) throw new UnauthorizedException('Invalid activation code');

    await manager.query(`SELECT set_config('app.current_org_id', $1, true)`, [row.organization_id]);
    const branch = await manager.findOneByOrFail(Branch, { id: row.branch_id });
    const device = manager.create(Device, {
      id: randomUUID(),
      organizationId: row.organization_id,
      branchId: branch.id,
      name,
      platform,
      pairedAt: new Date(),
      lastSeenAt: new Date(),
    });
    await manager.save(device);

    return {
      device: { id: device.id, branchId: branch.id, organizationId: branch.organizationId },
      branch: { id: branch.id, name: branch.name },
      ...this.tokens(
        {
          sub: device.id,
          typ: 'device',
          organizationId: branch.organizationId,
          branchId: branch.id,
          deviceId: device.id,
        },
        process.env.JWT_REFRESH_EXPIRES ?? '7d',
      ),
    };
  }

  async pinLogin(devicePayload: JwtPayload, userId: string, pin: string) {
    if (devicePayload.typ !== 'device' && devicePayload.typ !== 'cashier') {
      throw new UnauthorizedException('Device token required');
    }
    const manager = getTenantManager();
    const user = await manager.findOne(User, { where: { id: userId, isActive: true } });
    if (!user?.pinHash || user.role !== 'cashier') {
      throw new UnauthorizedException('Invalid PIN');
    }
    if (user.branchId && devicePayload.branchId && user.branchId !== devicePayload.branchId) {
      throw new UnauthorizedException('Cashier not in this branch');
    }
    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) throw new UnauthorizedException('Invalid PIN');

    if (devicePayload.deviceId) {
      await manager.update(Device, { id: devicePayload.deviceId }, { lastSeenAt: new Date() });
    }

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
        pinHash: user.pinHash,
      },
      ...this.tokens(
        {
          sub: user.id,
          typ: 'cashier',
          organizationId: user.organizationId,
          branchId: devicePayload.branchId,
          deviceId: devicePayload.deviceId,
          userId: user.id,
          role: user.role,
        },
        process.env.JWT_REFRESH_EXPIRES ?? '7d',
      ),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload & { refresh?: boolean; iat?: number; exp?: number }>(
        refreshToken,
      );
      const { refresh: _r, iat: _i, exp: _e, ...rest } = payload;
      const expires =
        rest.typ === 'admin'
          ? (process.env.JWT_ADMIN_REFRESH_EXPIRES ?? '30d')
          : (process.env.JWT_REFRESH_EXPIRES ?? '7d');
      return this.tokens(rest, expires);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async me(payload: JwtPayload) {
    const manager = getTenantManager();
    if (payload.userId) {
      const user = await manager.findOneBy(User, { id: payload.userId });
      return { payload, user };
    }
    return { payload };
  }
}
