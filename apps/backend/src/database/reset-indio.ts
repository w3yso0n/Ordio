import dataSource from './data-source';
import { INDIO_ACTIVATION_CODE, replaceBranchCatalog } from './indio-catalog';

async function wipeTransactions(ds: typeof dataSource) {
  await ds.query(`DELETE FROM print_jobs`);
  await ds.query(`DELETE FROM payments`);
  await ds.query(`DELETE FROM sale_items`);
  await ds.query(`DELETE FROM sales`);
  await ds.query(`DELETE FROM order_items`);
  await ds.query(`DELETE FROM orders`);
  await ds.query(`DELETE FROM cash_movements`);
  await ds.query(`DELETE FROM cash_register_sessions`);
  await ds.query(`DELETE FROM idempotency_keys`);
  await ds.query(`DELETE FROM devices`);
  await ds.query(`DELETE FROM branch_daily_counters`);
}

async function setupIndio(ds: typeof dataSource) {
  const orgs = (await ds.query(`SELECT id FROM organizations WHERE slug = 'ordio-demo'`)) as Array<{
    id: string;
  }>;
  if (!orgs[0]) throw new Error('No está la organización ordio-demo');
  const orgId = orgs[0].id;

  await ds.query(`UPDATE organizations SET name = 'Indio', updated_at = now() WHERE id = $1`, [orgId]);

  const branches = (await ds.query(
    `SELECT id, activation_code FROM branches WHERE organization_id = $1 ORDER BY created_at ASC`,
    [orgId],
  )) as Array<{ id: string; activation_code: string }>;
  const branch = branches.find((b) => b.activation_code === 'ORDIO-DEMO' || b.activation_code === INDIO_ACTIVATION_CODE) ?? branches[0];
  if (!branch) throw new Error('No hay sucursal para Indio');

  await ds.query(
    `UPDATE branches SET name = 'Puesto de tacos', activation_code = $1, updated_at = now() WHERE id = $2`,
    [INDIO_ACTIVATION_CODE, branch.id],
  );

  const cashiers = (await ds.query(
    `SELECT id FROM users
     WHERE organization_id = $1 AND role = 'cashier' AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [orgId],
  )) as Array<{ id: string }>;
  const keep = cashiers[0];
  if (!keep) throw new Error('No hay cajero');

  await ds.query(
    `UPDATE users SET display_name = 'Caja', is_active = true, branch_id = $2, updated_at = now() WHERE id = $1`,
    [keep.id, branch.id],
  );
  if (cashiers.length > 1) {
    await ds.query(
      `UPDATE users SET is_active = false, deleted_at = now(), updated_at = now()
       WHERE organization_id = $1 AND role = 'cashier' AND id <> $2`,
      [orgId, keep.id],
    );
  }

  await replaceBranchCatalog(ds, orgId, branch.id);
}

async function main() {
  const ds = await dataSource.initialize();
  await ds.query('BEGIN');
  try {
    await wipeTransactions(ds);
    await setupIndio(ds);
    await ds.query('COMMIT');
    console.log(`Listo. Código de caja: ${INDIO_ACTIVATION_CODE}. PIN: 1234. Una caja. Datos de venta borrados.`);
  } catch (err) {
    await ds.query('ROLLBACK');
    throw err;
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
