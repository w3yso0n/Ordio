export type KitchenLineKind = 'add' | 'void';

export type KitchenDeltaLine = {
  id: string;
  nameSnapshot: string;
  qty: number;
  kind: KitchenLineKind;
};

export type KitchenTicketLine = {
  name: string;
  qty: number;
  kind: KitchenLineKind;
};

export function kitchenDelta(
  items: Array<{ id: string; nameSnapshot: string; qty: number; sentQty: number }>,
): KitchenDeltaLine[] {
  const lines: KitchenDeltaLine[] = [];
  for (const item of items) {
    const delta = item.qty - item.sentQty;
    if (delta > 0) {
      lines.push({ id: item.id, nameSnapshot: item.nameSnapshot, qty: delta, kind: 'add' });
    } else if (delta < 0) {
      lines.push({ id: item.id, nameSnapshot: item.nameSnapshot, qty: -delta, kind: 'void' });
    }
  }
  return lines;
}

export function applyKitchenSend<T extends { qty: number; sentQty: number }>(items: T[]): T[] {
  return items
    .map((item) => ({ ...item, sentQty: item.qty }))
    .filter((item) => item.qty > 0);
}

export function kitchenBanner(lines: Array<{ kind: KitchenLineKind }>, round: number): string | null {
  const hasAdd = lines.some((line) => line.kind === 'add');
  const hasVoid = lines.some((line) => line.kind === 'void');
  if (hasAdd && hasVoid) return 'CAMBIO';
  if (hasVoid) return 'VOID';
  if (round > 1) return 'EXTRA';
  return null;
}
