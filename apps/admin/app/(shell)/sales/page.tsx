'use client';

import { Fragment, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button, EmptyState, PageHeader, Panel } from '@/components/ui';

type SaleItem = {
  id: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  note: string | null;
};

type SaleRow = {
  id: string;
  createdAt: string;
  status: string;
  totalCents: number;
  dailyNumber: number | null;
  tableLabel: string | null;
  paymentMethod: 'cash' | 'transfer' | null;
  itemCount: number;
  items: SaleItem[];
};

function mxn(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function payLabel(method: SaleRow['paymentMethod']) {
  if (method === 'cash') return 'Efectivo';
  if (method === 'transfer') return 'Transferencia';
  return '—';
}

function statusLabel(status: string) {
  if (status === 'paid') return 'Pagado';
  if (status === 'voided') return 'Anulado';
  return status;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api('/admin/sales').then(setSales).catch(() => undefined);
  }, []);

  return (
    <div>
      <PageHeader
        title="Ventas cobradas"
        description="Cada ticket con lo que pidieron, cantidades y precios. Los montos de caja están en Caja."
      />
      <Panel className="overflow-hidden">
        {sales.length === 0 ? (
          <EmptyState title="Sin ventas" description="Los cobros aparecerán aquí con el detalle de productos." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Cuenta</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const open = openId === sale.id;
                return (
                  <Fragment key={sale.id}>
                    <tr className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">
                        {sale.dailyNumber != null ? `#${sale.dailyNumber}` : sale.id.slice(0, 8)}
                        {sale.tableLabel ? (
                          <span className="ml-2 font-normal text-muted">{sale.tableLabel}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(sale.createdAt).toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3">{payLabel(sale.paymentMethod)}</td>
                      <td className="px-4 py-3 text-muted">
                        {sale.itemCount} {sale.itemCount === 1 ? 'artículo' : 'artículos'}
                      </td>
                      <td className="px-4 py-3 text-right tabular font-semibold">{mxn(sale.totalCents)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setOpenId(open ? null : sale.id)}
                        >
                          {open ? 'Ocultar' : 'Detalle'}
                        </Button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="border-t border-border bg-surface-secondary/60">
                        <td colSpan={6} className="px-4 py-4">
                          <p className="mb-3 text-xs font-bold tracking-[0.14em] text-muted">
                            {statusLabel(sale.status).toUpperCase()} · LO QUE PIDIERON
                          </p>
                          <table className="w-full text-sm">
                            <thead className="text-muted text-left">
                              <tr>
                                <th className="pb-2 font-medium">Cant.</th>
                                <th className="pb-2 font-medium">Producto</th>
                                <th className="pb-2 font-medium text-right">c/u</th>
                                <th className="pb-2 font-medium text-right">Importe</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.items.map((item) => (
                                <tr key={item.id} className="border-t border-border/70">
                                  <td className="py-2 pr-3 tabular">{item.qty}</td>
                                  <td className="py-2">
                                    {item.name}
                                    {item.note ? (
                                      <span className="block text-xs text-muted">{item.note}</span>
                                    ) : null}
                                  </td>
                                  <td className="py-2 text-right tabular text-muted">{mxn(item.unitPriceCents)}</td>
                                  <td className="py-2 text-right tabular font-medium">{mxn(item.lineTotalCents)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
