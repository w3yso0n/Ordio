export const ROLES = ['owner', 'admin', 'cashier'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = ['open', 'paid', 'voided'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['cash', 'transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CASH_SESSION_STATUSES = ['open', 'closed'] as const;
export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number];

export const CASH_MOVEMENT_TYPES = ['deposit', 'withdrawal', 'expense'] as const;
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number];

export const PRINT_JOB_STATUSES = ['pending', 'printed', 'failed'] as const;
export type PrintJobStatus = (typeof PRINT_JOB_STATUSES)[number];

export const SYNC_OPERATIONS = [
  'upsert_order',
  'send_order',
  'pay_order',
  'void_order',
  'open_session',
  'close_session',
  'add_movement',
] as const;
export type SyncOperation = (typeof SYNC_OPERATIONS)[number];

export type MoneyCents = number;

export function addCents(...values: MoneyCents[]): MoneyCents {
  return values.reduce((sum, value) => sum + value, 0);
}

export function lineTotalCents(unitPriceCents: MoneyCents, qty: number): MoneyCents {
  return unitPriceCents * qty;
}

export function formatMxn(cents: MoneyCents): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(cents / 100);
}

export type OrderItemInput = {
  id: string;
  productId: string | null;
  nameSnapshot: string;
  unitPriceCents: MoneyCents;
  qty: number;
  sentQty?: number;
  note: string | null;
};

export function recalculateOrderTotals(items: OrderItemInput[]): {
  items: Array<OrderItemInput & { lineTotalCents: MoneyCents }>;
  subtotalCents: MoneyCents;
  totalCents: MoneyCents;
} {
  const nextItems = items.map((item) => ({
    ...item,
    lineTotalCents: lineTotalCents(item.unitPriceCents, item.qty),
  }));
  const subtotalCents = addCents(...nextItems.map((item) => item.lineTotalCents));
  return { items: nextItems, subtotalCents, totalCents: subtotalCents };
}
