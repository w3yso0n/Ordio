import { formatMxn } from './money';

export const RECEIPT_SLIP_CHARS = 48;

export type ReceiptSlipBlock =
  | { type: 'title'; text: string }
  | { type: 'number'; text: string }
  | { type: 'banner'; text: string }
  | { type: 'meta'; text: string }
  | { type: 'rule' }
  | { type: 'itemName'; text: string }
  | { type: 'itemPrice'; left: string; right: string }
  | { type: 'total'; text: string }
  | { type: 'pay'; text: string }
  | { type: 'footer'; text: string };

export type ReceiptSlipInput = {
  organizationName: string;
  branchName: string;
  dailyNumber?: number | null;
  saleId: string;
  createdAtIso: string;
  cashierName?: string;
  tableLabel?: string | null;
  items: Array<{
    name: string;
    qty: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  totalCents: number;
  paymentMethod: 'cash' | 'transfer';
  paymentAmountCents: number;
};

function ruleLine(): string {
  return '-'.repeat(RECEIPT_SLIP_CHARS);
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return `${' '.repeat(pad)}${text}`;
}

function moneyLine(left: string, right: string, width = RECEIPT_SLIP_CHARS): string {
  const gap = Math.max(1, width - left.length - right.length);
  return `${left}${' '.repeat(gap)}${right}`.slice(0, width);
}

function wrapName(qty: number, name: string): string[] {
  const head = `${qty}  `;
  const width = RECEIPT_SLIP_CHARS - head.length;
  const words = name.trim().toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) current = next;
    else {
      if (current) lines.push(current);
      current = word.slice(0, width);
    }
  }
  if (current) lines.push(current);
  return lines.map((line, index) => (index === 0 ? `${head}${line}` : `${' '.repeat(head.length)}${line}`));
}

function payLabel(method: 'cash' | 'transfer') {
  return method === 'cash' ? 'Efectivo' : 'Transferencia';
}

export function buildReceiptSlip(payload: ReceiptSlipInput): ReceiptSlipBlock[] {
  const items = payload.items.filter((item) => item.qty > 0);
  const when = new Date(payload.createdAtIso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const blocks: ReceiptSlipBlock[] = [
    { type: 'title', text: payload.organizationName.toUpperCase() },
    { type: 'meta', text: payload.branchName },
    { type: 'title', text: 'CUENTA' },
  ];
  if (payload.dailyNumber != null) {
    blocks.push({ type: 'number', text: `#${payload.dailyNumber}` });
  }
  blocks.push({ type: 'banner', text: 'PAGADO' });
  const meta = [when];
  if (payload.tableLabel) meta.unshift(payload.tableLabel);
  blocks.push({ type: 'meta', text: meta.join('  ·  ') });
  blocks.push({ type: 'rule' });

  for (const item of items) {
    const names = wrapName(item.qty, item.name);
    for (const row of names) blocks.push({ type: 'itemName', text: row });
    blocks.push({
      type: 'itemPrice',
      left: `${formatMxn(item.unitPriceCents)} c/u`,
      right: formatMxn(item.lineTotalCents),
    });
  }

  blocks.push({ type: 'rule' });
  blocks.push({ type: 'total', text: moneyLine('TOTAL', formatMxn(payload.totalCents)) });
  blocks.push({
    type: 'pay',
    text: moneyLine(payLabel(payload.paymentMethod), formatMxn(payload.paymentAmountCents)),
  });
  if (payload.cashierName) {
    blocks.push({ type: 'meta', text: `Cajero: ${payload.cashierName}` });
  }
  blocks.push({ type: 'rule' });
  blocks.push({ type: 'footer', text: 'Gracias por su compra' });
  return blocks;
}

export function receiptSlipPlainLines(payload: ReceiptSlipInput): string[] {
  const out: string[] = [];
  for (const block of buildReceiptSlip(payload)) {
    switch (block.type) {
      case 'title':
      case 'number':
      case 'banner':
      case 'meta':
      case 'footer':
        out.push(centerText(block.text, RECEIPT_SLIP_CHARS));
        break;
      case 'rule':
        out.push(ruleLine());
        break;
      case 'itemName':
        out.push(block.text);
        break;
      case 'itemPrice':
        out.push(moneyLine(block.left, block.right));
        break;
      case 'total':
      case 'pay':
        out.push(block.text);
        break;
    }
  }
  return out;
}

export { ruleLine as receiptRuleLine };
