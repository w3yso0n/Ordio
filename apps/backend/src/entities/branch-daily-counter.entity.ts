import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'branch_daily_counters' })
export class BranchDailyCounter {
  @PrimaryColumn({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @PrimaryColumn({ name: 'business_date', type: 'date' })
  businessDate: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'last_number', type: 'int', default: 0 })
  lastNumber: number;
}
