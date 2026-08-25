'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { showBlocked } from '@/lib/blocked';
import { Alert, Button, EmptyState, Field, Input, Metric, PageHeader, Panel, Select } from '@/components/ui';

type Branch = { id: string; name: string };
type Session = {
  id: string;
  status: 'open' | 'closed';
  openingAmountCents: number;
  expectedClosingCents: number | null;
  declaredClosingCents: number | null;
  differenceCents: number | null;
  openedAt: string;
  closedAt: string | null;
};
type Summary = {
  salesCount: number;
  cashSalesCents: number;
  transferSalesCents: number;
  expectedClosingCents: number;
  openChecksCount: number;
  openChecks: Array<{ id: string; dailyNumber: number | null; totalCents: number }>;
};
type CashDay = { session: Session | null; summary: Summary | null; history: Session[] };

function mxn(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function pesosToCents(value: string) {
  return Math.round(Number(value.replace(',', '.')) * 100);
}

export default function CashPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [data, setData] = useState<CashDay | null>(null);
  const [opening, setOpening] = useState('0');
  const [closing, setClosing] = useState('0');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(id: string) {
    if (!id) {
      setData(null);
      return;
    }
    const next: CashDay = await api(`/admin/cash?branchId=${id}`);
    setData(next);
    if (next.summary) setClosing((next.summary.expectedClosingCents / 100).toFixed(2));
  }

  useEffect(() => {
    (async () => {
      const list = await api('/admin/branches');
      setBranches(list);
      const preferred = list[0]?.id ?? '';
      setBranchId(preferred);
      if (preferred) await load(preferred);
    })().catch(() => undefined);
  }, []);

  async function onBranchChange(id: string) {
    setBranchId(id);
    setError('');
    await load(id);
  }

  async function openDay(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!branchId) {
      showBlocked('Elige una sucursal para abrir el día.', setError);
      return;
    }
    setBusy(true);
    try {
      await api('/admin/cash/open', {
        method: 'POST',
        body: JSON.stringify({ branchId, openingAmountCents: pesosToCents(opening) }),
      });
      setOpening('0');
      await load(branchId);
    } catch (err) {
      showBlocked((err as Error).message, setError);
    } finally {
      setBusy(false);
    }
  }

  async function closeDay(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!data?.session) return;
    if ((data.summary?.openChecksCount ?? 0) > 0) {
      showBlocked(
        'Hay cuentas abiertas en la caja. Cóbralas o anúlalas antes de cerrar el día.',
        setError,
      );
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/cash/${data.session.id}/close`, {
        method: 'POST',
        body: JSON.stringify({ declaredClosingCents: pesosToCents(closing) }),
      });
      await load(branchId);
    } catch (err) {
      showBlocked((err as Error).message, setError);
    } finally {
      setBusy(false);
    }
  }

  const open = data?.session?.status === 'open' ? data.session : null;
  const summary = data?.summary;

  return (
    <div>
      <PageHeader
        title="Caja del día"
        description="Solo montos del cajón: fondo, efectivo, transferencia y corte. El detalle de lo que pidieron está en Ventas."
        action={
          <Field label="Sucursal">
            <Select value={branchId} onChange={(e) => void onBranchChange(e.target.value)}>
              {branches.length === 0 ? <option value="">Sin sucursales</option> : null}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        }
      />
      {error ? <Alert>{error}</Alert> : null}

      {!branchId ? (
        <Panel>
          <EmptyState title="Sin sucursal" description="Crea una sucursal para abrir caja." />
        </Panel>
      ) : !open ? (
        <Panel className="p-6">
          <h2 className="text-base font-semibold text-foreground">Abrir el día</h2>
          <p className="mt-1 text-sm text-muted">
            Con esto las cajas de la sucursal ya pueden tomar cuentas. El fondo es el efectivo con el que arranca el cajón.
          </p>
          <form onSubmit={(e) => void openDay(e)} className="mt-6 flex flex-wrap items-end gap-3">
            <Field label="Fondo inicial (pesos)">
              <Input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="decimal" />
            </Field>
            <Button type="submit" disabled={busy}>
              Abrir día
            </Button>
          </form>
        </Panel>
      ) : (
        <>
          <Panel className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <div>
                <div className="text-xs font-bold tracking-[0.16em] text-brand">DÍA ABIERTO</div>
                <p className="mt-1 text-sm text-muted">
                  Desde {new Date(open.openedAt).toLocaleString('es-MX')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4">
              <Metric label="Fondo inicial" value={mxn(open.openingAmountCents)} />
              <Metric label="Ventas efectivo" value={mxn(summary?.cashSalesCents ?? 0)} />
              <Metric label="Ventas transferencia" value={mxn(summary?.transferSalesCents ?? 0)} />
              <Metric label="Debería haber" value={mxn(summary?.expectedClosingCents ?? 0)} />
            </div>
          </Panel>

          {(summary?.openChecksCount ?? 0) > 0 ? (
            <Panel className="mt-6 overflow-hidden">
              <div className="px-4 py-3 text-sm font-medium text-warning bg-warning/10 border-b border-warning/20">
                {summary!.openChecksCount} {summary!.openChecksCount === 1 ? 'cuenta abierta' : 'cuentas abiertas'} — ciérralas en la app antes de cortar caja.
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {summary!.openChecks.map((check) => (
                    <tr key={check.id} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">#{check.dailyNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular">{mxn(check.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ) : null}

          <Panel className="mt-6 p-6">
            <h2 className="text-base font-semibold text-foreground">Cerrar el día</h2>
            <p className="mt-1 text-sm text-muted">
              Cuenta el efectivo del cajón. La diferencia es lo contado menos lo que debería haber (fondo + efectivo − retiros).
            </p>
            <form onSubmit={(e) => void closeDay(e)} className="mt-6 flex flex-wrap items-end gap-3">
              <Field label="Efectivo contado (pesos)">
                <Input value={closing} onChange={(e) => setClosing(e.target.value)} inputMode="decimal" />
              </Field>
              <Button type="submit" disabled={busy || (summary?.openChecksCount ?? 0) > 0}>
                Cerrar día
              </Button>
            </form>
          </Panel>
        </>
      )}

      <Panel className="mt-6 overflow-hidden">
        {(data?.history ?? []).length === 0 ? (
          <EmptyState title="Sin cortes anteriores" description="Cuando cierres un día, el fondo, lo esperado y la diferencia quedan aquí." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Cierre</th>
                <th className="px-4 py-3 font-medium text-right">Fondo</th>
                <th className="px-4 py-3 font-medium text-right">Esperado</th>
                <th className="px-4 py-3 font-medium text-right">Contado</th>
                <th className="px-4 py-3 font-medium text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {data!.history.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3">{row.closedAt ? new Date(row.closedAt).toLocaleString('es-MX') : '—'}</td>
                  <td className="px-4 py-3 text-right tabular">{mxn(row.openingAmountCents)}</td>
                  <td className="px-4 py-3 text-right tabular">{mxn(row.expectedClosingCents ?? 0)}</td>
                  <td className="px-4 py-3 text-right tabular">{mxn(row.declaredClosingCents ?? 0)}</td>
                  <td className={`px-4 py-3 text-right tabular ${(row.differenceCents ?? 0) !== 0 ? 'text-warning' : ''}`}>
                    {mxn(row.differenceCents ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
