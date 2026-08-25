'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { EmptyState, Metric, PageHeader, Panel } from '@/components/ui';

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

  return (
    <div>
      <PageHeader title="Hoy" description="Actividad de la sucursal en el día." />
      <Panel className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          <Metric label="Ventas" value={String(data.salesCount)} />
          <Metric label="Total" value={`$${(data.totalCents / 100).toFixed(2)}`} />
          <Metric
            label="Efectivo / Transferencia"
            value={`$${(data.cashCents / 100).toFixed(2)} / $${(data.transferCents / 100).toFixed(2)}`}
          />
        </div>
      </Panel>
      <Panel className="mt-6 overflow-hidden">
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
                  <td className="px-4 py-3 text-right tabular">${(h.totalCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
