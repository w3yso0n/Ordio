import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductPinned1700000000002 implements MigrationInterface {
  name = 'ProductPinned1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS is_pinned`);
  }
}
