import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentTransfer1700000000005 implements MigrationInterface {
  name = 'PaymentTransfer1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payments ALTER COLUMN method TYPE text USING method::text`);
    await queryRunner.query(`UPDATE payments SET method = 'transfer' WHERE method = 'card'`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_method`);
    await queryRunner.query(`CREATE TYPE payment_method AS ENUM ('cash', 'transfer')`);
    await queryRunner.query(
      `ALTER TABLE payments ALTER COLUMN method TYPE payment_method USING method::payment_method`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payments ALTER COLUMN method TYPE text USING method::text`);
    await queryRunner.query(`UPDATE payments SET method = 'card' WHERE method = 'transfer'`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_method`);
    await queryRunner.query(`CREATE TYPE payment_method AS ENUM ('cash', 'card')`);
    await queryRunner.query(
      `ALTER TABLE payments ALTER COLUMN method TYPE payment_method USING method::payment_method`,
    );
  }
}
