import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

export type CashMovementType = 'deposit' | 'withdrawal' | 'expense';

@Entity({ name: 'cash_movements' })
export class CashMovement extends TenantEntity {
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ type: 'text' })
  type: CashMovementType;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
