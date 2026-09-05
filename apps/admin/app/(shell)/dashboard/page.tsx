'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { EmptyState, Metric, PageHeader, Panel } from '@/components/ui';

function mxn(cents: number) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

function monthTitle(iso?: string) {
  if (!iso) return 'este mes';
  const label = new Date(iso).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api('/admin/dashboard/today').then(setData).catch(() => undefined);
  }, []);

  if (!data) {
    return (
      <div>
        <PageHeader title="Hoy" description="Actividad de la sucursal en el día." />
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    );
  }

  const hours = (data.byHour ?? []).filter((h: any) => h.count);
  const month = data.month ?? {
    salesCount: 0,
    totalCents: 0,
    cashCents: 0,
    transferCents: 0,
    suppliesCents: 0,
    profitCents: 0,
    supplies: [],
  };
  const monthLabel = monthTitle(month.start);
  const incomeCents = month.totalCents ?? 0;
  const suppliesCents = month.suppliesCents ?? 0;
  const profitCents = month.profitCents ?? incomeCents - suppliesCents;
  const barMax = Math.max(incomeCents, suppliesCents, 1);
  const supplies = month.supplies ?? [];

  return (
    <div>
      <PageHeader title="Hoy" description="Actividad de la sucursal en el día." />
      <Panel className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          <Metric label="Ventas" value={String(data.salesCount)} />
          <Metric label="Total" value={mxn(data.totalCents)} />
          <Metric
            label="Efectivo / Transferencia"
            value={`${mxn(data.cashCents)} / ${mxn(data.transferCents)}`}
          />
        </div>
      </Panel>
      <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">
        Total del mes · {monthLabel}
      </h2>
      <Panel className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          <Metric label="Ventas" value={String(month.salesCount)} />
          <Metric label="Total" value={mxn(month.totalCents)} />
          <Metric
            label="Efectivo / Transferencia"
            value={`${mxn(month.cashCents)} / ${mxn(month.transferCents)}`}
          />
        </div>
      </Panel>
      <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">
        Ingresos vs suministros · {monthLabel}
      </h2>
      <Panel className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          <Metric label="Ingresos" value={mxn(incomeCents)} />
          <Metric label="Suministros" value={mxn(suppliesCents)} />
          <Metric
            label={profitCents >= 0 ? 'Utilidad' : 'Pérdida'}
            value={mxn(Math.abs(profitCents))}
            valueClassName={profitCents >= 0 ? 'text-success' : 'text-danger'}
          />
        </div>
        <div className="mt-6 space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Ingresos</span>
              <span className="tabular">{mxn(incomeCents)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
              <div className="h-2 rounded-full bg-brand" style={{ width: `${(incomeCents / barMax) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Suministros</span>
              <span className="tabular">{mxn(suppliesCents)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
              <div className="h-2 rounded-full bg-warning" style={{ width: `${(suppliesCents / barMax) * 100}%` }} />
            </div>
          </div>
        </div>
      </Panel>
      {supplies.length > 0 ? (
        <Panel className="mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Suministro</th>
                <th className="px-4 py-3 font-medium text-right">Gasto del mes</th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((item: { id: string; name: string; amountCents: number }) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-right tabular">{mxn(item.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-muted">Ventas de hoy</h2>
      <Panel className="overflow-hidden">
        {hours.length === 0 ? (
          <EmptyState title="Sin ventas aún" description="Los tickets cobrados aparecerán aquí por hora." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Hora</th>
                <th className="px-4 py-3 font-medium">Tickets</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((h: any) => (
                <tr key={h.hour} className="border-t border-border">
                  <td className="px-4 py-3">{h.hour}:00</td>
                  <td className="px-4 py-3 tabular">{h.count}</td>
                  <td className="px-4 py-3 text-right tabular">{mxn(h.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
