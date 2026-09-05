import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { EntityManager, In, IsNull } from 'typeorm';
import { Category, Product, Sale, SaleItem, Payment, User, Branch, Device, CashRegisterSession, Order, OrderItem, PrintJob, Supply, SupplyExpense } from '../entities';
import { getTenantManager } from '../tenant/tenant-context';
import { EventsGateway } from '../events/events.gateway';
import { JwtPayload } from '../auth/auth.types';

function qty(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function formatBranchBlock(
  name: string,
  counts: { products: number; categories: number; devices: number; sessions: number; orders: number },
) {
  const catalog: string[] = [];
  if (counts.categories) catalog.push(qty(counts.categories, 'categoría activa', 'categorías activas'));
  if (counts.products) catalog.push(qty(counts.products, 'producto activo', 'productos activos'));
  const history: string[] = [];
  if (counts.devices) history.push(qty(counts.devices, 'caja emparejada', 'cajas emparejadas'));
  if (counts.sessions) history.push(qty(counts.sessions, 'sesión de caja', 'sesiones de caja'));
  if (counts.orders) history.push('ventas u órdenes');
  if (!catalog.length && !history.length) return null;
  const parts = [...catalog, ...history].join(', ');
  let hint = '';
  if (catalog.length && history.length) {
    hint =
      ' Primero borra el catálogo en Productos. Si ya hubo cajas o ventas, la sucursal se conserva para el historial.';
  } else if (catalog.length) {
    hint = ' Primero borra esas categorías y productos en Productos.';
  } else {
    hint = ' Si ya hubo cajas o ventas, la sucursal se conserva para el historial.';
  }
  return `No se puede borrar «${name}» porque tiene ${parts}.${hint}`;
}

@Injectable()
export class AdminService {
  constructor(private readonly events: EventsGateway) {}

  private async branchUsage(id: string) {
    const manager = getTenantManager();
    const [products, categories, devices, sessions, orders] = await Promise.all([
      manager.count(Product, { where: { branchId: id, deletedAt: IsNull() } }),
      manager.count(Category, { where: { branchId: id, deletedAt: IsNull() } }),
      manager.count(Device, { where: { branchId: id } }),
      manager.count(CashRegisterSession, { where: { branchId: id } }),
      manager.count(Order, { where: { branchId: id } }),
    ]);
    return { products, categories, devices, sessions, orders };
  }

  async branches() {
    const list = await getTenantManager().find(Branch, { order: { name: 'ASC' } });
    return Promise.all(
      list.map(async (branch) => ({
        ...branch,
        deleteBlockedReason: formatBranchBlock(branch.name, await this.branchUsage(branch.id)),
      })),
    );
  }

  async upsertBranch(
    auth: JwtPayload,
    id: string | undefined,
    data: { name: string; activationCode?: string; address?: string | null },
  ) {
    const manager = getTenantManager();
    const existing = id ? await manager.findOneBy(Branch, { id }) : null;
    if (id && !existing) throw new NotFoundException('Sucursal no encontrada');
    const activationCode = (
      data.activationCode?.trim() ||
      existing?.activationCode ||
      `ORDIO-${randomUUID().slice(0, 6).toUpperCase()}`
    ).toUpperCase();
    const duplicate = await manager.findOne(Branch, { where: { activationCode } });
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException(
        `No se puede usar el código ${activationCode}: ya lo tiene otra sucursal. Elige otro o déjalo vacío para generar uno nuevo.`,
      );
    }
    const branch = existing ?? manager.create(Branch, { organizationId: auth.organizationId });
    branch.name = data.name.trim();
    branch.activationCode = activationCode;
    branch.address = data.address?.trim() ? data.address.trim() : null;
    return manager.save(branch);
  }

  async deleteBranch(id: string) {
    const manager = getTenantManager();
    const branch = await manager.findOneBy(Branch, { id });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    const reason = formatBranchBlock(branch.name, await this.branchUsage(id));
    if (reason) throw new BadRequestException(reason);
    await manager.delete(Product, { branchId: id });
    await manager.delete(Category, { branchId: id });
    await manager.update(User, { branchId: id }, { branchId: null });
    await manager.remove(branch);
    return { ok: true };
  }

  async updateCategory(
    id: string,
    data: { name: string; sortOrder?: number; isActive?: boolean },
  ) {
    const manager = getTenantManager();
    const row = await manager.findOneBy(Category, { id });
    if (!row || row.deletedAt) throw new NotFoundException('Categoría no encontrada');
    row.name = data.name.trim();
    if (data.sortOrder !== undefined) row.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) row.isActive = data.isActive;
    const saved = await manager.save(row);
    this.events.emitCatalogUpdated(row.branchId);
    return saved;
  }

  async deleteCategory(id: string) {
    const manager = getTenantManager();
    const row = await manager.findOneBy(Category, { id });
    if (!row || row.deletedAt) throw new NotFoundException('Categoría no encontrada');
    const products = await manager.count(Product, { where: { categoryId: id, deletedAt: IsNull() } });
    if (products) {
      throw new BadRequestException(
        `No se puede borrar «${row.name}» porque tiene ${qty(products, 'producto', 'productos')}. Bórralos o cámbialos de categoría primero.`,
      );
    }
    row.deletedAt = new Date();
    row.isActive = false;
    await manager.save(row);
    this.events.emitCatalogUpdated(row.branchId);
    return { ok: true };
  }

  async deleteUser(id: string) {
    const manager = getTenantManager();
    const user = await manager.findOneBy(User, { id });
    if (!user || user.deletedAt) throw new NotFoundException('Usuario no encontrado');
    if (user.role === 'owner') {
      throw new BadRequestException(
        `No se puede borrar a ${user.displayName} porque es el dueño de la cuenta. El owner siempre debe existir.`,
      );
    }
    user.deletedAt = new Date();
    user.isActive = false;
    await manager.save(user);
    return { ok: true };
  }


  private async paymentTotals(manager: EntityManager, start: Date) {
    const payments = await manager.query(
      `SELECT p.method, COALESCE(SUM(p.amount_cents),0)::int AS total
       FROM payments p
       JOIN sales s ON s.id = p.sale_id
       WHERE s.created_at >= $1 AND s.status = 'paid'
       GROUP BY p.method`,
      [start],
    );
    let cashCents = 0;
    let transferCents = 0;
    for (const row of payments) {
      if (row.method === 'cash') cashCents += Number(row.total);
      if (row.method === 'transfer' || row.method === 'card') transferCents += Number(row.total);
    }
    return { cashCents, transferCents };
  }

  async dashboard() {
    const manager = getTenantManager();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);

    const [sales, monthRow, todayPay, monthPay, suppliesRow, suppliesBreakdown] = await Promise.all([
      manager
        .createQueryBuilder(Sale, 's')
        .where('s.createdAt >= :start', { start })
        .andWhere('s.status = :status', { status: 'paid' })
        .getMany(),
      manager
        .createQueryBuilder(Sale, 's')
        .select('COUNT(s.id)', 'salesCount')
        .addSelect('COALESCE(SUM(s.totalCents), 0)', 'totalCents')
        .where('s.createdAt >= :start', { start: monthStart })
        .andWhere('s.status = :status', { status: 'paid' })
        .getRawOne<{ salesCount: string; totalCents: string }>(),
      this.paymentTotals(manager, start),
      this.paymentTotals(manager, monthStart),
      manager.query(
        `SELECT COALESCE(SUM(e.amount_cents),0)::int AS total
         FROM supply_expenses e
         JOIN supplies s ON s.id = e.supply_id
         WHERE e.year = $1 AND e.month = $2 AND s.deleted_at IS NULL`,
        [monthStart.getFullYear(), monthStart.getMonth() + 1],
      ),
      manager.query(
        `SELECT s.id, s.name, e.amount_cents AS "amountCents"
         FROM supply_expenses e
         JOIN supplies s ON s.id = e.supply_id
         WHERE e.year = $1 AND e.month = $2 AND s.deleted_at IS NULL AND e.amount_cents > 0
         ORDER BY e.amount_cents DESC, s.name ASC`,
        [monthStart.getFullYear(), monthStart.getMonth() + 1],
      ),
    ]);

    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, totalCents: 0, count: 0 }));
    for (const sale of sales) {
      const hour = new Date(sale.createdAt).getHours();
      byHour[hour].totalCents += sale.totalCents;
      byHour[hour].count += 1;
    }
    const monthTotalCents = Number(monthRow?.totalCents ?? 0);
    const suppliesCents = Number(suppliesRow?.[0]?.total ?? 0);
    return {
      date: start.toISOString(),
      salesCount: sales.length,
      totalCents: sales.reduce((sum, s) => sum + s.totalCents, 0),
      cashCents: todayPay.cashCents,
      transferCents: todayPay.transferCents,
      byHour,
      month: {
        start: monthStart.toISOString(),
        salesCount: Number(monthRow?.salesCount ?? 0),
        totalCents: monthTotalCents,
        cashCents: monthPay.cashCents,
        transferCents: monthPay.transferCents,
        suppliesCents,
        profitCents: monthTotalCents - suppliesCents,
        supplies: (suppliesBreakdown ?? []).map((row: { id: string; name: string; amountCents: string | number }) => ({
          id: row.id,
          name: row.name,
          amountCents: Number(row.amountCents),
        })),
      },
    };
  }

  categories(branchId: string) {
    return getTenantManager().find(Category, {
      where: { branchId, deletedAt: IsNull() },
      order: { sortOrder: 'ASC' },
    });
  }

  async createCategory(auth: JwtPayload, branchId: string, name: string, sortOrder = 0) {
    const manager = getTenantManager();
    const row = await manager.save(
      manager.create(Category, {
        organizationId: auth.organizationId,
        branchId,
        name,
        sortOrder,
        isActive: true,
      }),
    );
    this.events.emitCatalogUpdated(branchId);
    return row;
  }

  products(branchId: string) {
    return getTenantManager().find(Product, {
      where: { branchId, deletedAt: IsNull() },
      order: { sortOrder: 'ASC' },
    });
  }

  async upsertProduct(
    auth: JwtPayload,
    branchId: string,
    id: string | undefined,
    data: {
      categoryId: string;
      name: string;
      priceCents: number;
      sku?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      isPinned?: boolean;
    },
  ) {
    const manager = getTenantManager();
    const product = id
      ? await manager.findOneByOrFail(Product, { id })
      : manager.create(Product, {
          id: randomUUID(),
          organizationId: auth.organizationId,
          branchId,
        });
    product.categoryId = data.categoryId;
    product.name = data.name;
    product.priceCents = data.priceCents;
    product.sku = data.sku ?? null;
    product.isActive = data.isActive ?? true;
    product.sortOrder = data.sortOrder ?? 0;
    if (data.isPinned !== undefined) product.isPinned = data.isPinned;
    else if (!id) product.isPinned = false;
    const saved = await manager.save(product);
    this.events.emitCatalogUpdated(branchId);
    return saved;
  }

  async deleteProduct(id: string) {
    const manager = getTenantManager();
    const product = await manager.findOneBy(Product, { id });
    if (!product) throw new NotFoundException('Product not found');
    product.deletedAt = new Date();
    product.isActive = false;
    await manager.save(product);
    this.events.emitCatalogUpdated(product.branchId);
    return { ok: true };
  }

  private publicUser(user: User) {
    const { passwordHash, pinHash, ...rest } = user;
    return {
      ...rest,
      hasPin: Boolean(pinHash),
      hasPassword: Boolean(passwordHash),
    };
  }

  async users() {
    const rows = await getTenantManager().find(User, { where: { deletedAt: IsNull() } });
    return rows.map((row) => this.publicUser(row));
  }

  async upsertUser(
    auth: JwtPayload,
    id: string | undefined,
    data: {
      displayName: string;
      role: 'owner' | 'admin' | 'cashier';
      email?: string | null;
      password?: string;
      pin?: string;
      branchId?: string | null;
      isActive?: boolean;
    },
  ) {
    const manager = getTenantManager();
    const user = id
      ? await manager.findOneByOrFail(User, { id })
      : manager.create(User, { organizationId: auth.organizationId });
    if (!id && data.role === 'owner') {
      throw new BadRequestException('No se puede crear otro dueño. Usa admin o cajero.');
    }
    if (id && user.role === 'owner' && data.role !== 'owner') {
      throw new BadRequestException(
        `No se puede cambiar el rol de ${user.displayName}: el dueño no puede dejar de ser owner.`,
      );
    }

    const nextRole = id && user.role === 'owner' ? 'owner' : data.role;
    const isPlatform = nextRole === 'owner' || nextRole === 'admin';
    const email = data.email?.trim().toLowerCase() || null;

    if (isPlatform) {
      if (!id && !email) {
        throw new BadRequestException('El correo es obligatorio para entrar al panel web.');
      }
      if (!id && !data.password) {
        throw new BadRequestException('La contraseña es obligatoria para entrar al panel web.');
      }
      if (id && user.email && !email) {
        throw new BadRequestException('El correo no se puede dejar vacío.');
      }
    } else if (!id && !data.pin) {
      throw new BadRequestException('El PIN es obligatorio para cajeros.');
    }

    if (email) {
      const duplicate = await manager
        .createQueryBuilder(User, 'u')
        .where('lower(u.email) = :email', { email })
        .andWhere('u.deletedAt IS NULL')
        .getOne();
      if (duplicate && duplicate.id !== user.id) {
        throw new ConflictException('Ya existe un usuario con ese correo.');
      }
    }

    user.displayName = data.displayName;
    user.role = nextRole;
    user.email = isPlatform ? email : null;
    user.branchId = isPlatform ? null : (data.branchId ?? null);
    user.isActive = data.isActive ?? true;
    if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.pin && !isPlatform) user.pinHash = await bcrypt.hash(data.pin, 10);
    return this.publicUser(await manager.save(user));
  }

  async sales() {
    const manager = getTenantManager();
    const sales = await manager.find(Sale, { order: { createdAt: 'DESC' }, take: 200 });
    if (sales.length === 0) return [];

    const saleIds = sales.map((sale) => sale.id);
    const orderIds = sales.map((sale) => sale.orderId);
    const [items, payments, orders] = await Promise.all([
      manager.find(SaleItem, { where: { saleId: In(saleIds) }, order: { createdAt: 'ASC' } }),
      manager.find(Payment, { where: { saleId: In(saleIds) } }),
      manager.find(Order, { where: { id: In(orderIds) } }),
    ]);

    const itemsBySale = new Map<string, SaleItem[]>();
    for (const item of items) {
      const list = itemsBySale.get(item.saleId) ?? [];
      list.push(item);
      itemsBySale.set(item.saleId, list);
    }
    const paymentBySale = new Map(payments.map((payment) => [payment.saleId, payment]));
    const orderById = new Map(orders.map((order) => [order.id, order]));

    return sales.map((sale) => {
      const order = orderById.get(sale.orderId);
      const payment = paymentBySale.get(sale.id);
      const saleItems = (itemsBySale.get(sale.id) ?? []).filter((item) => item.qty > 0);
      return {
        id: sale.id,
        createdAt: sale.createdAt,
        status: sale.status,
        totalCents: sale.totalCents,
        dailyNumber: order?.dailyNumber ?? null,
        tableLabel: order?.tableLabel ?? null,
        paymentMethod: payment?.method ?? null,
        itemCount: saleItems.reduce((sum, item) => sum + item.qty, 0),
        items: saleItems.map((item) => ({
          id: item.id,
          name: item.nameSnapshot,
          qty: item.qty,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: item.lineTotalCents,
          note: item.note,
        })),
      };
    });
  }

  async kitchen(branchId: string) {
    const manager = getTenantManager();
    const tickets = await manager
      .createQueryBuilder(PrintJob, 'j')
      .innerJoin(Order, 'o', 'o.id = j.orderId')
      .where('o.branchId = :branchId', { branchId })
      .andWhere('j.kind = :kind', { kind: 'kitchen' })
      .orderBy('j.createdAt', 'DESC')
      .take(80)
      .getMany();

    const openOrders = await manager.find(Order, {
      where: { branchId, status: 'open' },
      order: { dailyNumber: 'ASC' },
    });
    const openIds = openOrders.map((order) => order.id);
    const openItems = openIds.length
      ? await manager.find(OrderItem, { where: { orderId: In(openIds) } })
      : [];
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const item of openItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return {
      tickets: tickets.map((job) => ({
        id: job.id,
        createdAt: job.createdAt,
        status: job.status,
        orderId: job.orderId,
        payload: job.payload,
      })),
      openOrders: openOrders.map((order) => {
        const items = (itemsByOrder.get(order.id) ?? []).filter((item) => item.qty > 0);
        return {
          id: order.id,
          dailyNumber: order.dailyNumber,
          tableLabel: order.tableLabel,
          totalCents: order.totalCents,
          createdAt: order.createdAt,
          items: items.map((item) => ({
            id: item.id,
            name: item.nameSnapshot,
            qty: item.qty,
            sentQty: item.sentQty,
          })),
        };
      }),
    };
  }

  async markKitchenPrinted(id: string) {
    const manager = getTenantManager();
    const job = await manager.findOne(PrintJob, { where: { id, kind: 'kitchen' } });
    if (!job) throw new NotFoundException('Comanda no encontrada');
    job.status = 'printed';
    return manager.save(job);
  }

  async supplies(year: number, month: number) {
    const manager = getTenantManager();
    const list = await manager.find(Supply, {
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
    const expenses = list.length
      ? await manager.find(SupplyExpense, { where: { year, month, supplyId: In(list.map((s) => s.id)) } })
      : [];
    const bySupply = new Map(expenses.map((row) => [row.supplyId, row.amountCents]));
    return list.map((supply) => ({
      id: supply.id,
      name: supply.name,
      amountCents: bySupply.get(supply.id) ?? 0,
      year,
      month,
    }));
  }

  async upsertSupply(auth: JwtPayload, id: string | undefined, name: string) {
    const manager = getTenantManager();
    const existing = id ? await manager.findOne(Supply, { where: { id, deletedAt: IsNull() } }) : null;
    if (id && !existing) throw new NotFoundException('Suministro no encontrado');
    const row = existing ?? manager.create(Supply, { organizationId: auth.organizationId, isActive: true });
    row.name = name.trim();
    return manager.save(row);
  }

  async deleteSupply(id: string) {
    const manager = getTenantManager();
    const row = await manager.findOne(Supply, { where: { id, deletedAt: IsNull() } });
    if (!row) throw new NotFoundException('Suministro no encontrado');
    row.deletedAt = new Date();
    row.isActive = false;
    await manager.save(row);
    return { ok: true };
  }

  async upsertSupplyExpense(
    auth: JwtPayload,
    supplyId: string,
    data: { year: number; month: number; amountCents: number },
  ) {
    const manager = getTenantManager();
    const supply = await manager.findOne(Supply, { where: { id: supplyId, deletedAt: IsNull() } });
    if (!supply) throw new NotFoundException('Suministro no encontrado');
    let row = await manager.findOne(SupplyExpense, {
      where: { supplyId, year: data.year, month: data.month },
    });
    if (!row) {
      row = manager.create(SupplyExpense, {
        organizationId: auth.organizationId,
        supplyId,
        year: data.year,
        month: data.month,
        amountCents: data.amountCents,
      });
    } else {
      row.amountCents = data.amountCents;
    }
    return manager.save(row);
  }
}
