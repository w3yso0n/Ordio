import { randomUUID } from 'crypto';
import dataSource from './data-source';

const DEMO_DEVICE = 'Caja demo visualización';

const COMBOS: Array<{ items: Array<{ name: string; qty: number }>; method: 'cash' | 'transfer' }> = [
  { items: [{ name: 'Taco asada', qty: 18 }, { name: 'Agua horchata', qty: 6 }], method: 'cash' },
  { items: [{ name: 'Taco arrachera', qty: 12 }, { name: 'Taco chorizo', qty: 12 }], method: 'cash' },
  { items: [{ name: 'Quesadilla asada', qty: 8 }, { name: 'Agua del día', qty: 8 }], method: 'transfer' },
  { items: [{ name: 'Taco asada', qty: 25 }, { name: 'Agua jamaica', qty: 8 }], method: 'cash' },
  { items: [{ name: 'Pellizcada asada', qty: 10 }, { name: 'Agua limón', qty: 6 }], method: 'transfer' },
  { items: [{ name: 'Papa rellena asada', qty: 6 }, { name: 'Taco chorizo', qty: 10 }], method: 'cash' },
  { items: [{ name: 'Quesadilla arrachera', qty: 10 }], method: 'transfer' },
  { items: [{ name: 'Taco asada', qty: 16 }, { name: 'Taco arrachera', qty: 10 }, { name: 'Agua horchata', qty: 8 }], method: 'cash' },
  { items: [{ name: 'Pellizcada chorizo', qty: 12 }, { name: 'Agua del día', qty: 6 }], method: 'cash' },
  { items: [{ name: 'Taco chorizo', qty: 20 }, { name: 'Agua jamaica', qty: 4 }], method: 'transfer' },
];

const HOURS = [10, 11, 12, 13, 14, 15, 18, 19, 20];

const SUPPLIES: Array<{ name: string; pesos: number }> = [
  { name: 'Carne asada', pesos: 4800 },
  { name: 'Arrachera', pesos: 3200 },
  { name: 'Chorizo', pesos: 1450 },
  { name: 'Tortillas', pesos: 1800 },
  { name: 'Jitomate', pesos: 650 },
  { name: 'Cebolla', pesos: 280 },
  { name: 'Cilantro', pesos: 180 },
  { name: 'Limón', pesos: 420 },
  { name: 'Queso', pesos: 960 },
  { name: 'Aceite', pesos: 390 },
  { name: 'Carbón', pesos: 750 },
  { name: 'Vasos y servilletas', pesos: 320 },
];

type Product = { id: string; name: string; price_cents: number };

function at(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(year, month, day, hour, minute, 0, 0);
}

