'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { showBlocked } from '@/lib/blocked';
import { Alert, Button, EmptyState, Field, Input, PageHeader, Panel, Select, TableScroll } from '@/components/ui';

type Branch = { id: string; name: string };
type Category = { id: string; name: string };
type Product = { id: string; name: string; priceCents: number; categoryId: string; isPinned?: boolean };

export default function ProductsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('35');
  const [categoryId, setCategoryId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load(id: string) {
    if (!id) {
      setProducts([]);
      setCategories([]);
      setCategoryId('');
      return;
    }
    const [p, c] = await Promise.all([
      api(`/admin/products?branchId=${id}`),
      api(`/admin/categories?branchId=${id}`),
    ]);
    setProducts(p);
    setCategories(c);
    setCategoryId((current) => (c.some((cat: Category) => cat.id === current) ? current : c[0]?.id ?? ''));
  }

  useEffect(() => {
    (async () => {
      const [me, list] = await Promise.all([api('/auth/me'), api('/admin/branches')]);
      setBranches(list);
      const preferred = me.payload?.branchId ?? me.user?.branchId ?? list[0]?.id ?? '';
      setBranchId(preferred);
      if (preferred) await load(preferred);
    })().catch(() => undefined);
  }, []);

  async function onBranchChange(id: string) {
    setBranchId(id);
    setEditingProductId(null);
    setEditingCategoryId(null);
    setCategoryName('');
    await load(id);
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!branchId) {
      showBlocked('No se puede agregar un producto: primero crea una sucursal en Sucursales.', setError);
      return;
    }
    if (!categoryId) {
      showBlocked(
        'No se puede agregar un producto: esta sucursal no tiene categorías. Crea una categoría primero.',
        setError,
      );
      return;
    }
    try {
      const body = { categoryId, name, priceCents: Math.round(Number(price) * 100), isPinned };
      if (editingProductId) {
        await api(`/admin/products/${editingProductId}?branchId=${branchId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await api(`/admin/products?branchId=${branchId}`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setName('');
      setPrice('35');
      setEditingProductId(null);
      setIsPinned(false);
      await load(branchId);
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!branchId) {
      showBlocked('No se puede agregar una categoría: primero crea una sucursal en Sucursales.', setError);
      return;
    }
    try {
      const body = { name: categoryName };
      if (editingCategoryId) {
        await api(`/admin/categories/${editingCategoryId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api(`/admin/categories?branchId=${branchId}`, { method: 'POST', body: JSON.stringify(body) });
      }
      setCategoryName('');
      setEditingCategoryId(null);
      await load(branchId);
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  async function removeCategory(c: Category) {
    const count = products.filter((p) => p.categoryId === c.id).length;
    if (count) {
      showBlocked(
        `No se puede borrar «${c.name}» porque tiene ${count} ${count === 1 ? 'producto' : 'productos'}. Bórralos o cámbialos de categoría primero.`,
        setError,
      );
      return;
    }
    if (!confirm(`¿Borrar la categoría «${c.name}»?`)) return;
    setError('');
    try {
      await api(`/admin/categories/${c.id}`, { method: 'DELETE' });
      await load(branchId);
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  async function removeProduct(p: Product) {
    if (!confirm(`¿Borrar el producto «${p.name}»?`)) return;
    setError('');
    try {
      await api(`/admin/products/${p.id}`, { method: 'DELETE' });
      await load(branchId);
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Elige sucursal, arma categorías y el catálogo. Marca Frecuente para que salga primero en la caja."
      />
      <Field label="Sucursal">
        <Select value={branchId} onChange={(e) => onBranchChange(e.target.value)}>
          {branches.length === 0 ? <option value="">Sin sucursales — créalas en Sucursales</option> : null}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Categorías</h2>
      <form onSubmit={saveCategory} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Field label={editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}>
          <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Bebidas" required />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit">
            {editingCategoryId ? 'Guardar' : 'Agregar'}
          </Button>
          {editingCategoryId ? (
            <Button type="button" variant="secondary" onClick={() => { setEditingCategoryId(null); setCategoryName(''); }}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
      <Panel className="overflow-hidden mb-8">
        {categories.length === 0 ? (
          <EmptyState title="Sin categorías" description="Agrega al menos una para poder crear productos." />
        ) : (
          <ul>
            {categories.map((c, i) => (
              <li key={c.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <span className="font-medium">{c.name}</span>
                <span className="whitespace-nowrap">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => {
                      setEditingCategoryId(c.id);
                      setCategoryName(c.name);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="h-8 px-2"
                    onClick={() => removeCategory(c)}
                  >
                    Borrar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Catálogo</h2>
      <form onSubmit={saveProduct} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_7rem_auto_auto]">
        <Field label="Categoría">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.length === 0 ? <option value="">Sin categorías</option> : null}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nombre">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Precio">
          <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium text-muted sm:pb-0 sm:self-end sm:h-10">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Frecuente
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">
            {editingProductId ? 'Guardar' : 'Agregar'}
          </Button>
          {editingProductId ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingProductId(null);
                setName('');
                setPrice('35');
                setIsPinned(false);
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      <Panel className="overflow-hidden">
        {!branchId ? (
          <EmptyState title="Sin sucursal" description="Crea una sucursal en el menú Sucursales." />
        ) : products.length === 0 ? (
          <EmptyState title="Sin productos" description="Agrega el primero con el formulario de arriba." />
        ) : (
          <TableScroll>
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-surface-secondary text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium text-right">Precio</th>
                <th className="px-4 py-3 font-medium">Caja</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted">{categories.find((c) => c.id === p.categoryId)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular">${(p.priceCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant={p.isPinned ? 'primary' : 'ghost'}
                      className="h-8 px-2"
                      onClick={async () => {
                        setError('');
                        try {
                          await api(`/admin/products/${p.id}?branchId=${branchId}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                              categoryId: p.categoryId,
                              name: p.name,
                              priceCents: p.priceCents,
                              isPinned: !p.isPinned,
                            }),
                          });
                          await load(branchId);
                        } catch (err) {
                          showBlocked((err as Error).message, setError);
                        }
                      }}
                    >
                      {p.isPinned ? 'Frecuente' : 'Fijar'}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => {
                        setEditingProductId(p.id);
                        setName(p.name);
                        setPrice((p.priceCents / 100).toFixed(2));
                        setCategoryId(p.categoryId);
                        setIsPinned(Boolean(p.isPinned));
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="h-8 px-2"
                      onClick={() => removeProduct(p)}
                    >
                      Borrar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableScroll>
        )}
      </Panel>
    </div>
  );
}
