import { Injectable, NotFoundException } from '@nestjs/common';
import { Category, Product, User } from '../entities';
import { getTenantManager } from '../tenant/tenant-context';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CatalogService {
  constructor(private readonly events: EventsGateway) {}

  async setPinned(id: string, isPinned: boolean) {
    const manager = getTenantManager();
    const product = await manager.findOneBy(Product, { id });
    if (!product || product.deletedAt) throw new NotFoundException('Producto no encontrado');
    product.isPinned = isPinned;
    const saved = await manager.save(product);
    this.events.emitCatalogUpdated(product.branchId);
    return saved;
  }

  async snapshot(branchId: string, updatedSince?: string) {
    const manager = getTenantManager();
    const since = updatedSince ? new Date(updatedSince) : new Date(0);
    const [categories, products, cashiers] = await Promise.all([
      manager
        .createQueryBuilder(Category, 'c')
        .where('c.branchId = :branchId', { branchId })
        .andWhere('c.deletedAt IS NULL')
        .andWhere('c.updatedAt > :since', { since })
        .orderBy('c.sortOrder', 'ASC')
        .getMany(),
      manager
        .createQueryBuilder(Product, 'p')
        .where('p.branchId = :branchId', { branchId })
        .andWhere('p.deletedAt IS NULL')
        .andWhere('p.updatedAt > :since', { since })
        .orderBy('p.sortOrder', 'ASC')
        .getMany(),
      manager
        .createQueryBuilder(User, 'u')
        .where('u.role = :role', { role: 'cashier' })
        .andWhere('u.isActive = true')
        .andWhere('u.deletedAt IS NULL')
        .andWhere('(u.branchId = :branchId OR u.branchId IS NULL)', { branchId })
        .getMany(),
    ]);
    return {
      categories,
      products,
      cashiers: cashiers.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        pinHash: u.pinHash,
        branchId: u.branchId,
      })),
      serverTime: new Date().toISOString(),
    };
  }
}
