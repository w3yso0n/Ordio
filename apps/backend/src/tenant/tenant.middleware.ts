import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { tenantAls } from './tenant-context';
import { JwtPayload } from '../auth/auth.types';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let settled = false;
    const finalize = async (ok: boolean) => {
      if (settled) return;
      settled = true;
      try {
        if (qr.isTransactionActive) {
          if (ok) await qr.commitTransaction();
          else await qr.rollbackTransaction();
        }
      } finally {
        if (!qr.isReleased) await qr.release();
      }
    };

    res.on('finish', () => {
      void finalize(res.statusCode < 500);
    });
    res.on('close', () => {
      if (!settled) void finalize(false);
    });

    tenantAls.run(qr, () => {
      void (async () => {
        try {
          const header = req.headers.authorization;
          if (header?.startsWith('Bearer ')) {
            try {
              const payload = await this.jwt.verifyAsync<JwtPayload>(header.slice(7));
              if (payload.organizationId) {
                await qr.query(`SELECT set_config('app.current_org_id', $1, true)`, [
                  payload.organizationId,
                ]);
                if (payload.branchId) {
                  await qr.query(`SELECT set_config('app.current_branch_id', $1, true)`, [
                    payload.branchId,
                  ]);
                }
                (req as Request & { auth?: JwtPayload }).auth = payload;
              }
            } catch {
              // Guard JWT rechaza después; no set_config.
            }
          }
          next();
        } catch (err) {
          await finalize(false);
          next(err);
        }
      })();
    });
  }
}
