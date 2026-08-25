import { MigrationInterface, QueryRunner } from 'typeorm';

export class BranchCashDay1700000000004 implements MigrationInterface {
  name = 'BranchCashDay1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE cash_register_sessions SET status = 'closed', closed_at = COALESCE(closed_at, now())
      WHERE status = 'open'
        AND id NOT IN (
          SELECT kept.id FROM (
            SELECT DISTINCT ON (branch_id) id
            FROM cash_register_sessions
            WHERE status = 'open'
            ORDER BY branch_id, opened_at DESC
          ) kept
        )
    `);
    await queryRunner.query(`ALTER TABLE cash_register_sessions ALTER COLUMN device_id DROP NOT NULL`);
    await queryRunner.query(`DROP INDEX IF EXISTS cash_sessions_one_open_per_device`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX cash_sessions_one_open_per_branch
      ON cash_register_sessions (branch_id)
      WHERE status = 'open'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS cash_sessions_one_open_per_branch`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX cash_sessions_one_open_per_device
      ON cash_register_sessions (branch_id, device_id)
      WHERE status = 'open'
    `);
    await queryRunner.query(`ALTER TABLE cash_register_sessions ALTER COLUMN device_id SET NOT NULL`);
  }
}
