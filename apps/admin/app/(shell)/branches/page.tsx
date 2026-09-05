'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { showBlocked } from '@/lib/blocked';
import { Alert, Button, EmptyState, Field, Input, PageHeader, Panel, TableScroll } from '@/components/ui';

type Branch = {
  id: string;
  name: string;
  activationCode: string;
  address: string | null;
  deleteBlockedReason?: string | null;
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setBranches(await api('/admin/branches'));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  function reset() {
    setEditingId(null);
    setName('');
    setActivationCode('');
    setAddress('');
    setError('');
  }

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setName(b.name);
    setActivationCode(b.activationCode);
    setAddress(b.address ?? '');
    setError('');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const body = {
        name,
        activationCode: activationCode.trim() || undefined,
        address: address.trim() || null,
      };
      if (editingId) {
        await api(`/admin/branches/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/admin/branches', { method: 'POST', body: JSON.stringify(body) });
      }
      reset();
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  async function remove(b: Branch) {
    if (b.deleteBlockedReason) {
      showBlocked(b.deleteBlockedReason, setError);
      return;
    }
    if (
      !confirm(
        `¿Borrar «${b.name}»?\n\nSolo se puede si no tiene catálogo, cajas emparejadas ni ventas. Si ya operó, se conserva el historial.`,
      )
    ) {
      return;
    }
    setError('');
    try {
      await api(`/admin/branches/${b.id}`, { method: 'DELETE' });
      if (editingId === b.id) reset();
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  return (
    <div>
      <PageHeader
        title="Sucursales"
        description="Crea sucursales y su código de pairing para las cajas. Si dejas el código vacío, se genera uno."
      />
      <form onSubmit={save} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem_1fr_auto]">
        <Field label="Nombre">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sucursal Centro" required />
        </Field>
        <Field label="Código pairing">
          <Input
            value={activationCode}
            onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
            placeholder="ORDIO-..."
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Dirección">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opcional" />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit">{editingId ? 'Guardar' : 'Agregar'}</Button>
          {editingId ? (
            <Button type="button" variant="secondary" onClick={reset}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      <Panel className="overflow-hidden">
        {branches.length === 0 ? (
          <EmptyState title="Sin sucursales" description="Agrega la primera para poder armar el catálogo y emparejar cajas." />
        ) : (
          <TableScroll>
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-surface-secondary text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Dirección</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.activationCode}</td>
                  <td className="px-4 py-3 text-muted">{b.address || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => startEdit(b)}>
                      Editar
                    </Button>
                    <Button type="button" variant="danger" className="h-8 px-2" onClick={() => remove(b)}>
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
