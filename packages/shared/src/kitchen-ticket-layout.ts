import { kitchenBanner, type KitchenLineKind } from './kitchen';

/** Ancho útil típico en Font A para papel de 80 mm (≈48 caracteres). */
export const KITCHEN_SLIP_CHARS = 48;

/** Con tamaño EXTRA (ancho x2) caben ~24 caracteres en 80 mm. */
export const KITCHEN_ITEM_CHARS = 24;

/** Ancho de preview en px (80 mm @ ~96 dpi). */
export const KITCHEN_SLIP_PREVIEW_WIDTH = 302;

export type KitchenSlipBlock =
  | { type: 'title'; text: string }
  | { type: 'number'; text: string }
  | { type: 'banner'; text: string; tone: 'extra' | 'void' | 'change' | 'new' }
  | { type: 'meta'; text: string }
  | { type: 'rule' }
  | { type: 'item'; qty: number; name: string; kind: KitchenLineKind };

export type KitchenSlipInput = {
  dailyNumber: number;
  createdAtIso: string;
  round: number;
  tableLabel?: string | null;
  lines: Array<{ name: string; qty: number; kind: KitchenLineKind }>;
};

function ruleLine(): string {
  return '-'.repeat(KITCHEN_SLIP_CHARS);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function wrapText(text: string, width: number, indent = ''): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = indent;
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = `${indent}${word}`.slice(0, width);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function formatItemLines(qty: number, name: string, kind: KitchenLineKind): string[] {
  if (kind === 'void') {
    const head = `VOID ${String(qty).padStart(2, ' ')}`;
    const firstWidth = KITCHEN_ITEM_CHARS - head.length - 1;
    const wrapped = wrapText(name.toUpperCase(), firstWidth);
    const result = [`${head} ${wrapped[0] ?? ''}`.trimEnd()];
    const contIndent = ' '.repeat(head.length + 1);
    for (let i = 1; i < wrapped.length; i++) {
      result.push(`${contIndent}${wrapped[i]}`);
    }
    return result;
  }

  const qtyCol = String(qty).padStart(2, ' ');
  const firstWidth = KITCHEN_ITEM_CHARS - 4;
  const wrapped = wrapText(name.toUpperCase(), firstWidth);
  const result = [`${qtyCol}  ${wrapped[0] ?? ''}`.trimEnd()];
  const contIndent = '     ';
  for (let i = 1; i < wrapped.length; i++) {
    result.push(`${contIndent}${wrapped[i]}`);
  }
  return result;
}

function bannerTone(
  banner: string | null,
  round: number,
): 'extra' | 'void' | 'change' | 'new' {
  if (!banner) return round === 1 ? 'new' : 'extra';
  if (banner === 'VOID') return 'void';
  if (banner === 'CAMBIO') return 'change';
  return 'extra';
}

export function buildKitchenSlip(payload: KitchenSlipInput): KitchenSlipBlock[] {
  const banner = kitchenBanner(payload.lines, payload.round);
  const blocks: KitchenSlipBlock[] = [
    { type: 'title', text: 'COMANDA' },
    { type: 'number', text: `#${payload.dailyNumber}` },
  ];

  if (banner) {
    blocks.push({ type: 'banner', text: banner, tone: bannerTone(banner, payload.round) });
  } else if (payload.round === 1) {
    blocks.push({ type: 'banner', text: 'NUEVO', tone: 'new' });
  }

  const metaParts = [formatTime(payload.createdAtIso), `Ronda ${payload.round}`];
  if (payload.tableLabel) metaParts.unshift(payload.tableLabel);
  blocks.push({ type: 'meta', text: metaParts.join('  ·  ') });
  blocks.push({ type: 'rule' });

  const adds = payload.lines.filter((line) => line.kind === 'add');
  const voids = payload.lines.filter((line) => line.kind === 'void');

  for (const line of adds) {
    blocks.push({ type: 'item', qty: line.qty, name: line.name, kind: 'add' });
  }

  if (adds.length > 0 && voids.length > 0) {
    blocks.push({ type: 'rule' });
  }

  for (const line of voids) {
    blocks.push({ type: 'item', qty: line.qty, name: line.name, kind: 'void' });
  }

  blocks.push({ type: 'rule' });
  return blocks;
}

/** Líneas planas tal como saldrían en la impresora (para logs y ESC/POS). */
export function kitchenSlipPlainLines(payload: KitchenSlipInput): string[] {
  const out: string[] = [];
  for (const block of buildKitchenSlip(payload)) {
    switch (block.type) {
      case 'title':
        out.push(centerText(block.text, KITCHEN_SLIP_CHARS));
        break;
      case 'number':
        out.push(centerText(block.text, KITCHEN_SLIP_CHARS));
        break;
      case 'banner':
        out.push(centerText(block.text, KITCHEN_SLIP_CHARS));
        break;
      case 'meta':
        out.push(centerText(block.text, KITCHEN_SLIP_CHARS));
        break;
      case 'rule':
        out.push(ruleLine());
        break;
      case 'item':
        out.push(...formatItemLines(block.qty, block.name, block.kind));
        break;
    }
  }
  return out;
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return `${' '.repeat(pad)}${text}`;
}

export { formatItemLines, ruleLine };
