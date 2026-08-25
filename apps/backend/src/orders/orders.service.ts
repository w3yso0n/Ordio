import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  applyKitchenSend,
  businessDateIso,
  kitchenDelta,
  recalculateOrderTotals,
  type KitchenTicketPayload,
} from '@ordio/shared';
import { In } from 'typeorm';
import {
  CashRegisterSession,
  Order,
  OrderItem,
  Organization,
  Payment,
  PrintJob,
  Sale,
  SaleItem,
} from '../entities';
import { getTenantManager } from '../tenant/tenant-context';
import { JwtPayload } from '../auth/auth.types';
import { EventsGateway } from '../events/events.gateway';

type UpsertBody = {
  branchId: string;
  cashierUserId: string;
  cashRegisterSessionId?: string | null;
  tableLabel?: string | null;
  note?: string | null;
  clientCreatedAt: string;
  items: Array<{
    id: string;
    productId: string | null;
    nameSnapshot: string;
    unitPriceCents: number;
    qty: number;
    note?: string | null;
  }>;
};

@Injectable()
export class OrdersService {
  constructor(private readonly events: EventsGateway) {}

  async listOpen(auth: JwtPayload) {
    this.requireDevice(auth);
    const manager = getTenantManager();
    const orders = await manager.find(Order, {
      where: { branchId: auth.branchId, status: 'open' },
      order: { dailyNumber: 'ASC', createdAt: 'ASC' },
    });
    const items = orders.length
      ? await manager.find(OrderItem, { where: { orderId: In(orders.map((order) => order.id)) } })
      : [];
    const byOrder = new Map<string, OrderItem[]>();
    for (const item of items) {
      const list = byOrder.get(item.orderId) ?? [];
      list.push(item);
      byOrder.set(item.orderId, list);
    }
    return orders.map((order) => {
      const orderItems = byOrder.get(order.id) ?? [];
      return {
        id: order.id,
        dailyNumber: order.dailyNumber,
        tableLabel: order.tableLabel,
        totalCents: order.totalCents,
        itemCount: orderItems.reduce((sum, item) => sum + item.qty, 0),
        pendingKitchenQty: orderItems.reduce((sum, item) => sum + Math.abs(item.qty - item.sentQty), 0),
        createdAt: order.createdAt,
      };
    });
  }

  async getOne(id: string, auth: JwtPayload) {
    this.requireDevice(auth);
    const order = await this.loadOrder(id);
    this.assertSameBranch(order, auth);
    return this.toDto(order);
  }

