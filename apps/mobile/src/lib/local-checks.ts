import type { ReceiptPayload } from '@ordio/shared';
import { kvGetJson, kvSetJson } from './kv';
import { pendingKitchenQty } from './order-engine';
import type { LocalOrder } from './order-engine';

export type OpenCheckSummary = {
  id: string;
  dailyNumber: number | null;
  tableLabel: string | null;
  totalCents: number;
  itemCount: number;
  pendingKitchenQty: number;
  createdAt: string;
};

export type DeviceContext = {
  branchId: string;
  deviceId?: string;
  branchName?: string;
  cashierUserId?: string;
  cashierName?: string;
};

export type LocalPaidSale = {
  orderId: string;
  dailyNumber: number | null;
  method: 'cash' | 'transfer';
  totalCents: number;
  paidAt: string;
  synced: boolean;
  receipt: ReceiptPayload;
  order: LocalOrder;
};

const CHECKS_KEY = 'open_checks';
const SESSION_KEY = 'cash_session';
const DAILY_KEY = 'local_daily_number';
const DEVICE_KEY = 'device_context';
const PAID_KEY = 'paid_sales';

export type CachedSession = {
  id: string;
  branchId: string;
  openedByUserId: string;
};

export function loadCachedSession(): CachedSession | null {
  return kvGetJson<CachedSession>(SESSION_KEY);
}

export function saveCachedSession(session: CachedSession) {
  kvSetJson(SESSION_KEY, session);
}

export function loadLocalChecks(): LocalOrder[] {
  return kvGetJson<LocalOrder[]>(CHECKS_KEY) ?? [];
}

export function saveLocalCheck(order: LocalOrder) {
  const next = loadLocalChecks().filter((item) => item.id !== order.id);
  next.push(order);
  kvSetJson(CHECKS_KEY, next);
}

export function removeLocalCheck(orderId: string) {
  kvSetJson(
    CHECKS_KEY,
    loadLocalChecks().filter((item) => item.id !== orderId),
  );
}

export function findLocalCheck(orderId: string): LocalOrder | null {
  return loadLocalChecks().find((item) => item.id === orderId) ?? null;
}

export function nextLocalDailyNumber(): number {
  const current = Number(kvGetJson<number>(DAILY_KEY) ?? 0);
  const next = current + 1;
  kvSetJson(DAILY_KEY, next);
  return next;
}

export function bumpLocalDailyNumber(value: number) {
  const current = Number(kvGetJson<number>(DAILY_KEY) ?? 0);
  if (value > current) kvSetJson(DAILY_KEY, value);
}

export function ensureDailyNumber(order: LocalOrder): LocalOrder {
  if (order.dailyNumber != null) return order;
  return { ...order, dailyNumber: nextLocalDailyNumber() };
}

export function loadDeviceContext(): DeviceContext | null {
  return kvGetJson<DeviceContext>(DEVICE_KEY);
}

export function saveDeviceContext(patch: Partial<DeviceContext> & { branchId?: string }) {
  const current = loadDeviceContext();
  const branchId = patch.branchId ?? current?.branchId;
  if (!branchId) return;
  kvSetJson(DEVICE_KEY, { ...current, ...patch, branchId });
}

export function fallbackSession(): CachedSession | null {
  const cached = loadCachedSession();
  if (cached?.id && cached.id !== 'offline-pending') return cached;
  const ctx = loadDeviceContext();
  if (!ctx?.branchId) return cached;
  return {
    id: cached?.id ?? 'offline-pending',
    branchId: ctx.branchId,
    openedByUserId: ctx.cashierUserId ?? ctx.deviceId ?? 'offline',
  };
}

export function loadPaidSales(): LocalPaidSale[] {
  return kvGetJson<LocalPaidSale[]>(PAID_KEY) ?? [];
}

export function savePaidSale(sale: LocalPaidSale) {
  const next = loadPaidSales().filter((item) => item.orderId !== sale.orderId);
  next.unshift(sale);
  kvSetJson(PAID_KEY, next.slice(0, 80));
}

export function markPaidSynced(orderId: string) {
  kvSetJson(
    PAID_KEY,
    loadPaidSales().map((item) => (item.orderId === orderId ? { ...item, synced: true } : item)),
  );
}

export function findPaidSale(orderId: string): LocalPaidSale | null {
  return loadPaidSales().find((item) => item.orderId === orderId) ?? null;
}

export function checksToSummaries(orders: LocalOrder[]): OpenCheckSummary[] {
  return orders
    .map((order) => ({
      id: order.id,
      dailyNumber: order.dailyNumber,
      tableLabel: order.tableLabel,
      totalCents: order.totalCents,
      itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
      pendingKitchenQty: pendingKitchenQty(order),
      createdAt: order.createdAt ?? new Date().toISOString(),
    }))
    .sort((a, b) => (a.dailyNumber ?? 9999) - (b.dailyNumber ?? 9999));
}
