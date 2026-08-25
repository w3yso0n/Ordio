import { randomUUID } from 'expo-crypto';
import { recalculateOrderTotals, type OrderItemInput } from '@ordio/shared';

export type LocalOrderItem = OrderItemInput & { lineTotalCents: number; sentQty: number };

export type LocalOrder = {
  id: string;
  dailyNumber: number | null;
  tableLabel: string | null;
  items: LocalOrderItem[];
  subtotalCents: number;
  totalCents: number;
  createdAt: string;
};

export function emptyOrder(): LocalOrder {
  const totals = recalculateOrderTotals([]);
  return { id: randomUUID(), dailyNumber: null, tableLabel: null, createdAt: new Date().toISOString(), ...totals, items: [] };
}

export function orderFromServer(data: {
  id: string;
  dailyNumber: number | null;
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
}): LocalOrder {
  const items = data.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    nameSnapshot: item.nameSnapshot,
    unitPriceCents: item.unitPriceCents,
    qty: item.qty,
    sentQty: item.sentQty,
    note: item.note,
    lineTotalCents: item.lineTotalCents,
  }));
  const totals = recalculateOrderTotals(items);
  return {
    id: data.id,
    dailyNumber: data.dailyNumber,
    tableLabel: data.tableLabel,
    createdAt: data.createdAt ?? new Date().toISOString(),
    ...totals,
    items: totals.items.map((item) => ({ ...item, sentQty: item.sentQty ?? 0 })),
  };
}

export function pendingKitchenQty(order: LocalOrder): number {
  return order.items.reduce((sum, item) => sum + Math.max(0, item.qty - item.sentQty), 0);
}

export function addItem(
  order: LocalOrder,
  product: { id: string; name: string; priceCents: number },
): LocalOrder {
  const existing = order.items.find((item) => item.productId === product.id && !item.note);
  const items = existing
    ? order.items.map((item) =>
        item.id === existing.id ? { ...item, qty: item.qty + 1 } : item,
      )
    : [
        ...order.items,
        {
          id: randomUUID(),
          productId: product.id,
          nameSnapshot: product.name,
          unitPriceCents: product.priceCents,
          qty: 1,
          sentQty: 0,
          note: null,
        },
      ];
  const totals = recalculateOrderTotals(items);
  return {
    ...order,
    ...totals,
    items: totals.items.map((item) => ({
      ...item,
      sentQty: items.find((row) => row.id === item.id)?.sentQty ?? 0,
    })),
  };
}

export function setItemQty(order: LocalOrder, itemId: string, qty: number): LocalOrder {
  const nextQty = Math.max(0, Math.floor(qty));
  const items =
    nextQty === 0
      ? order.items.filter((item) => item.id !== itemId)
      : order.items.map((item) => (item.id === itemId ? { ...item, qty: nextQty } : item));
  const totals = recalculateOrderTotals(items);
  return {
    ...order,
    ...totals,
    items: totals.items.map((item) => ({
      ...item,
      sentQty: items.find((row) => row.id === item.id)?.sentQty ?? 0,
    })),
  };
}
