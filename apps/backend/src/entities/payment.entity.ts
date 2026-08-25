import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

export type PaymentMethod = 'cash' | 'transfer';

@Entity({ name: 'payments' })
export class Payment extends TenantEntity {
  @Column({ name: 'sale_id', type: 'uuid' })
  saleId: string;

  @Column({ type: 'text' })
  method: PaymentMethod;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;
}
