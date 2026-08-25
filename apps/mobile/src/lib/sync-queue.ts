import { randomUUID } from 'expo-crypto';
import { queueDone, queueFail, queueInsert, queuePending, queuePendingCount, queueUpdatePayload } from '../db/client.native';
import { API, authHeaders, ensureAccessToken } from './api';
import { markPaidSynced, saveCachedSession } from './local-checks';
import { isNetworkError } from './network';

export type QueuedOp = {
  id: string;
  operation: 'upsert_order' | 'send_order' | 'pay_order' | 'void_order' | 'pin_product';
  path: string;
  method: 'PUT' | 'POST' | 'PATCH';
  body?: unknown;
  idempotencyKey: string;
};

export function enqueueOp(op: Omit<QueuedOp, 'id' | 'idempotencyKey'> & { idempotencyKey?: string }) {
  const pending = queuePending();
  for (const row of pending) {
    try {
      const existing = JSON.parse(row.payload) as QueuedOp;
      if (existing.operation === op.operation && existing.path === op.path) {
        const next: QueuedOp = {
          ...existing,
          method: op.method,
          body: op.body,
        };
        queueUpdatePayload(row.id, JSON.stringify(next));
        return;
      }
    } catch {
      /* ignore broken row */
    }
  }
  const row: QueuedOp = {
    id: randomUUID(),
    idempotencyKey: op.idempotencyKey ?? randomUUID(),
    operation: op.operation,
    path: op.path,
    method: op.method,
    body: op.body,
  };
  queueInsert({
    id: row.id,
    operation: row.operation,
    idempotencyKey: row.idempotencyKey,
    payload: JSON.stringify(row),
  });
}

export function pendingCount(): number {
  return queuePendingCount();
}

function orderIdFromPath(path: string) {
  const match = path.match(/^\/orders\/([^/]+)/);
  return match?.[1] ?? null;
}

async function liveCashSession() {
  const token = await ensureAccessToken('cashier');
  if (!token) return null;
  try {
    const res = await fetch(`${API}/cash/sessions/current`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.id) return null;
    const cached = {
      id: data.id as string,
      branchId: data.branchId as string,
      openedByUserId: data.openedByUserId as string,
    };
    saveCachedSession(cached);
    return cached;
  } catch {
    return null;
  }
}

export async function flushSyncQueue(): Promise<number> {
  const token = await ensureAccessToken('cashier');
  if (!token) return 0;

  const rows = queuePending();
  if (rows.length === 0) return 0;

  const session = await liveCashSession();
  let flushed = 0;

  for (const row of rows) {
    const op = JSON.parse(row.payload) as QueuedOp;
    const body =
      op.body && typeof op.body === 'object'
        ? ({ ...(op.body as Record<string, unknown>) } as Record<string, unknown>)
        : undefined;

    if (body && (op.operation === 'upsert_order' || op.operation === 'pay_order')) {
      if (!session?.id) {
        queueFail(row.id, 'Abre la caja desde el panel para subir estas ventas.');
        continue;
      }
      body.cashRegisterSessionId = session.id;
      if (op.operation === 'upsert_order') {
        body.branchId = session.branchId;
        body.cashierUserId = session.openedByUserId;
      }
    }

    try {
      const headers = await authHeaders(
        body
          ? { 'Content-Type': 'application/json', 'Idempotency-Key': op.idempotencyKey }
          : { 'Idempotency-Key': op.idempotencyKey },
      );
      if (!headers.Authorization) break;
      const res = await fetch(`${API}${op.path}`, {
        method: op.method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          typeof data?.message === 'string' ? data.message : `Error ${res.status}`;
        queueFail(row.id, message);
        if (/caja abierta/i.test(message)) continue;
        continue;
      }
      queueDone(row.id);
      if (op.operation === 'pay_order') {
        const orderId = orderIdFromPath(op.path);
        if (orderId) markPaidSynced(orderId);
      }
      flushed += 1;
    } catch (err) {
      if (isNetworkError(err)) break;
      queueFail(row.id, (err as Error).message);
    }
  }
  return flushed;
}
