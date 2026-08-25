import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

export type OrderStatus = 'open' | 'paid' | 'voided';

@Entity({ name: 'orders' })
export class Order extends TenantEntity {
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId: string;

  @Column({ name: 'cashier_user_id', type: 'uuid' })
  cashierUserId: string;

  @Column({ name: 'cash_register_session_id', type: 'uuid', nullable: true })
  cashRegisterSessionId: string | null;

  @Column({ name: 'table_label', type: 'text', nullable: true })
  tableLabel: string | null;

  @Column({ name: 'daily_number', type: 'int', nullable: true })
  dailyNumber: number | null;

  @Column({ name: 'business_date', type: 'date', nullable: true })
  businessDate: string | null;

  @Column({ type: 'text', default: 'open' })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'subtotal_cents', type: 'int', default: 0 })
  subtotalCents: number;

  @Column({ name: 'total_cents', type: 'int', default: 0 })
  totalCents: number;

  @Column({ name: 'client_created_at', type: 'timestamptz' })
  clientCreatedAt: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
