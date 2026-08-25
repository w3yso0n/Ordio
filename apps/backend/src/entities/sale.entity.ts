import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

export type SaleStatus = 'paid' | 'voided';

@Entity({ name: 'sales' })
export class Sale extends TenantEntity {
  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'total_cents', type: 'int' })
  totalCents: number;

  @Column({ type: 'text', default: 'paid' })
  status: SaleStatus;
}