  async upsert(id: string, body: UpsertBody, auth: JwtPayload) {
    this.requireDevice(auth);
    if (body.branchId !== auth.branchId) {
      throw new ForbiddenException('La orden no pertenece a esta sucursal');
    }
    const manager = getTenantManager();
    const session = await this.requireSession(body.cashRegisterSessionId, auth);

    const existing = await manager.findOne(Order, { where: { id } });
    if (existing) {
      this.assertSameBranch(existing, auth);
      if (existing.status !== 'open') throw new ConflictException('La cuenta no está abierta');
    }

    const previousItems = existing
      ? await manager.find(OrderItem, { where: { orderId: id } })
      : [];
    const previousById = new Map(previousItems.map((item) => [item.id, item]));
    const incomingIds = new Set(body.items.map((item) => item.id));

    const mergedInputs = [
      ...body.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        nameSnapshot: item.nameSnapshot,
        unitPriceCents: item.unitPriceCents,
        qty: item.qty,
        sentQty: previousById.get(item.id)?.sentQty ?? 0,
        note: item.note ?? null,
      })),
      ...previousItems
        .filter((item) => !incomingIds.has(item.id) && item.sentQty > 0)
        .map((item) => ({
          id: item.id,
          productId: item.productId,
          nameSnapshot: item.nameSnapshot,
          unitPriceCents: item.unitPriceCents,
          qty: 0,
          sentQty: item.sentQty,
          note: item.note,
        })),
    ].filter((item) => item.qty > 0 || item.sentQty > 0);

    if (!existing && mergedInputs.length === 0) {
      throw new BadRequestException('La cuenta necesita al menos un producto');
    }

    const totals = recalculateOrderTotals(mergedInputs);

    if (existing) {
      existing.cashierUserId = auth.userId ?? body.cashierUserId;
      existing.cashRegisterSessionId = session.id;
      existing.tableLabel = body.tableLabel ?? null;
      existing.note = body.note ?? null;
      existing.subtotalCents = totals.subtotalCents;
      existing.totalCents = totals.totalCents;
      if (existing.dailyNumber == null) {
        const assigned = await this.assignDailyNumber(existing.branchId, auth);
        existing.dailyNumber = assigned.dailyNumber;
        existing.businessDate = assigned.businessDate;
      }
      await manager.save(existing);
      await manager.delete(OrderItem, { orderId: id });
    } else {
      const assigned = await this.assignDailyNumber(body.branchId, auth);
      await manager.save(
        manager.create(Order, {
          id,
          organizationId: auth.organizationId,
          branchId: body.branchId,
          deviceId: auth.deviceId,
          cashierUserId: auth.userId ?? body.cashierUserId,
          cashRegisterSessionId: session.id,
          tableLabel: body.tableLabel ?? null,
          dailyNumber: assigned.dailyNumber,
          businessDate: assigned.businessDate,
          status: 'open',
          note: body.note ?? null,
          subtotalCents: totals.subtotalCents,
          totalCents: totals.totalCents,
          clientCreatedAt: new Date(body.clientCreatedAt),
        }),
      );
    }

    await manager.save(
      totals.items.map((item) =>
        manager.create(OrderItem, {
          id: item.id,
          organizationId: auth.organizationId,
          orderId: id,
          productId: item.productId,
          nameSnapshot: item.nameSnapshot,
          unitPriceCents: item.unitPriceCents,
          qty: item.qty,
          sentQty: item.sentQty ?? 0,
          note: item.note,
          lineTotalCents: item.lineTotalCents,
        }),
      ),
    );

    return this.toDto(await manager.findOneOrFail(Order, { where: { id } }));
  }

  async send(id: string, auth: JwtPayload) {
    this.requireDevice(auth);
    const order = await this.loadOrder(id);
    this.assertSameBranch(order, auth);
    if (order.status !== 'open') throw new ConflictException('La cuenta no está abierta');
    return this.sendPending(order);
  }

  async voidOrder(id: string, auth: JwtPayload) {
    this.requireDevice(auth);
    const manager = getTenantManager();
    const order = await this.loadOrder(id);
    this.assertSameBranch(order, auth);
    if (order.status !== 'open') throw new ConflictException('La cuenta no está abierta');

    const items = await manager.find(OrderItem, { where: { orderId: id } });
    const voidLines = items.filter((item) => item.sentQty > 0);
    let kitchen: KitchenTicketPayload | null = null;
    if (voidLines.length > 0) {
      kitchen = await this.saveKitchenJob(
        order,
        voidLines.map((item) => ({
          name: item.nameSnapshot,
          qty: item.sentQty,
          kind: 'void' as const,
        })),
      );
    }

    order.status = 'voided';
    await manager.save(order);
    return { ...(await this.toDto(order)), kitchen };
  }

  async pay(
    id: string,
    body: { method: 'cash' | 'transfer'; amountCents: number; cashRegisterSessionId: string },
    auth: JwtPayload,
  ) {
    this.requireDevice(auth);
    const manager = getTenantManager();
    const order = await manager.findOne(Order, { where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    this.assertSameBranch(order, auth);
    if (order.status === 'paid') {
      const sale = await manager.findOneByOrFail(Sale, { orderId: id });
      return { order: await this.toDto(order), sale, duplicate: true, kitchen: null };
    }
    if (order.status !== 'open') throw new ConflictException('La cuenta no está abierta');

    const session = await this.requireSession(body.cashRegisterSessionId, auth);

    const kitchenResult = await this.sendPending(order);
    const fresh = await this.loadOrder(id);
    const items = await manager.find(OrderItem, { where: { orderId: id } });
    const billable = items.filter((item) => item.qty > 0);
    if (billable.length === 0) {
      throw new BadRequestException('No hay productos para cobrar. Anula la cuenta si ya no aplica.');
    }
    const totals = recalculateOrderTotals(
      billable.map((item) => ({
        id: item.id,
        productId: item.productId,
        nameSnapshot: item.nameSnapshot,
        unitPriceCents: item.unitPriceCents,
        qty: item.qty,
        note: item.note,
      })),
    );

    fresh.status = 'paid';
    fresh.paidAt = new Date();
    fresh.cashRegisterSessionId = session.id;
    fresh.subtotalCents = totals.subtotalCents;
    fresh.totalCents = totals.totalCents;
    await manager.save(fresh);

    const sale = await manager.save(
      manager.create(Sale, {
        organizationId: auth.organizationId,
        orderId: fresh.id,
        sessionId: session.id,
        totalCents: totals.totalCents,
        status: 'paid',
      }),
    );
    await manager.save(
      totals.items.map((item) =>
        manager.create(SaleItem, {
          organizationId: auth.organizationId,
          saleId: sale.id,
          productId: item.productId,
          nameSnapshot: item.nameSnapshot,
          unitPriceCents: item.unitPriceCents,
          qty: item.qty,
          note: item.note,
          lineTotalCents: item.lineTotalCents,
        }),
      ),
    );
    await manager.save(
      manager.create(Payment, {
        organizationId: auth.organizationId,
        saleId: sale.id,
        method: body.method,
        amountCents: totals.totalCents,
      }),
    );
    await manager.save(
      manager.create(PrintJob, {
        organizationId: auth.organizationId,
        saleId: sale.id,
        orderId: fresh.id,
        kind: 'receipt',
        status: 'pending',
        payload: {
          saleId: sale.id,
          totalCents: totals.totalCents,
          method: body.method,
          items: totals.items,
        },
        attempts: 0,
      }),
    );

    this.events.emitCashChanged(fresh.branchId);
    return {
      order: await this.toDto(fresh),
      sale,
      duplicate: false,
      kitchen: kitchenResult.kitchen.lines.length ? kitchenResult.kitchen : null,
    };
  }

  private async sendPending(order: Order) {
    const manager = getTenantManager();
    const items = await manager.find(OrderItem, { where: { orderId: order.id } });
    const lines = kitchenDelta(items);
    if (lines.length === 0) {
      return { ...(await this.toDto(order)), kitchen: this.emptyKitchen(order) };
    }

    const kitchen = await this.saveKitchenJob(
      order,
      lines.map((line) => ({ name: line.nameSnapshot, qty: line.qty, kind: line.kind })),
    );

    const nextItems = applyKitchenSend(items);
    await manager.delete(OrderItem, { orderId: order.id });
    if (nextItems.length > 0) {
      await manager.save(
        nextItems.map((item) =>
          manager.create(OrderItem, {
            id: item.id,
            organizationId: item.organizationId,
            orderId: item.orderId,
            productId: item.productId,
            nameSnapshot: item.nameSnapshot,
            unitPriceCents: item.unitPriceCents,
            qty: item.qty,
            sentQty: item.sentQty,
            note: item.note,
            lineTotalCents: item.lineTotalCents,
          }),
        ),
      );
    }

    const totals = recalculateOrderTotals(
      nextItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        nameSnapshot: item.nameSnapshot,
        unitPriceCents: item.unitPriceCents,
        qty: item.qty,
        sentQty: item.sentQty,
        note: item.note,
      })),
    );
    order.subtotalCents = totals.subtotalCents;
    order.totalCents = totals.totalCents;
    await manager.save(order);

    return { ...(await this.toDto(order)), kitchen };
  }

  private async saveKitchenJob(
    order: Order,
    lines: KitchenTicketPayload['lines'],
  ): Promise<KitchenTicketPayload> {
    const manager = getTenantManager();
    const previous = await manager.count(PrintJob, { where: { orderId: order.id, kind: 'kitchen' } });
    const kitchen: KitchenTicketPayload = {
      dailyNumber: order.dailyNumber ?? 0,
      createdAtIso: new Date().toISOString(),
      round: previous + 1,
      tableLabel: order.tableLabel,
      lines,
    };
    await manager.save(
      manager.create(PrintJob, {
        organizationId: order.organizationId,
        saleId: null,
        orderId: order.id,
        kind: 'kitchen',
        status: 'pending',
        payload: kitchen,
        attempts: 0,
      }),
    );
    this.events.emitKitchenTicket(order.organizationId, order.branchId, kitchen);
    return kitchen;
  }

  private emptyKitchen(order: Order): KitchenTicketPayload {
    return {
      dailyNumber: order.dailyNumber ?? 0,
      createdAtIso: new Date().toISOString(),
      round: 0,
      tableLabel: order.tableLabel,
      lines: [],
    };
  }

  private async assignDailyNumber(branchId: string, auth: JwtPayload) {
    const manager = getTenantManager();
    const org = await manager.findOne(Organization, { where: { id: auth.organizationId } });
    const businessDate = businessDateIso(new Date(), org?.timezone ?? 'America/Mexico_City');
    const rows = (await manager.query(
      `INSERT INTO branch_daily_counters (organization_id, branch_id, business_date, last_number)
       VALUES ($1, $2, $3::date, 1)
       ON CONFLICT (branch_id, business_date)
       DO UPDATE SET last_number = branch_daily_counters.last_number + 1
       RETURNING last_number`,
      [auth.organizationId, branchId, businessDate],
    )) as Array<{ last_number: number }>;
    return { dailyNumber: Number(rows[0]?.last_number ?? 1), businessDate };
  }

  private async requireSession(sessionId: string | null | undefined, auth: JwtPayload) {
    const manager = getTenantManager();
    if (sessionId) {
      const named = await manager.findOne(CashRegisterSession, {
        where: { id: sessionId, status: 'open', branchId: auth.branchId },
      });
      if (named) return named;
    }
    const open = await manager.findOne(CashRegisterSession, {
      where: { status: 'open', branchId: auth.branchId },
    });
    if (!open) throw new BadRequestException('Hoy no hay caja abierta. Ábrela desde el panel.');
    return open;
  }

  private async loadOrder(id: string) {
    const order = await getTenantManager().findOne(Order, { where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private async toDto(order: Order) {
    const items = await getTenantManager().find(OrderItem, {
      where: { orderId: order.id },
      order: { createdAt: 'ASC' },
    });
    return {
      id: order.id,
      dailyNumber: order.dailyNumber,
      businessDate: order.businessDate,
      status: order.status,
      tableLabel: order.tableLabel,
      note: order.note,
      subtotalCents: order.subtotalCents,
      totalCents: order.totalCents,
      clientCreatedAt: order.clientCreatedAt,
      createdAt: order.createdAt,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        nameSnapshot: item.nameSnapshot,
        unitPriceCents: item.unitPriceCents,
        qty: item.qty,
        sentQty: item.sentQty,
        note: item.note,
        lineTotalCents: item.lineTotalCents,
      })),
    };
  }

  private requireDevice(auth: JwtPayload): asserts auth is JwtPayload & { deviceId: string; branchId: string } {
    if (!auth.deviceId || !auth.branchId) throw new ForbiddenException('Device token required');
  }

  private assertSameBranch(order: Order, auth: JwtPayload) {
    if (order.branchId !== auth.branchId) {
      throw new ForbiddenException('La cuenta pertenece a otra sucursal');
    }
  }
}
