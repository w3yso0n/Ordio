import { kvGetJson, kvSetJson } from './kv';

export type CatalogProduct = {
  id: string;
  name: string;
  priceCents: number;
  categoryId: string;
  isPinned: boolean;
};

export type CatalogCategory = { id: string; name: string };

export type CachedCatalog = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
};

const KEY = 'catalog';

export function loadCachedCatalog(): CachedCatalog | null {
  return kvGetJson<CachedCatalog>(KEY);
}

export function saveCachedCatalog(catalog: CachedCatalog) {
  kvSetJson(KEY, catalog);
}

export function parseCatalogSnapshot(data: {
  products?: Array<{
    id: string;
    name: string;
    priceCents: number;
    categoryId: string;
    isPinned?: boolean;
    isActive?: boolean;
  }>;
  categories?: Array<{ id: string; name: string; isActive?: boolean }>;
}): CachedCatalog {
  return {
    products: (data.products ?? [])
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        id: p.id,
        name: p.name,
        priceCents: p.priceCents,
        categoryId: p.categoryId,
        isPinned: Boolean(p.isPinned),
      })),
    categories: (data.categories ?? [])
      .filter((c) => c.isActive !== false)
      .map((c) => ({ id: c.id, name: c.name })),
  };
}

export function patchCachedPin(productId: string, isPinned: boolean) {
  const current = loadCachedCatalog();
  if (!current) return;
  saveCachedCatalog({
    ...current,
    products: current.products.map((item) => (item.id === productId ? { ...item, isPinned } : item)),
  });
}

export type CachedCashier = { id: string; displayName: string; pinHash?: string | null };

const CASHIERS_KEY = 'cashiers';

export function loadCachedCashiers(): CachedCashier[] {
  return kvGetJson<CachedCashier[]>(CASHIERS_KEY) ?? [];
}

export function saveCachedCashiers(cashiers: Array<{ id: string; displayName: string; pinHash?: string | null }>) {
  kvSetJson(
    CASHIERS_KEY,
    cashiers.map((c) => ({ id: c.id, displayName: c.displayName, pinHash: c.pinHash ?? null })),
  );
}
