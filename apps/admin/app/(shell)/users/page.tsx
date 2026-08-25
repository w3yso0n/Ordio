'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { showBlocked } from '@/lib/blocked';
import { Alert, Button, EmptyState, Field, Input, PageHeader, Panel, Select } from '@/components/ui';

type UserRow = {
  id: string;
  displayName: string;
  role: 'owner' | 'admin' | 'cashier';
  email: string | null;
  branchId: string | null;
  isActive: boolean;
};
type Branch = { id: string; name: string };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('1234');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');
  const editingOwner = users.find((u) => u.id === editingId)?.role === 'owner';

  async function load() {
    const [list, branchList] = await Promise.all([api('/admin/users'), api('/admin/branches')]);
    setUsers(list);
    setBranches(branchList);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  function reset() {
    setEditingId(null);
    setDisplayName('');
    setPin('1234');
    setRole('cashier');
    setBranchId(branches[0]?.id ?? '');
    setError('');
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setDisplayName(u.displayName);
    setPin('');
    setRole(u.role === 'owner' ? 'cashier' : u.role);
    setBranchId(u.branchId ?? branches[0]?.id ?? '');
    setError('');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const body: Record<string, unknown> = {
        displayName,
        role,
        branchId: branchId || null,
      };
      if (pin) body.pin = pin;
      if (editingId) {
        const current = users.find((u) => u.id === editingId);
        await api(`/admin/users/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...body,
            role: current?.role === 'owner' ? 'owner' : role,
          }),
        });
      } else {
        await api('/admin/users', { method: 'POST', body: JSON.stringify(body) });
      }
      reset();
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  async function remove(u: UserRow) {
    if (u.role === 'owner') {
      showBlocked(
        `No se puede borrar a ${u.displayName} porque es el dueño de la cuenta. El owner siempre debe existir.`,
        setError,
      );
      return;
    }
    if (!confirm(`¿Borrar a ${u.displayName}? Ya no podrá entrar a la caja.`)) return;
    setError('');
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      if (editingId === u.id) reset();
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  return (
    <div>
      <PageHeader title="Usuarios" description="Cajeros y administradores. El PIN es el que usan en la caja." />
      <form onSubmit={save} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_10rem_8rem_auto]">
        <Field label="Nombre">
          <Input placeholder="Nombre" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </Field>
        <Field label={editingId ? 'PIN (vacío = no cambia)' : 'PIN'}>
          <Input placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
        </Field>
        <Field label="Sucursal">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Sin sucursal</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Rol">
          <Select
            value={editingOwner ? 'owner' : role}
            disabled={editingOwner}
            onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
          >
            {editingOwner ? <option value="owner">Dueño</option> : null}
            <option value="cashier">Cajero</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit">{editingId ? 'Guardar' : 'Crear'}</Button>
          {editingId ? (
            <Button type="button" variant="secondary" onClick={reset}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      <Panel className="overflow-hidden">
        {users.length === 0 ? (
          <EmptyState title="Sin usuarios" description="Crea un cajero para empezar a vender." />
        ) : (
          <ul>
            {users.map((u, i) => (
              <li
                key={u.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold">
                    {String(u.displayName ?? '')
                      .split(' ')
                      .slice(0, 2)
                      .map((p: string) => p[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.displayName}</div>
                    <div className="text-xs text-muted">
                      {u.role}
                      {u.branchId ? ` · ${branches.find((b) => b.id === u.branchId)?.name ?? ''}` : ''}
                    </div>
                  </div>
                </div>
                <span className="whitespace-nowrap">
                  <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => startEdit(u)}>
                    Editar
                  </Button>
                  <Button type="button" variant="danger" className="h-8 px-2" onClick={() => remove(u)}>
                    Borrar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
