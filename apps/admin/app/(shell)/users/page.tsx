'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { showBlocked } from '@/lib/blocked';
import { Alert, Button, EmptyState, Field, Input, PageHeader, Panel, Select } from '@/components/ui';

type UserRole = 'owner' | 'admin' | 'cashier';
type UserRow = {
  id: string;
  displayName: string;
  role: UserRole;
  email: string | null;
  branchId: string | null;
  isActive: boolean;
  hasPin?: boolean;
  hasPassword?: boolean;
};
type Branch = { id: string; name: string };

function roleLabel(role: UserRole) {
  if (role === 'owner') return 'Dueño';
  if (role === 'admin') return 'Admin';
  return 'Cajero';
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [platformEditingId, setPlatformEditingId] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState('');
  const [platformEmail, setPlatformEmail] = useState('');
  const [platformPassword, setPlatformPassword] = useState('');
  const [cashierEditingId, setCashierEditingId] = useState<string | null>(null);
  const [cashierName, setCashierName] = useState('');
  const [pin, setPin] = useState('1234');
  const [branchId, setBranchId] = useState('');
  const [platformError, setPlatformError] = useState('');
  const [cashierError, setCashierError] = useState('');
  const editingOwner = users.find((u) => u.id === platformEditingId)?.role === 'owner';
  const platformUsers = users.filter((u) => u.role === 'owner' || u.role === 'admin');
  const cashiers = users.filter((u) => u.role === 'cashier');

  async function load() {
    const [list, branchList] = await Promise.all([api('/admin/users'), api('/admin/branches')]);
    setUsers(list);
    setBranches(branchList);
    setBranchId((current) => current || branchList[0]?.id || '');
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  function resetPlatform() {
    setPlatformEditingId(null);
    setPlatformName('');
    setPlatformEmail('');
    setPlatformPassword('');
    setPlatformError('');
  }

  function resetCashier() {
    setCashierEditingId(null);
    setCashierName('');
    setPin('1234');
    setBranchId(branches[0]?.id ?? '');
    setCashierError('');
  }

  function startEditPlatform(u: UserRow) {
    setPlatformEditingId(u.id);
    setPlatformName(u.displayName);
    setPlatformEmail(u.email ?? '');
    setPlatformPassword('');
    setPlatformError('');
  }

  function startEditCashier(u: UserRow) {
    setCashierEditingId(u.id);
    setCashierName(u.displayName);
    setPin('');
    setBranchId(u.branchId ?? branches[0]?.id ?? '');
    setCashierError('');
  }

  async function savePlatform(e: FormEvent) {
    e.preventDefault();
    setPlatformError('');
    try {
      const body: Record<string, unknown> = {
        displayName: platformName,
        role: editingOwner ? 'owner' : 'admin',
        email: platformEmail.trim().toLowerCase(),
      };
      if (platformPassword) body.password = platformPassword;
      if (platformEditingId) {
        await api(`/admin/users/${platformEditingId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/admin/users', { method: 'POST', body: JSON.stringify(body) });
      }
      resetPlatform();
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setPlatformError);
    }
  }

  async function saveCashier(e: FormEvent) {
    e.preventDefault();
    setCashierError('');
    try {
      const body: Record<string, unknown> = {
        displayName: cashierName,
        role: 'cashier',
        branchId: branchId || null,
      };
      if (pin) body.pin = pin;
      if (cashierEditingId) {
        await api(`/admin/users/${cashierEditingId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/admin/users', { method: 'POST', body: JSON.stringify(body) });
      }
      resetCashier();
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setCashierError);
    }
  }

  async function remove(u: UserRow, kind: 'platform' | 'cashier') {
    const setError = kind === 'platform' ? setPlatformError : setCashierError;
    if (u.role === 'owner') {
      showBlocked(
        `No se puede borrar a ${u.displayName} porque es el dueño de la cuenta. El owner siempre debe existir.`,
        setError,
      );
      return;
    }
    const message =
      kind === 'platform'
        ? `¿Borrar a ${u.displayName}? Ya no podrá entrar al panel web.`
        : `¿Borrar a ${u.displayName}? Ya no podrá entrar a la caja.`;
    if (!confirm(message)) return;
    setError('');
    try {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      if (platformEditingId === u.id) resetPlatform();
      if (cashierEditingId === u.id) resetCashier();
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Usuarios"
        description="El panel web usa correo y contraseña. La caja usa nombre y PIN."
      />

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Panel web</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Quienes entran a esta plataforma. El dueño no se puede borrar ni cambiar de rol.
        </p>
        <form
          onSubmit={savePlatform}
          autoComplete="off"
          className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_10rem_auto]"
        >
          <Field label="Nombre">
            <Input
              placeholder="Nombre"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Correo">
            <Input
              type="email"
              placeholder="admin@negocio.com"
              value={platformEmail}
              onChange={(e) => setPlatformEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label={platformEditingId ? 'Contraseña (vacío = no cambia)' : 'Contraseña'}>
            <Input
              type="password"
              placeholder="Mínimo 8"
              value={platformPassword}
              onChange={(e) => setPlatformPassword(e.target.value)}
              autoComplete="new-password"
              minLength={platformEditingId ? undefined : 8}
              required={!platformEditingId}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              {platformEditingId ? 'Guardar' : 'Crear'}
            </Button>
            {platformEditingId ? (
              <Button type="button" variant="secondary" onClick={resetPlatform}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
        {platformError ? <Alert>{platformError}</Alert> : null}
        <Panel className="overflow-hidden">
          {platformUsers.length === 0 ? (
            <EmptyState title="Sin accesos web" description="Crea un admin con correo y contraseña." />
          ) : (
            <ul>
              {platformUsers.map((u, i) => (
                <li
                  key={u.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold">
                      {initials(u.displayName ?? '')}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.displayName}</div>
                      <div className="text-xs text-muted truncate">
                        {roleLabel(u.role)}
                        {u.email ? ` · ${u.email}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="flex shrink-0 flex-wrap justify-end">
                    <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => startEditPlatform(u)}>
                      Editar
                    </Button>
                    <Button type="button" variant="danger" className="h-8 px-2" onClick={() => remove(u, 'platform')}>
                      Borrar
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Caja</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Cajeros de la app. El PIN es el que usan al abrir la terminal.</p>
        <form onSubmit={saveCashier} autoComplete="off" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_10rem_auto]">
          <Field label="Nombre">
            <Input
              placeholder="Nombre"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label={cashierEditingId ? 'PIN (vacío = no cambia)' : 'PIN'}>
            <Input
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="off"
              inputMode="numeric"
              minLength={cashierEditingId ? undefined : 4}
              required={!cashierEditingId}
            />
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
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              {cashierEditingId ? 'Guardar' : 'Crear'}
            </Button>
            {cashierEditingId ? (
              <Button type="button" variant="secondary" onClick={resetCashier}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
        {cashierError ? <Alert>{cashierError}</Alert> : null}
        <Panel className="overflow-hidden">
          {cashiers.length === 0 ? (
            <EmptyState title="Sin cajeros" description="Crea un cajero para empezar a vender." />
          ) : (
            <ul>
              {cashiers.map((u, i) => (
                <li
                  key={u.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold">
                      {initials(u.displayName ?? '')}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.displayName}</div>
                      <div className="text-xs text-muted">
                        {roleLabel(u.role)}
                        {u.branchId ? ` · ${branches.find((b) => b.id === u.branchId)?.name ?? ''}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="flex shrink-0 flex-wrap justify-end">
                    <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => startEditCashier(u)}>
                      Editar
                    </Button>
                    <Button type="button" variant="danger" className="h-8 px-2" onClick={() => remove(u, 'cashier')}>
                      Borrar
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}
