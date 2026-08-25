import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'products' })
export class Product extends TenantEntity {
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column()
  name: string;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @Column({ type: 'text', nullable: true })
  sku: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_pinned', default: false })
  isPinned: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
