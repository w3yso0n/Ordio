import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

export type CashSessionStatus = 'open' | 'closed';

@Entity({ name: 'cash_register_sessions' })
export class CashRegisterSession extends TenantEntity {
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string | null;

  @Column({ name: 'opened_by_user_id', type: 'uuid' })
  openedByUserId: string;

  @Column({ name: 'closed_by_user_id', type: 'uuid', nullable: true })
  closedByUserId: string | null;

  @Column({ type: 'text', default: 'open' })
  status: CashSessionStatus;

  @Column({ name: 'opening_amount_cents', type: 'int' })
  openingAmountCents: number;

  @Column({ name: 'expected_closing_cents', type: 'int', nullable: true })
  expectedClosingCents: number | null;

  @Column({ name: 'declared_closing_cents', type: 'int', nullable: true })
  declaredClosingCents: number | null;

  @Column({ name: 'difference_cents', type: 'int', nullable: true })
  differenceCents: number | null;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;
}
