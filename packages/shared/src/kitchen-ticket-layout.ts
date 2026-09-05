import { kitchenBanner, type KitchenLineKind } from './kitchen';

/** Ancho útil típico en Font A para papel de 80 mm (≈48 caracteres). */
export const KITCHEN_SLIP_CHARS = 48;

/** Ítems van a 4× alto y 2× ancho: caben ~24 caracteres en 80 mm. */
export const KITCHEN_ITEM_CHARS = 24;

/** Ancho de preview en px (80 mm @ ~96 dpi). */
export const KITCHEN_SLIP_PREVIEW_WIDTH = 302;

/** Impresoras baratas no traen acentos: í sale como basura. Mapa explícito a ASCII. */
const ACCENT_MAP: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a',
  Á: 'A', À: 'A', Ä: 'A', Â: 'A', Ã: 'A',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  É: 'E', È: 'E', Ë: 'E', Ê: 'E',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  Í: 'I', Ì: 'I', Ï: 'I', Î: 'I',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o',
  Ó: 'O', Ò: 'O', Ö: 'O', Ô: 'O', Õ: 'O',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  Ú: 'U', Ù: 'U', Ü: 'U', Û: 'U',
  ñ: 'n', Ñ: 'N',
  ç: 'c', Ç: 'C',
  ý: 'y', Ý: 'Y',
  '·': '-',
  '•': '-',
};

export function toPrinterAscii(text: string): string {
  let out = '';
  for (const ch of text) {
    if (Object.prototype.hasOwnProperty.call(ACCENT_MAP, ch)) {
      out += ACCENT_MAP[ch];
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) {
      out += ch;
      continue;
    }
    const plain = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mapped = ACCENT_MAP[plain] ?? (plain.charCodeAt(0) >= 0x20 && plain.charCodeAt(0) <= 0x7e ? plain : '');
    out += mapped;
  }
  return out;
}

export type KitchenSlipBlock =
  | { type: 'spacer'; lines: number }
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
  const label = toPrinterAscii(name.toUpperCase());
  if (kind === 'void') {
    const head = `VOID ${String(qty).padStart(2, ' ')}`;
    const firstWidth = KITCHEN_ITEM_CHARS - head.length - 1;
    const wrapped = wrapText(label, firstWidth);
    const result = [`${head} ${wrapped[0] ?? ''}`.trimEnd()];
    const contIndent = ' '.repeat(head.length + 1);
    for (let i = 1; i < wrapped.length; i++) {
      result.push(`${contIndent}${wrapped[i]}`);
    }
    return result;
  }

  const qtyCol = String(qty).padStart(2, ' ');
  const firstWidth = KITCHEN_ITEM_CHARS - 4;
  const wrapped = wrapText(label, firstWidth);
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
    { type: 'rule' },
    { type: 'title', text: 'COMANDA' },
    { type: 'number', text: `#${payload.dailyNumber}` },
  ];

  if (banner) {
    blocks.push({ type: 'banner', text: toPrinterAscii(banner), tone: bannerTone(banner, payload.round) });
  } else if (payload.round === 1) {
    blocks.push({ type: 'banner', text: 'NUEVO', tone: 'new' });
  }

  const metaParts = [formatTime(payload.createdAtIso), `Ronda ${payload.round}`];
  if (payload.tableLabel) metaParts.unshift(payload.tableLabel);
  blocks.push({ type: 'meta', text: toPrinterAscii(metaParts.join('  ·  ')) });
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
      case 'spacer':
        for (let i = 0; i < block.lines; i++) out.push('');
        break;
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
