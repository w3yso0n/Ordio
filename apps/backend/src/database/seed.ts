import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dataSource from './data-source';
import { INDIO_ACTIVATION_CODE, replaceBranchCatalog } from './indio-catalog';

async function seed(ds: DataSource) {
  const orgA = randomUUID();
  const orgB = randomUUID();
  const branchA = randomUUID();
  const branchB = randomUUID();
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const cashier = randomUUID();
  const adminIndio = randomUUID();
  const passwordHash = await bcrypt.hash('ordio-admin', 10);
  const adminPasswordHash = await bcrypt.hash('12345678', 10);
  const pinHash = await bcrypt.hash('1234', 10);

  await ds.query(
    `
    INSERT INTO organizations (id, name, slug, timezone, currency)
    VALUES
      ($1, 'Indio', 'ordio-demo', 'America/Mexico_City', 'MXN'),
      ($2, 'Tenant B', 'tenant-b', 'America/Mexico_City', 'MXN')
    ON CONFLICT (slug) DO NOTHING
  `,
    [orgA, orgB],
  );

  const orgs = await ds.query(`SELECT id, slug FROM organizations WHERE slug IN ('ordio-demo','tenant-b')`);
  const demo = orgs.find((o: { slug: string }) => o.slug === 'ordio-demo');
  const other = orgs.find((o: { slug: string }) => o.slug === 'tenant-b');

  await ds.query(
    `
    INSERT INTO branches (id, organization_id, name, activation_code)
    VALUES ($1, $2, 'Puesto de tacos', $5),
           ($3, $4, 'Sucursal B', 'ORDIO-B')
    ON CONFLICT (activation_code) DO NOTHING
  `,
    [branchA, demo.id, branchB, other.id, INDIO_ACTIVATION_CODE],
  );

  const branches = await ds.query(
    `SELECT id, activation_code, organization_id FROM branches WHERE activation_code IN ($1,'ORDIO-B')`,
    [INDIO_ACTIVATION_CODE],
  );
  const bDemo = branches.find((b: { activation_code: string }) => b.activation_code === INDIO_ACTIVATION_CODE);
  const bB = branches.find((b: { activation_code: string }) => b.activation_code === 'ORDIO-B');

  await ds.query(
    `INSERT INTO users (id, organization_id, branch_id, role, display_name, email, password_hash, pin_hash, is_active)
     VALUES
      ($1, $2, NULL, 'owner', 'Owner Indio', 'owner@ordio.local', $3, NULL, true),
      ($4, $5, $6, 'cashier', 'Caja', NULL, NULL, $7, true),
      ($8, $9, NULL, 'owner', 'Owner B', 'owner-b@ordio.local', $3, NULL, true)
     ON CONFLICT DO NOTHING`,
    [ownerA, bDemo.organization_id, passwordHash, cashier, bDemo.organization_id, bDemo.id, pinHash, ownerB, bB.organization_id],
  );

  await ds.query(
    `INSERT INTO users (id, organization_id, branch_id, role, display_name, email, password_hash, pin_hash, is_active)
     SELECT $1, $2, NULL, 'admin', 'Admin Indio', 'admin@indio.com', $3, NULL, true
     WHERE NOT EXISTS (
       SELECT 1 FROM users WHERE lower(email) = lower('admin@indio.com') AND deleted_at IS NULL
     )`,
    [adminIndio, bDemo.organization_id, adminPasswordHash],
  );

  await replaceBranchCatalog(ds, bDemo.organization_id, bDemo.id);

  console.log('Seed OK');
  console.log('Owner: owner@ordio.local / ordio-admin');
  console.log('Admin: admin@indio.com / 12345678');
  console.log(`Pair code: ${INDIO_ACTIVATION_CODE}  PIN caja: 1234`);
}

async function main() {
  const ds = await dataSource.initialize();
  await seed(ds);
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
