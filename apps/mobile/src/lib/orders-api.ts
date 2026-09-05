import { randomUUID } from 'expo-crypto';
import { applyKitchenSend, kitchenDelta, type KitchenTicketPayload, type ReceiptPayload } from '@ordio/shared';
import { AuthError, apiFetch, decodeJwtPayload, peekAccessToken } from './api';
import { shouldQueueLocally } from './network';
import type { LocalOrder } from './order-engine';
import { orderFromServer } from './order-engine';
import {
  bumpLocalDailyNumber,
  checksToSummaries,
  ensureDailyNumber,
  fallbackSession,
  findLocalCheck,
  loadDeviceContext,
  loadLocalChecks,
  loadPaidSales,
  removeLocalCheck,
  saveCachedSession,
  saveDeviceContext,
  saveLocalCheck,
  savePaidSale,
  type CachedSession,
  type LocalPaidSale,
  type OpenCheckSummary,
} from './local-checks';
import { enqueueOp } from './sync-queue';

export type { OpenCheckSummary, LocalPaidSale };

export type ServerOrder = {
  id: string;
  dailyNumber: number | null;
  status: string;
  tableLabel: string | null;
  totalCents: number;
  createdAt?: string;
  items: Array<{
    id: string;
    productId: string | null;
    nameSnapshot: string;
    unitPriceCents: number;
    qty: number;
    sentQty: number;
    note: string | null;
    lineTotalCents: number;
  }>;
};

async function sessionFromToken(): Promise<CachedSession | null> {
  const token = await peekAccessToken('cashier');
  const claims = token ? decodeJwtPayload(token) : null;
  const ctx = loadDeviceContext();
  const branchId = claims?.branchId ?? ctx?.branchId;
  if (!branchId) return null;
  if (claims?.userId) {
    saveDeviceContext({ branchId, cashierUserId: claims.userId, deviceId: claims.deviceId });
  }
  return fallbackSession() ?? {
    id: 'offline-pending',
    branchId,
    openedByUserId: claims?.userId ?? ctx?.cashierUserId ?? ctx?.deviceId ?? 'offline',
  };
}

const SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function apiSessionId(id: string | undefined) {
  return id && SESSION_UUID.test(id) ? id : undefined;
}

async function currentSession(): Promise<CachedSession> {
  try {
    const session = await apiFetch('/cash/sessions/current');
    if (session?.id) {
      const cached = {
        id: session.id,
        branchId: session.branchId,
        openedByUserId: session.openedByUserId,
      };
      saveCachedSession(cached);
      return cached;
    }
    throw Object.assign(
      new Error('Hoy no hay caja abierta. Ábrela desde el panel para enviar a cocina o cobrar.'),
      { status: 400 },
    );
  } catch (err) {
    if (/caja abierta/i.test(String((err as Error).message ?? ''))) throw err;
    if (!shouldQueueLocally(err) && !(err instanceof AuthError)) throw err;
  }
  const local = fallbackSession() ?? (await sessionFromToken());
  if (!local?.branchId) {
    throw new Error('Conéctate una vez para guardar esta caja. Después puedes vender sin internet.');
  }
  return local;
}

function upsertBody(order: LocalOrder, session: CachedSession) {
  return {
    branchId: session.branchId,
    cashierUserId: session.openedByUserId,
    cashRegisterSessionId: apiSessionId(session.id),
    clientCreatedAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      nameSnapshot: item.nameSnapshot,
      unitPriceCents: item.unitPriceCents,
      qty: item.qty,
      note: item.note,
    })),
  };
}

function applyLocalSend(order: LocalOrder): { order: LocalOrder; kitchen: KitchenTicketPayload | null } {
  const withNumber = ensureDailyNumber(order);
  const lines = kitchenDelta(withNumber.items);
  if (lines.length === 0) {
    return { order: withNumber, kitchen: null };
  }
  const sent = applyKitchenSend(withNumber.items);
  const next: LocalOrder = { ...withNumber, items: sent };
  return {
    order: next,
    kitchen: {
      dailyNumber: next.dailyNumber ?? 0,
      createdAtIso: new Date().toISOString(),
      round: 1,
      tableLabel: next.tableLabel,
      lines: lines.map((line) => ({ name: line.nameSnapshot, qty: line.qty, kind: line.kind })),
    },
  };
}

