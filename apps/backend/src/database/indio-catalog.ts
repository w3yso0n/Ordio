import { randomUUID } from 'crypto';

export const INDIO_ACTIVATION_CODE = 'INDIO';

export const INDIO_CATEGORIES = [
  'Tacos',
  'Pellizcadas',
  'Papas rellenas',
  'Quesadillas',
  'Aguas',
] as const;

export type IndioCategory = (typeof INDIO_CATEGORIES)[number];

export type IndioProduct = {
  category: IndioCategory;
  name: string;
  priceCents: number;
  pinned: boolean;
  sort: number;
};

export const INDIO_PRODUCTS: IndioProduct[] = [
  { category: 'Tacos', name: 'Taco asada', priceCents: 2200, pinned: true, sort: 1 },
  { category: 'Tacos', name: 'Taco arrachera', priceCents: 2800, pinned: true, sort: 2 },
  { category: 'Tacos', name: 'Taco chorizo', priceCents: 2200, pinned: true, sort: 3 },
  { category: 'Pellizcadas', name: 'Pellizcada asada', priceCents: 2800, pinned: true, sort: 1 },
  { category: 'Pellizcadas', name: 'Pellizcada arrachera', priceCents: 3500, pinned: false, sort: 2 },
  { category: 'Pellizcadas', name: 'Pellizcada chorizo', priceCents: 2800, pinned: false, sort: 3 },
  { category: 'Papas rellenas', name: 'Papa rellena asada', priceCents: 4000, pinned: false, sort: 1 },
  { category: 'Papas rellenas', name: 'Papa rellena arrachera', priceCents: 4800, pinned: false, sort: 2 },
  { category: 'Papas rellenas', name: 'Papa rellena chorizo', priceCents: 4000, pinned: false, sort: 3 },
  { category: 'Quesadillas', name: 'Quesadilla asada', priceCents: 3500, pinned: true, sort: 1 },
  { category: 'Quesadillas', name: 'Quesadilla arrachera', priceCents: 4200, pinned: false, sort: 2 },
  { category: 'Quesadillas', name: 'Quesadilla chorizo', priceCents: 3500, pinned: false, sort: 3 },
  { category: 'Aguas', name: 'Agua del día', priceCents: 2000, pinned: true, sort: 1 },
  { category: 'Aguas', name: 'Agua jamaica', priceCents: 2000, pinned: false, sort: 2 },
  { category: 'Aguas', name: 'Agua horchata', priceCents: 2000, pinned: false, sort: 3 },
  { category: 'Aguas', name: 'Agua limón', priceCents: 2000, pinned: false, sort: 4 },
];

type Queryable = { query: (sql: string, params?: unknown[]) => Promise<unknown> };

export async function replaceBranchCatalog(
  ds: Queryable,
  organizationId: string,
  branchId: string,
) {
  await ds.query(`DELETE FROM products WHERE branch_id = $1`, [branchId]);
  await ds.query(`DELETE FROM categories WHERE branch_id = $1`, [branchId]);

  const categoryIds = new Map<IndioCategory, string>();
  for (let i = 0; i < INDIO_CATEGORIES.length; i++) {
    const name = INDIO_CATEGORIES[i];
    const id = randomUUID();
    await ds.query(
      `INSERT INTO categories (id, organization_id, branch_id, name, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [id, organizationId, branchId, name, i + 1],
    );
    categoryIds.set(name, id);
  }

  for (const product of INDIO_PRODUCTS) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) continue;
    await ds.query(
      `INSERT INTO products (
         organization_id, branch_id, category_id, name, price_cents, is_active, sort_order, is_pinned
       ) VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
      [
        organizationId,
        branchId,
        categoryId,
        product.name,
        product.priceCents,
        product.sort,
        product.pinned,
      ],
    );
  }
}
