import dataSource from './data-source';
import { INDIO_ACTIVATION_CODE, replaceBranchCatalog } from './indio-catalog';

async function wipeOperationalData(ds: typeof dataSource, orgId: string) {
  const org = [orgId];
  await ds.query(`DELETE FROM print_jobs WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM payments WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM sale_items WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM sales WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM order_items WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM orders WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM cash_movements WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM cash_register_sessions WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM idempotency_keys WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM branch_daily_counters WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM supply_expenses WHERE organization_id = $1`, org);
  await ds.query(`DELETE FROM supplies WHERE organization_id = $1`, org);
}

async function main() {
  const ds = await dataSource.initialize();
  await ds.query('BEGIN');
  try {
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
    const branch =
      branches.find((b) => b.activation_code === 'ORDIO-DEMO' || b.activation_code === INDIO_ACTIVATION_CODE) ??
      branches[0];
    if (!branch) throw new Error('No hay sucursal para Indio');

    await ds.query(
      `UPDATE branches SET name = 'Puesto de tacos', activation_code = $1, updated_at = now() WHERE id = $2`,
      [INDIO_ACTIVATION_CODE, branch.id],
    );

    await wipeOperationalData(ds, orgId);
    await replaceBranchCatalog(ds, orgId, branch.id);

    await ds.query('COMMIT');
    console.log(
      'Listo. Indio vacío: sin ventas, cuentas, caja ni suministros. Catálogo INDIO restaurado. Usuarios y pairing se conservan.',
    );
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