function receiptFor(order: LocalOrder, method: 'cash' | 'transfer', saleId: string): ReceiptPayload {
  const ctx = loadDeviceContext();
  return {
    organizationName: 'Ordio',
    branchName: ctx?.branchName ?? 'Sucursal',
    saleId,
    dailyNumber: order.dailyNumber,
    createdAtIso: new Date().toISOString(),
    cashierName: ctx?.cashierName ?? 'Cajero',
    tableLabel: order.tableLabel,
    items: order.items
      .filter((item) => item.qty > 0)
      .map((item) => ({
        name: item.nameSnapshot,
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
    totalCents: order.totalCents,
    paymentMethod: method,
    paymentAmountCents: order.totalCents,
  };
}

export async function listOpenChecks(): Promise<OpenCheckSummary[]> {
  const local = checksToSummaries(loadLocalChecks());
  try {
    const remote: OpenCheckSummary[] = await apiFetch('/orders/open');
    const remoteIds = new Set(remote.map((item) => item.id));
    return [...remote, ...local.filter((item) => !remoteIds.has(item.id))];
  } catch {
    return local;
  }
}

export function listPaidSales(): LocalPaidSale[] {
  return loadPaidSales();
}

export async function fetchOrder(id: string): Promise<LocalOrder> {
  try {
    const data: ServerOrder = await apiFetch(`/orders/${id}`);
    const order = orderFromServer(data);
    saveLocalCheck(order);
    if (order.dailyNumber != null) bumpLocalDailyNumber(order.dailyNumber);
    return order;
  } catch (err) {
    const local = findLocalCheck(id);
    if (local) return local;
    const status = (err as { status?: number }).status;
    if (shouldQueueLocally(err) || status === 404) {
      throw new Error('Cuenta no encontrada en este dispositivo.');
    }
    throw err;
  }
}

export async function saveOrder(order: LocalOrder): Promise<LocalOrder> {
  const session = await currentSession();
  const numbered = ensureDailyNumber(order);
  const body = upsertBody(numbered, session);
  try {
    const data: ServerOrder = await apiFetch(`/orders/${numbered.id}`, {
      method: 'PUT',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify(body),
    });
    const saved = orderFromServer(data);
    saveLocalCheck(saved);
    if (saved.dailyNumber != null) bumpLocalDailyNumber(saved.dailyNumber);
    return saved;
  } catch (err) {
    if (!shouldQueueLocally(err)) throw err;
    enqueueOp({ operation: 'upsert_order', path: `/orders/${numbered.id}`, method: 'PUT', body });
    saveLocalCheck(numbered);
    return numbered;
  }
}

export async function sendOrder(order: LocalOrder): Promise<{ order: LocalOrder; kitchen: KitchenTicketPayload | null }> {
  const saved = await saveOrder(order);
  try {
    const data = await apiFetch(`/orders/${saved.id}/send`, {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
    });
    const sent = orderFromServer(data);
    saveLocalCheck(sent);
    return {
      order: sent,
      kitchen: data.kitchen?.lines?.length ? data.kitchen : null,
    };
  } catch (err) {
    if (!shouldQueueLocally(err)) throw err;
    enqueueOp({ operation: 'send_order', path: `/orders/${saved.id}/send`, method: 'POST' });
    const local = applyLocalSend(saved);
    saveLocalCheck(local.order);
    return local;
  }
}

export async function voidOrder(orderId: string): Promise<{ order: LocalOrder; kitchen: KitchenTicketPayload | null }> {
  try {
    const data = await apiFetch(`/orders/${orderId}/void`, {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
    });
    removeLocalCheck(orderId);
    return {
      order: orderFromServer(data),
      kitchen: data.kitchen?.lines?.length ? data.kitchen : null,
    };
  } catch (err) {
    if (!shouldQueueLocally(err)) throw err;
    enqueueOp({ operation: 'void_order', path: `/orders/${orderId}/void`, method: 'POST' });
    const local = findLocalCheck(orderId);
    removeLocalCheck(orderId);
    return { order: local ?? orderFromServer({ id: orderId, dailyNumber: null, tableLabel: null, totalCents: 0, items: [] }), kitchen: null };
  }
}

export async function payOrder(
  order: LocalOrder,
  method: 'cash' | 'transfer',
): Promise<{ order: LocalOrder; sale: { id: string }; kitchen: KitchenTicketPayload | null; receipt: ReceiptPayload }> {
  const session = await currentSession();
  const saved = await saveOrder(order);
  const receipt = receiptFor(saved, method, saved.id);
  try {
    const data = await apiFetch(`/orders/${saved.id}/pay`, {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({
        method,
        amountCents: saved.totalCents,
        cashRegisterSessionId: apiSessionId(session.id),
      }),
    });
    removeLocalCheck(saved.id);
    const paid = orderFromServer(data.order);
    savePaidSale({
      orderId: saved.id,
      dailyNumber: paid.dailyNumber,
      method,
      totalCents: paid.totalCents,
      paidAt: new Date().toISOString(),
      synced: true,
      receipt: { ...receipt, saleId: data.sale?.id ?? saved.id },
      order: paid,
    });
    return {
      order: paid,
      sale: data.sale,
      kitchen: data.kitchen?.lines?.length ? data.kitchen : null,
      receipt: { ...receipt, saleId: data.sale?.id ?? saved.id },
    };
  } catch (err) {
    if (!shouldQueueLocally(err)) throw err;
    enqueueOp({
      operation: 'pay_order',
      path: `/orders/${saved.id}/pay`,
      method: 'POST',
      body: {
        method,
        amountCents: saved.totalCents,
        cashRegisterSessionId: apiSessionId(session.id),
      },
    });
    const local = applyLocalSend(saved);
    removeLocalCheck(saved.id);
    savePaidSale({
      orderId: saved.id,
      dailyNumber: local.order.dailyNumber,
      method,
      totalCents: local.order.totalCents,
      paidAt: new Date().toISOString(),
      synced: false,
      receipt,
      order: local.order,
    });
    return {
      order: local.order,
      sale: { id: saved.id },
      kitchen: local.kitchen,
      receipt,
    };
  }
}

export async function pinProduct(productId: string, isPinned: boolean) {
  try {
    await apiFetch(`/catalog/products/${productId}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned }),
    });
  } catch (err) {
    if (!shouldQueueLocally(err)) throw err;
    enqueueOp({
      operation: 'pin_product',
      path: `/catalog/products/${productId}/pin`,
      method: 'PATCH',
      body: { isPinned },
    });
  }
}
