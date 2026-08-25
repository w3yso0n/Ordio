import { Column, Entity } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'devices' })
export class Device extends TenantEntity {
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column()
  name: string;

  @Column()
  platform: string;

  @Column({ name: 'paired_at', type: 'timestamptz' })
  pairedAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;
}
