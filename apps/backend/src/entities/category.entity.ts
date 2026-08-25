import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'categories' })
export class Category extends TenantEntity {
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column()
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
