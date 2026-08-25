import { MigrationInterface, QueryRunner } from 'typeorm';

export class OpenChecks1700000000003 implements MigrationInterface {
  name = 'OpenChecks1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE branch_daily_counters (
        organization_id uuid NOT NULL REFERENCES organizations(id),
        branch_id uuid NOT NULL REFERENCES branches(id),
        business_date date NOT NULL,
        last_number int NOT NULL DEFAULT 0,
        PRIMARY KEY (branch_id, business_date)
      )
    `);
    await queryRunner.query(`ALTER TABLE branch_daily_counters ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY branch_daily_counters_isolation ON branch_daily_counters
      USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
      WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    `);
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON branch_daily_counters TO ordio_app`,
    );

    await queryRunner.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS daily_number int`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_date date`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS orders_daily_number_per_branch_day
      ON orders (branch_id, business_date, daily_number)
      WHERE daily_number IS NOT NULL
    `);

    await queryRunner.query(
      `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sent_qty int NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(`ALTER TABLE print_jobs ALTER COLUMN sale_id DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE print_jobs
      ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL
    `);
    await queryRunner.query(
      `ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'receipt'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS print_jobs_order_id_idx ON print_jobs (order_id)`,
    );
    await queryRunner.query(`
      UPDATE print_jobs pj
      SET order_id = s.order_id
      FROM sales s
      WHERE pj.sale_id = s.id AND pj.order_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS print_jobs_order_id_idx`);
    await queryRunner.query(`ALTER TABLE print_jobs DROP COLUMN IF EXISTS kind`);
    await queryRunner.query(`ALTER TABLE print_jobs DROP COLUMN IF EXISTS order_id`);
    await queryRunner.query(`ALTER TABLE print_jobs ALTER COLUMN sale_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE order_items DROP COLUMN IF EXISTS sent_qty`);
    await queryRunner.query(`DROP INDEX IF EXISTS orders_daily_number_per_branch_day`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS business_date`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS daily_number`);
    await queryRunner.query(`DROP TABLE IF EXISTS branch_daily_counters`);
  }
}
