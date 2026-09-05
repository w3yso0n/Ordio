import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'supply_expenses' })
export class SupplyExpense extends TenantEntity {
  @Column({ name: 'supply_id', type: 'uuid' })
  supplyId: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;
}
