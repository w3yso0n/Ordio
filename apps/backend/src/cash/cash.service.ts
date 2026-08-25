import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovement, CashRegisterSession, Order, Payment, Sale } from '../entities';
import { getTenantManager } from '../tenant/tenant-context';
import { JwtPayload } from '../auth/auth.types';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CashService {
  constructor(private readonly events: EventsGateway) {}

  async current(auth: JwtPayload) {
    if (!auth.branchId) throw new ForbiddenException('Device token required');
    return this.openByBranch(auth.branchId);
  }

  async currentForBranch(branchId: string) {
    return this.openByBranch(branchId);
  }

  async summaryForBranch(branchId: string) {
    const session = await this.openByBranch(branchId);
    if (!session) {
      const history = await this.history(branchId);
      return { session: null, summary: null, history };
    }
    const summary = await this.sessionSummary(session);
    const history = await this.history(branchId);
    return { session, summary, history };
  }

  async openForBranch(auth: JwtPayload, branchId: string, openingAmountCents: number) {
    if (!auth.userId) throw new ForbiddenException('Admin token required');
    const existing = await this.openByBranch(branchId);
    if (existing) throw new ConflictException('Esta sucursal ya tiene el día abierto');
    const manager = getTenantManager();
    const session = await manager.save(
      manager.create(CashRegisterSession, {
        organizationId: auth.organizationId,
        branchId,
        deviceId: null,
        openedByUserId: auth.userId,
        status: 'open',
        openingAmountCents,
        openedAt: new Date(),
      }),
    );
    this.events.emitCashChanged(branchId);
    return session;
  }

  async addMovement(
    id: string,
    auth: JwtPayload,
    body: { type: 'deposit' | 'withdrawal' | 'expense'; amountCents: number; note?: string | null },
  ) {
    const session = await this.requireOpen(id);
    const manager = getTenantManager();
    const movement = await manager.save(
      manager.create(CashMovement, {
        organizationId: auth.organizationId,
        sessionId: session.id,
        type: body.type,
        amountCents: body.amountCents,
        note: body.note ?? null,
      }),
    );
    this.events.emitCashChanged(session.branchId);
    return movement;
  }

  async closeForBranch(id: string, auth: JwtPayload, declaredClosingCents: number) {
    const session = await this.requireOpen(id);
    const manager = getTenantManager();
    const open = await manager.find(Order, {
      where: { branchId: session.branchId, status: 'open' },
      order: { dailyNumber: 'ASC' },
    });
    if (open.length > 0) {
      const labels = open
        .slice(0, 6)
        .map((order) => (order.dailyNumber != null ? `#${order.dailyNumber}` : 'sin número'))
        .join(', ');
      throw new ConflictException(
        open.length === 1
          ? `Hay 1 cuenta abierta (${labels}). Cóbrala o anúlala en la caja antes de cerrar el día.`
          : `Hay ${open.length} cuentas abiertas (${labels}). Cóbralas o anúlalas en la caja antes de cerrar el día.`,
      );
    }
    const expected = await this.expectedClosing(session);
    session.status = 'closed';
    session.closedByUserId = auth.userId ?? null;
    session.closedAt = new Date();
    session.expectedClosingCents = expected;
    session.declaredClosingCents = declaredClosingCents;
    session.differenceCents = declaredClosingCents - expected;
    await manager.save(session);
    this.events.emitCashChanged(session.branchId);
    return session;
  }

  private async openByBranch(branchId: string) {
    const manager = getTenantManager();
    return manager.findOne(CashRegisterSession, {
      where: { branchId, status: 'open' },
    });
  }

  private async requireOpen(id: string) {
    const manager = getTenantManager();
    const session = await manager.findOne(CashRegisterSession, { where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'open') throw new BadRequestException('Session is not open');
    return session;
  }

  private async history(branchId: string) {
    const manager = getTenantManager();
    return manager.find(CashRegisterSession, {
      where: { branchId, status: 'closed' },
      order: { openedAt: 'DESC' },
      take: 12,
    });
  }

  private async sessionSummary(session: CashRegisterSession) {
    const manager = getTenantManager();
    const sales = await manager.find(Sale, { where: { sessionId: session.id, status: 'paid' } });
    let cashSalesCents = 0;
    let transferSalesCents = 0;
    for (const sale of sales) {
      const payments = await manager.find(Payment, { where: { saleId: sale.id } });
      cashSalesCents += payments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amountCents, 0);
      transferSalesCents += payments.filter((p) => p.method === 'transfer').reduce((s, p) => s + p.amountCents, 0);
    }
    const movements = await manager.find(CashMovement, { where: { sessionId: session.id } });
    const depositsCents = movements.filter((m) => m.type === 'deposit').reduce((s, m) => s + m.amountCents, 0);
    const withdrawalsCents = movements.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.amountCents, 0);
    const expensesCents = movements.filter((m) => m.type === 'expense').reduce((s, m) => s + m.amountCents, 0);
    const openChecks = await manager.find(Order, {
      where: { branchId: session.branchId, status: 'open' },
      order: { dailyNumber: 'ASC' },
    });
    const expectedClosingCents =
      session.openingAmountCents + cashSalesCents + depositsCents - withdrawalsCents - expensesCents;
    return {
      salesCount: sales.length,
      cashSalesCents,
      transferSalesCents,
      depositsCents,
      withdrawalsCents,
      expensesCents,
      expectedClosingCents,
      openChecksCount: openChecks.length,
      openChecks: openChecks.map((order) => ({
        id: order.id,
        dailyNumber: order.dailyNumber,
        totalCents: order.totalCents,
      })),
    };
  }

  private async expectedClosing(session: CashRegisterSession) {
    const summary = await this.sessionSummary(session);
    return summary.expectedClosingCents;
  }
}
