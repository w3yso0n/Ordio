import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dataSource from './data-source';

async function seed(ds: DataSource) {
  const orgA = randomUUID();
  const orgB = randomUUID();
  const branchA = randomUUID();
  const branchB = randomUUID();
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const cashier1 = randomUUID();
  const cashier2 = randomUUID();
  const catA = randomUUID();
  const passwordHash = await bcrypt.hash('ordio-admin', 10);
  const pinHash = await bcrypt.hash('1234', 10);

  await ds.query(`
    INSERT INTO organizations (id, name, slug, timezone, currency)
    VALUES
      ($1, 'Ordio Demo', 'ordio-demo', 'America/Mexico_City', 'MXN'),
      ($2, 'Tenant B', 'tenant-b', 'America/Mexico_City', 'MXN')
    ON CONFLICT (slug) DO NOTHING
  `, [orgA, orgB]);

  const orgs = await ds.query(`SELECT id, slug FROM organizations WHERE slug IN ('ordio-demo','tenant-b')`);
  const demo = orgs.find((o: { slug: string }) => o.slug === 'ordio-demo');
  const other = orgs.find((o: { slug: string }) => o.slug === 'tenant-b');

  await ds.query(`
    INSERT INTO branches (id, organization_id, name, activation_code)
    VALUES ($1, $2, 'Sucursal Centro', 'ORDIO-DEMO'),
           ($3, $4, 'Sucursal B', 'ORDIO-B')
    ON CONFLICT (activation_code) DO NOTHING
  `, [branchA, demo.id, branchB, other.id]);

  const branches = await ds.query(`SELECT id, activation_code, organization_id FROM branches WHERE activation_code IN ('ORDIO-DEMO','ORDIO-B')`);
  const bDemo = branches.find((b: { activation_code: string }) => b.activation_code === 'ORDIO-DEMO');
  const bB = branches.find((b: { activation_code: string }) => b.activation_code === 'ORDIO-B');

  await ds.query(
    `INSERT INTO users (id, organization_id, branch_id, role, display_name, email, password_hash, pin_hash, is_active)
     VALUES
      ($1, $2, NULL, 'owner', 'Owner Demo', 'owner@ordio.local', $3, NULL, true),
      ($4, $5, $6, 'cashier', 'Caja 1', NULL, NULL, $7, true),
      ($8, $5, $6, 'cashier', 'Caja 2', NULL, NULL, $7, true),
      ($9, $10, NULL, 'owner', 'Owner B', 'owner-b@ordio.local', $3, NULL, true)
     ON CONFLICT DO NOTHING`,
    [ownerA, bDemo.organization_id, passwordHash, cashier1, bDemo.organization_id, bDemo.id, pinHash, cashier2, ownerB, bB.organization_id],
  );

  await ds.query(
    `INSERT INTO categories (id, organization_id, branch_id, name, sort_order, is_active)
     VALUES ($1, $2, $3, 'Bebidas', 1, true)
     ON CONFLICT DO NOTHING`,
    [catA, bDemo.organization_id, bDemo.id],
  );
  const categories = await ds.query(`SELECT id FROM categories WHERE branch_id = $1 LIMIT 1`, [bDemo.id]);
  const categoryId = categories[0].id;
  const products = [
    ['Café americano', 3500],
    ['Café latte', 4500],
    ['Té', 3000],
    ['Agua', 1500],
    ['Jugo naranja', 4000],
    ['Croissant', 3200],
    ['Sandwich', 6500],
    ['Galleta', 1800],
  ];
  for (const [name, price] of products) {
    await ds.query(
      `INSERT INTO products (organization_id, branch_id, category_id, name, price_cents, is_active, sort_order)
       SELECT $1, $2, $3, $4, $5, true, 0
       WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.branch_id = $2 AND p.name = $4)`,
      [bDemo.organization_id, bDemo.id, categoryId, name, price],
    );
  }

  console.log('Seed OK');
  console.log('Admin: owner@ordio.local / ordio-admin');
  console.log('Pair code: ORDIO-DEMO  PIN cashiers: 1234');
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
