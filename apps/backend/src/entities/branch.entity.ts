import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'branches' })
export class Branch extends TenantEntity {
  @Column()
  name: string;

  @Column({ name: 'activation_code', unique: true })
  activationCode: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;
}
