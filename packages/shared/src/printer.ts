import type { KitchenLineKind } from './kitchen';
import { buildKitchenSlip, formatItemLines, ruleLine, toPrinterAscii } from './kitchen-ticket-layout';
import { receiptSlipPlainLines } from './receipt-ticket-layout';

export type PrinterStatus = 'ready' | 'disconnected' | 'mock';

export type ReceiptItem = {
  name: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type ReceiptPayload = {
  organizationName: string;
  branchName: string;
  saleId: string;
  dailyNumber?: number | null;
  createdAtIso: string;
  cashierName: string;
  tableLabel?: string | null;
  items: ReceiptItem[];
  totalCents: number;
  paymentMethod: 'cash' | 'transfer';
  paymentAmountCents: number;
};

export type PrintResult = { ok: boolean; error?: string };

export type KitchenTicketPayload = {
  dailyNumber: number;
  createdAtIso: string;
  round: number;
  tableLabel?: string | null;
  lines: Array<{ name: string; qty: number; kind: KitchenLineKind }>;
};

export interface PrinterService {
  printReceipt(payload: ReceiptPayload): Promise<PrintResult>;
  printKitchenTicket(payload: KitchenTicketPayload): Promise<PrintResult>;
  getStatus(): Promise<PrinterStatus>;
}

export const CERTIFIED_PRINTERS = [
  { id: 'epson-tm-t20', brand: 'Epson', model: 'TM-T20', paperMm: 80 },
  { id: 'epson-tm-m30', brand: 'Epson', model: 'TM-m30', paperMm: 80 },
  { id: 'generic-80mm', brand: 'Generic', model: 'ESC/POS 80mm', paperMm: 80 },
] as const;

export type CertifiedPrinterId = (typeof CERTIFIED_PRINTERS)[number]['id'];

function encodePrinterText(text: string): number[] {
  const ascii = toPrinterAscii(text);
  const bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    if (code >= 0x20 && code <= 0x7e) bytes.push(code);
  }
  return bytes;
}

export function encodeEscPosReceipt(payload: ReceiptPayload): Uint8Array {
  const ESC = 0x1b;
  const GS = 0x1d;
  const init = [ESC, 0x40];
  const center = [ESC, 0x61, 0x01];
  const left = [ESC, 0x61, 0x00];
  const cut = [GS, 0x56, 0x41, 0x10];
  const lf = [0x0a];
  const line = (text: string) => [...encodePrinterText(text), ...lf];

  const bytes: number[] = [...init];
  const push = (...parts: number[][]) => bytes.push(...parts.flat());
  for (const row of receiptSlipPlainLines(payload)) {
    const centered = row.trimStart().length > 0 && row.startsWith(' ');
    if (centered) push(center, line(row.trim()), left);
    else push(left, line(row));
  }
  push(lf, lf, cut);
  return Uint8Array.from(bytes);
}

export function encodeEscPosKitchen(payload: KitchenTicketPayload): Uint8Array {
  const ESC = 0x1b;
  const GS = 0x1d;
  const init = [ESC, 0x40];
  const center = [ESC, 0x61, 0x01];
  const left = [ESC, 0x61, 0x00];
  const boldOn = [ESC, 0x45, 0x01];
  const boldOff = [ESC, 0x45, 0x00];
  /** Número y banners: ancho y alto x2. */
  const doubleOn = [GS, 0x21, 0x11];
  /** Ítems: alto x4 y ancho x2 (el doble de alto que antes). */
  const itemSizeOn = [GS, 0x21, 0x13];
  const sizeOff = [GS, 0x21, 0x00];
  const cut = [GS, 0x56, 0x41, 0x30];
  const lf = [0x0a];
  const line = (text: string) => [...encodePrinterText(text), ...lf];

  const blocks = buildKitchenSlip(payload);
  const bytes: number[] = [];
  const push = (...parts: number[][]) => bytes.push(...parts.flat());

  push(init);
  for (const block of blocks) {
    switch (block.type) {
      case 'spacer':
        for (let i = 0; i < block.lines; i++) push(lf);
        break;
      case 'title':
        push(center, boldOn, line(block.text), boldOff);
        break;
      case 'number':
        push(center, boldOn, doubleOn, line(block.text), sizeOff, boldOff);
        break;
      case 'banner':
        push(center, boldOn, doubleOn, line(block.text), sizeOff, boldOff);
        break;
      case 'meta':
        push(center, line(block.text));
        break;
      case 'rule':
        push(left, line(ruleLine()));
        break;
      case 'item':
        push(left, itemSizeOn);
        if (block.kind === 'add') push(boldOn);
        for (const row of formatItemLines(block.qty, block.name, block.kind)) {
          push(line(row));
        }
        if (block.kind === 'add') push(boldOff);
        push(sizeOff, lf);
        break;
    }
  }
  push(left, lf, lf, cut);
  return Uint8Array.from(bytes);
}

export { kitchenSlipPlainLines, buildKitchenSlip, KITCHEN_SLIP_CHARS, KITCHEN_SLIP_PREVIEW_WIDTH } from './kitchen-ticket-layout';
export type { KitchenSlipBlock, KitchenSlipInput } from './kitchen-ticket-layout';
