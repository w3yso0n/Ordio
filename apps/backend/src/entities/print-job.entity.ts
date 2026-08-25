import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

export type PrintJobStatus = 'pending' | 'printed' | 'failed';
export type PrintJobKind = 'receipt' | 'kitchen';

@Entity({ name: 'print_jobs' })
export class PrintJob extends TenantEntity {
  @Column({ name: 'sale_id', type: 'uuid', nullable: true })
  saleId: string | null;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'text', default: 'receipt' })
  kind: PrintJobKind;

  @Column({ type: 'text', default: 'pending' })
  status: PrintJobStatus;

  @Column({ type: 'jsonb' })
  payload: unknown;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;
}
