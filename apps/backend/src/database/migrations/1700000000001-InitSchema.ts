import { MigrationInterface, QueryRunner } from 'typeorm';

const TENANT_TABLES = [
  'branches',
  'users',
  'devices',
  'idempotency_keys',
  'categories',
  'products',
  'orders',
  'order_items',
  'sales',
  'sale_items',
  'payments',
  'cash_register_sessions',
  'cash_movements',
  'print_jobs',
];

export class InitSchema1700000000001 implements MigrationInterface {
  name = 'InitSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ordio_app') THEN
          CREATE ROLE ordio_app LOGIN PASSWORD '${process.env.ORDIO_APP_PASSWORD ?? 'OrdioApp_k7mN2pQ9xL4w'}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`GRANT CONNECT ON DATABASE ordio TO ordio_app`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO ordio_app`);

    await queryRunner.query(`
      CREATE TABLE organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        timezone text NOT NULL DEFAULT 'America/Mexico_City',
        currency text NOT NULL DEFAULT 'MXN',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE branches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        name text NOT NULL,
        activation_code text NOT NULL UNIQUE,
        address text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('owner', 'admin', 'cashier')
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        branch_id uuid REFERENCES branches(id),
        role user_role NOT NULL,
        display_name text NOT NULL,
        email text,
        password_hash text,
        pin_hash text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        branch_id uuid NOT NULL REFERENCES branches(id),
        name text NOT NULL,
        platform text NOT NULL,
        paired_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE idempotency_keys (
        organization_id uuid NOT NULL REFERENCES organizations(id),
        key text NOT NULL,
        method text NOT NULL,
        path text NOT NULL,
        response_status int NOT NULL,
        response_body jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (organization_id, key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        branch_id uuid NOT NULL REFERENCES branches(id),
        name text NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        branch_id uuid NOT NULL REFERENCES branches(id),
        category_id uuid NOT NULL REFERENCES categories(id),
        name text NOT NULL,
        price_cents int NOT NULL,
        sku text,
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )
    `);

    await queryRunner.query(`CREATE TYPE order_status AS ENUM ('open', 'paid', 'voided')`);
    await queryRunner.query(`CREATE TYPE sale_status AS ENUM ('paid', 'voided')`);
    await queryRunner.query(`CREATE TYPE payment_method AS ENUM ('cash', 'transfer')`);
    await queryRunner.query(`CREATE TYPE cash_session_status AS ENUM ('open', 'closed')`);
    await queryRunner.query(`CREATE TYPE cash_movement_type AS ENUM ('deposit', 'withdrawal', 'expense')`);
    await queryRunner.query(`CREATE TYPE print_job_status AS ENUM ('pending', 'printed', 'failed')`);

    await queryRunner.query(`
      CREATE TABLE cash_register_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        branch_id uuid NOT NULL REFERENCES branches(id),
        device_id uuid NOT NULL REFERENCES devices(id),
        opened_by_user_id uuid NOT NULL REFERENCES users(id),
        closed_by_user_id uuid REFERENCES users(id),
        status cash_session_status NOT NULL DEFAULT 'open',
        opening_amount_cents int NOT NULL,
        expected_closing_cents int,
        declared_closing_cents int,
        difference_cents int,
        opened_at timestamptz NOT NULL DEFAULT now(),
        closed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX cash_sessions_one_open_per_device
      ON cash_register_sessions (branch_id, device_id)
      WHERE status = 'open'
    `);

    await queryRunner.query(`
      CREATE TABLE cash_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        session_id uuid NOT NULL REFERENCES cash_register_sessions(id),
        type cash_movement_type NOT NULL,
        amount_cents int NOT NULL,
        note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE orders (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL REFERENCES organizations(id),
        branch_id uuid NOT NULL REFERENCES branches(id),
        device_id uuid NOT NULL REFERENCES devices(id),
        cashier_user_id uuid NOT NULL REFERENCES users(id),
        cash_register_session_id uuid REFERENCES cash_register_sessions(id),
        table_label text,
        status order_status NOT NULL DEFAULT 'open',
        note text,
        subtotal_cents int NOT NULL DEFAULT 0,
        total_cents int NOT NULL DEFAULT 0,
        client_created_at timestamptz NOT NULL,
        paid_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE order_items (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL REFERENCES organizations(id),
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id uuid REFERENCES products(id),
        name_snapshot text NOT NULL,
        unit_price_cents int NOT NULL,
        qty int NOT NULL,
        note text,
        line_total_cents int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sales (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
        session_id uuid NOT NULL REFERENCES cash_register_sessions(id),
        total_cents int NOT NULL,
        status sale_status NOT NULL DEFAULT 'paid',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sale_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id uuid,
        name_snapshot text NOT NULL,
        unit_price_cents int NOT NULL,
        qty int NOT NULL,
        note text,
        line_total_cents int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        method payment_method NOT NULL,
        amount_cents int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE print_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        sale_id uuid NOT NULL REFERENCES sales(id),
        status print_job_status NOT NULL DEFAULT 'pending',
        payload jsonb NOT NULL,
        attempts int NOT NULL DEFAULT 0,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`ALTER TABLE organizations ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY organizations_isolation ON organizations
      USING (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
      WITH CHECK (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    `);

    for (const table of TENANT_TABLES) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY ${table}_isolation ON ${table}
        USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
      `);
    }

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION lookup_admin_by_email(p_email text)
      RETURNS TABLE (
        user_id uuid,
        organization_id uuid,
        password_hash text,
        role user_role,
        is_active boolean
      )
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT u.id, u.organization_id, u.password_hash, u.role, u.is_active
        FROM users u
        WHERE lower(u.email) = lower(p_email)
          AND u.deleted_at IS NULL
          AND u.role IN ('owner', 'admin')
        LIMIT 1
      $$
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION lookup_branch_by_activation_code(p_code text)
      RETURNS TABLE (
        branch_id uuid,
        organization_id uuid
      )
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT b.id, b.organization_id
        FROM branches b
        WHERE b.activation_code = p_code
        LIMIT 1
      $$
    `);

    await queryRunner.query(`REVOKE ALL ON FUNCTION lookup_admin_by_email(text) FROM PUBLIC`);
    await queryRunner.query(`REVOKE ALL ON FUNCTION lookup_branch_by_activation_code(text) FROM PUBLIC`);
    await queryRunner.query(`GRANT EXECUTE ON FUNCTION lookup_admin_by_email(text) TO ordio_app`);
    await queryRunner.query(`GRANT EXECUTE ON FUNCTION lookup_branch_by_activation_code(text) TO ordio_app`);

    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ordio_app`);
    await queryRunner.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ordio_app`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS lookup_branch_by_activation_code(text)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS lookup_admin_by_email(text)`);
    await queryRunner.query(`DROP TABLE IF EXISTS print_jobs`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments`);
    await queryRunner.query(`DROP TABLE IF EXISTS sale_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS cash_movements`);
    await queryRunner.query(`DROP TABLE IF EXISTS cash_register_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS products`);
    await queryRunner.query(`DROP TABLE IF EXISTS categories`);
    await queryRunner.query(`DROP TABLE IF EXISTS idempotency_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS devices`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS branches`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
    await queryRunner.query(`DROP TYPE IF EXISTS print_job_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS cash_movement_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS cash_session_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_method`);
    await queryRunner.query(`DROP TYPE IF EXISTS sale_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
  }
}
