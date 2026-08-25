'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { kitchenBanner, type KitchenTicketPayload } from '@ordio/shared';
import { Button, EmptyState, Field, PageHeader, Panel, Select } from '@/components/ui';

type Branch = { id: string; name: string };
type KitchenJob = {
  id: string;
  createdAt: string;
  status: 'pending' | 'printed' | 'failed';
  orderId: string | null;
  payload: KitchenTicketPayload;
};
type OpenOrder = {
  id: string;
  dailyNumber: number | null;
  tableLabel: string | null;
  totalCents: number;
  createdAt: string;
  items: Array<{ id: string; name: string; qty: number; sentQty: number }>;
};

function bannerTone(payload: KitchenTicketPayload) {
  const banner = kitchenBanner(payload.lines ?? [], payload.round ?? 1);
  if (banner === 'VOID') return 'bg-danger text-white';
  if (banner === 'CAMBIO') return 'bg-warning text-white';
  if (banner === 'EXTRA' || (payload.round ?? 1) > 1) return 'bg-brand text-white';
  return 'bg-foreground text-white';
}

function bannerLabel(payload: KitchenTicketPayload) {
  return kitchenBanner(payload.lines ?? [], payload.round ?? 1) ?? ((payload.round ?? 1) <= 1 ? 'NUEVO' : 'EXTRA');
}

export default function OrdersPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [tickets, setTickets] = useState<KitchenJob[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (id: string) => {
    if (!id) {
      setTickets([]);
      setOpenOrders([]);
      return;
    }
    const data = await api(`/admin/kitchen?branchId=${id}`);
    setTickets(data.tickets ?? []);
    setOpenOrders(data.openOrders ?? []);
    setUpdatedAt(new Date());
  }, []);

  useEffect(() => {
    (async () => {
      const list = await api('/admin/branches');
      setBranches(list);
      const preferred = list[0]?.id ?? '';
      setBranchId(preferred);
      if (preferred) await load(preferred);
    })().catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (!branchId) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void load(branchId);
    };
    const timer = setInterval(tick, 4000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [branchId, load]);

  async function markPrinted(id: string) {
    await api(`/admin/kitchen/${id}/printed`, { method: 'POST' });
    await load(branchId);
  }

  const pending = tickets.filter((ticket) => ticket.status === 'pending');
  const done = tickets.filter((ticket) => ticket.status !== 'pending');

  return (
    <div>
      <PageHeader
        title="Pedidos a cocina"
        description="Aquí salen las comandas al enviar desde la caja. Sirve de pantalla de cocina hasta que haya impresora."
        action={
          <Field label="Sucursal">
            <Select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                void load(e.target.value);
              }}
            >
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

      <p className="mb-6 text-xs text-muted">
        {updatedAt ? `Actualizado ${updatedAt.toLocaleTimeString('es-MX')}` : 'Cargando…'} · se refresca solo
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Comandas</h2>
          {pending.length === 0 && done.length === 0 ? (
            <Panel>
              <EmptyState
                title="Sin comandas"
                description="Cuando en la caja toquen Enviar, el pedido aparece aquí como si saliera en la impresora."
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pending.map((job) => (
                <KitchenCard key={job.id} job={job} onPrinted={() => void markPrinted(job.id)} />
              ))}
              {done.map((job) => (
                <KitchenCard key={job.id} job={job} dimmed />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Cuentas abiertas</h2>
          {openOrders.length === 0 ? (
            <Panel>
              <EmptyState title="Nadie en mesa" description="Las cuentas sin cobrar se listan aquí." />
            </Panel>
          ) : (
            openOrders.map((order) => (
              <Panel key={order.id} className="p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-lg font-semibold">#{order.dailyNumber ?? '—'}</p>
                  <p className="text-sm text-muted">
                    {order.tableLabel ? `${order.tableLabel} · ` : ''}
                    {new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span>
                        <span className="tabular font-semibold">{item.qty}</span> {item.name}
                      </span>
                      {item.qty > item.sentQty ? (
                        <span className="text-brand text-xs font-semibold">
                          +{item.qty - item.sentQty} pend.
                        </span>
                      ) : (
                        <span className="text-muted text-xs">en cocina</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KitchenCard({
  job,
  dimmed,
  onPrinted,
}: {
  job: KitchenJob;
  dimmed?: boolean;
  onPrinted?: () => void;
}) {
  const payload = job.payload;
  const lines = payload?.lines ?? [];
  return (
    <Panel className={`p-4 ${dimmed ? 'opacity-55' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight">#{payload?.dailyNumber ?? '—'}</p>
          <p className="mt-1 text-xs text-muted">
            {new Date(job.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            {payload?.round ? ` · Ronda ${payload.round}` : ''}
            {payload?.tableLabel ? ` · ${payload.tableLabel}` : ''}
          </p>
        </div>
        <span className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-widest ${bannerTone(payload)}`}>
          {bannerLabel(payload)}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {lines.map((line, index) => (
          <li
            key={`${line.name}-${index}`}
            className={`flex gap-3 text-base font-semibold ${line.kind === 'void' ? 'text-danger line-through' : ''}`}
          >
            <span className="tabular w-8">{line.kind === 'void' ? `−${line.qty}` : line.qty}</span>
            <span>{line.name}</span>
          </li>
        ))}
      </ul>
      {onPrinted && !dimmed ? (
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={onPrinted}>
            Marcar lista
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">Lista / impresa</p>
      )}
    </Panel>
  );
}
