import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { In, IsNull } from 'typeorm';
import { Category, Product, Sale, SaleItem, Payment, User, Branch, Device, CashRegisterSession, Order, OrderItem, PrintJob } from '../entities';
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


  async dashboard() {
    const manager = getTenantManager();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sales = await manager
      .createQueryBuilder(Sale, 's')
      .where('s.createdAt >= :start', { start })
      .andWhere('s.status = :status', { status: 'paid' })
      .getMany();

    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, totalCents: 0, count: 0 }));
    let cashCents = 0;
    let transferCents = 0;
    for (const sale of sales) {
      const hour = new Date(sale.createdAt).getHours();
      byHour[hour].totalCents += sale.totalCents;
      byHour[hour].count += 1;
    }
    const payments = await manager.query(
      `SELECT p.method, COALESCE(SUM(p.amount_cents),0)::int AS total
       FROM payments p
       JOIN sales s ON s.id = p.sale_id
       WHERE s.created_at >= $1 AND s.status = 'paid'
       GROUP BY p.method`,
      [start],
    );
    for (const row of payments) {
      if (row.method === 'cash') cashCents = Number(row.total);
      if (row.method === 'transfer' || row.method === 'card') transferCents = Number(row.total);
    }
    return {
      date: start.toISOString(),
      salesCount: sales.length,
      totalCents: sales.reduce((sum, s) => sum + s.totalCents, 0),
      cashCents,
      transferCents,
      byHour,
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

  async users() {
    const rows = await getTenantManager().find(User, { where: { deletedAt: IsNull() } });
    return rows.map(({ passwordHash: _p, pinHash: _pin, ...rest }) => ({
      ...rest,
      hasPin: Boolean(_pin),
    }));
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
    user.displayName = data.displayName;
    user.role = data.role;
    user.email = data.email ?? null;
    user.branchId = data.branchId ?? null;
    user.isActive = data.isActive ?? true;
    if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.pin) user.pinHash = await bcrypt.hash(data.pin, 10);
    return manager.save(user);
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
}
