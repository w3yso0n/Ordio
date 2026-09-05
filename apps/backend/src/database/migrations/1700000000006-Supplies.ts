import { MigrationInterface, QueryRunner } from 'typeorm';

export class Supplies1700000000006 implements MigrationInterface {
  name = 'Supplies1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE supplies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        name text NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE TABLE supply_expenses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        supply_id uuid NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
        year int NOT NULL,
        month int NOT NULL,
        amount_cents int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (supply_id, year, month)
      )
    `);

    for (const table of ['supplies', 'supply_expenses']) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY ${table}_isolation ON ${table}
        USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
      `);
      await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ordio_app`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS supply_expenses`);
    await queryRunner.query(`DROP TABLE IF EXISTS supplies`);
  }
}