async function seedDemo() {
  const ds = await dataSource.initialize();
  await ds.query('BEGIN');
  try {
    const orgs = (await ds.query(`SELECT id FROM organizations WHERE slug = 'ordio-demo'`)) as Array<{ id: string }>;
    if (!orgs[0]) throw new Error('No está la organización ordio-demo. Corre el seed primero.');
    const orgId = orgs[0].id;

    const branches = (await ds.query(
      `SELECT id FROM branches WHERE organization_id = $1 ORDER BY created_at ASC`,
      [orgId],
    )) as Array<{ id: string }>;
    if (!branches[0]) throw new Error('No hay sucursal');
    const branchId = branches[0].id;

    const cashiers = (await ds.query(
      `SELECT id FROM users WHERE organization_id = $1 AND role = 'cashier' AND deleted_at IS NULL ORDER BY created_at ASC`,
      [orgId],
    )) as Array<{ id: string }>;
    const owners = (await ds.query(
      `SELECT id FROM users WHERE organization_id = $1 AND role = 'owner' AND deleted_at IS NULL ORDER BY created_at ASC`,
      [orgId],
    )) as Array<{ id: string }>;
    const cashierId = cashiers[0]?.id ?? owners[0]?.id;
    const openerId = owners[0]?.id ?? cashierId;
    if (!cashierId || !openerId) throw new Error('No hay usuario para las ventas demo');

    const products = (await ds.query(
      `SELECT id, name, price_cents FROM products WHERE branch_id = $1 AND deleted_at IS NULL`,
      [branchId],
    )) as Product[];
    const productByName = new Map(products.map((p) => [p.name, p]));

    let devices = (await ds.query(`SELECT id FROM devices WHERE branch_id = $1 AND name = $2`, [
      branchId,
      DEMO_DEVICE,
    ])) as Array<{ id: string }>;
    let deviceId = devices[0]?.id;
    if (!deviceId) {
      deviceId = randomUUID();
      await ds.query(
        `INSERT INTO devices (id, organization_id, branch_id, name, platform, paired_at, last_seen_at)
         VALUES ($1, $2, $3, $4, 'android', now(), now())`,
        [deviceId, orgId, branchId, DEMO_DEVICE],
      );
    }

    const oldSessions = (await ds.query(`SELECT id FROM cash_register_sessions WHERE device_id = $1`, [
      deviceId,
    ])) as Array<{ id: string }>;
    if (oldSessions.length) {
      const ids = oldSessions.map((s) => s.id);
      await ds.query(
        `DELETE FROM payments WHERE sale_id IN (SELECT id FROM sales WHERE session_id = ANY($1::uuid[]))`,
        [ids],
      );
      await ds.query(
        `DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE session_id = ANY($1::uuid[]))`,
        [ids],
      );
      await ds.query(
        `DELETE FROM print_jobs WHERE sale_id IN (SELECT id FROM sales WHERE session_id = ANY($1::uuid[]))`,
        [ids],
      );
      await ds.query(`DELETE FROM sales WHERE session_id = ANY($1::uuid[])`, [ids]);
      await ds.query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE cash_register_session_id = ANY($1::uuid[]))`,
        [ids],
      );
      await ds.query(`DELETE FROM orders WHERE cash_register_session_id = ANY($1::uuid[])`, [ids]);
      await ds.query(`DELETE FROM cash_register_sessions WHERE id = ANY($1::uuid[])`, [ids]);
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const sessionId = randomUUID();
    const openedAt = at(year, month, 1, 8, 0);
    await ds.query(
      `INSERT INTO cash_register_sessions (
         id, organization_id, branch_id, device_id, opened_by_user_id, status,
         opening_amount_cents, opened_at, closed_at, expected_closing_cents, declared_closing_cents, difference_cents
       ) VALUES ($1, $2, $3, $4, $5, 'closed', 150000, $6, $7, 0, 0, 0)`,
      [sessionId, orgId, branchId, deviceId, openerId, openedAt, now],
    );

    let ticketCount = 0;
    let salesCents = 0;
    const dailyNumbers = new Map<string, number>();
    const existingNumbers = (await ds.query(
      `SELECT business_date::text AS business_date, COALESCE(MAX(daily_number), 0)::int AS last
       FROM orders
       WHERE branch_id = $1 AND business_date >= $2
       GROUP BY business_date`,
      [branchId, `${year}-${String(month + 1).padStart(2, '0')}-01`],
    )) as Array<{ business_date: string; last: number }>;
    for (const row of existingNumbers) {
      dailyNumbers.set(row.business_date.slice(0, 10), Number(row.last));
    }

    for (let day = 1; day <= today; day++) {
      const ticketsToday = day === today ? HOURS.length : 8;
      for (let i = 0; i < ticketsToday; i++) {
        const combo = COMBOS[(day + i) % COMBOS.length];
        const hour = HOURS[i % HOURS.length];
        const minute = (i * 7 + day * 3) % 50;
        const when = at(year, month, day, hour, minute);
        const lines = combo.items.map((item) => {
          const product = productByName.get(item.name);
          const unit = product?.price_cents ?? 2200;
          return {
            productId: product?.id ?? null,
            name: item.name,
            qty: item.qty,
            unitPriceCents: unit,
            lineTotalCents: unit * item.qty,
          };
        });
        const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
        const orderId = randomUUID();
        const saleId = randomUUID();
        const businessDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const nextNumber = (dailyNumbers.get(businessDate) ?? 0) + 1;
        dailyNumbers.set(businessDate, nextNumber);

        await ds.query(
          `INSERT INTO orders (
             id, organization_id, branch_id, device_id, cashier_user_id, cash_register_session_id,
             table_label, status, subtotal_cents, total_cents, client_created_at, paid_at,
             daily_number, business_date, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid', $8, $8, $9, $9, $10, $11, $9, $9)`,
          [
            orderId,
            orgId,
            branchId,
            deviceId,
            cashierId,
            sessionId,
            `Mesa ${(i % 6) + 1}`,
            totalCents,
            when,
            nextNumber,
            businessDate,
          ],
        );

        for (const line of lines) {
          await ds.query(
            `INSERT INTO order_items (
               id, organization_id, order_id, product_id, name_snapshot, unit_price_cents,
               qty, sent_qty, line_total_cents, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $9)`,
            [
              randomUUID(),
              orgId,
              orderId,
              line.productId,
              line.name,
              line.unitPriceCents,
              line.qty,
              line.lineTotalCents,
              when,
            ],
          );
        }

        await ds.query(
          `INSERT INTO sales (id, organization_id, order_id, session_id, total_cents, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'paid', $6, $6)`,
          [saleId, orgId, orderId, sessionId, totalCents, when],
        );

        for (const line of lines) {
          await ds.query(
            `INSERT INTO sale_items (
               organization_id, sale_id, product_id, name_snapshot, unit_price_cents, qty, line_total_cents, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
            [
              orgId,
              saleId,
              line.productId,
              line.name,
              line.unitPriceCents,
              line.qty,
              line.lineTotalCents,
              when,
            ],
          );
        }

        await ds.query(
          `INSERT INTO payments (organization_id, sale_id, method, amount_cents, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [orgId, saleId, combo.method, totalCents, when],
        );

        ticketCount += 1;
        salesCents += totalCents;
      }
    }

    for (const [businessDate, lastNumber] of dailyNumbers) {
      await ds.query(
        `INSERT INTO branch_daily_counters (organization_id, branch_id, business_date, last_number)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (branch_id, business_date)
         DO UPDATE SET last_number = GREATEST(branch_daily_counters.last_number, EXCLUDED.last_number)`,
        [orgId, branchId, businessDate, lastNumber],
      );
    }

    await ds.query(
      `DELETE FROM supply_expenses WHERE organization_id = $1`,
      [orgId],
    );
    await ds.query(`DELETE FROM supplies WHERE organization_id = $1`, [orgId]);

    const monthNumber = month + 1;
    let suppliesCents = 0;
    for (const supply of SUPPLIES) {
      const supplyId = randomUUID();
      await ds.query(
        `INSERT INTO supplies (id, organization_id, name, is_active) VALUES ($1, $2, $3, true)`,
        [supplyId, orgId, supply.name],
      );
      const amountCents = Math.round(supply.pesos * 100);
      suppliesCents += amountCents;
      await ds.query(
        `INSERT INTO supply_expenses (organization_id, supply_id, year, month, amount_cents)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, supplyId, year, monthNumber, amountCents],
      );
    }

    await ds.query('COMMIT');
    const mxn = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    console.log(`Demo listo para ${year}-${String(monthNumber).padStart(2, '0')}`);
    console.log(`Ventas: ${ticketCount} tickets · ${mxn(salesCents)}`);
    console.log(`Suministros: ${SUPPLIES.length} · ${mxn(suppliesCents)}`);
    console.log(`Utilidad: ${mxn(salesCents - suppliesCents)}`);
    console.log('Recarga Dashboard y Suministros en el admin.');
  } catch (err) {
    await ds.query('ROLLBACK');
    throw err;
  } finally {
    await ds.destroy();
  }
}

seedDemo().catch((err) => {
  console.error(err);
  process.exit(1);
});
