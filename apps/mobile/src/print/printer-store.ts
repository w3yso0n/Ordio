import { kvGet, kvSet } from '../lib/kv';

export type PrinterTransport = 'bt' | 'ble' | 'dual' | 'unknown';

export type SavedPrinter = {
  name: string;
  address: string;
  deviceType: PrinterTransport;
};

const KEY = 'printer.device';
const ADDRESS_PREFIX = /^(bt|ble|lan|tcp):/i;

export function normalizePrinterAddress(address: string, deviceType?: PrinterTransport): string {
  const trimmed = address.trim();
  if (!trimmed) return trimmed;
  if (ADDRESS_PREFIX.test(trimmed)) {
    return trimmed.replace(/^tcp:/i, 'lan:');
  }
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(trimmed)) {
    return trimmed.includes(':') ? `lan:${trimmed}` : `lan:${trimmed}:9100`;
  }
  if (deviceType === 'ble') return `ble:${trimmed}`;
  return `bt:${trimmed}`;
}

export function getSavedPrinter(): SavedPrinter | null {
  const raw = kvGet(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedPrinter>;
    if (!parsed.address) return null;
    return {
      name: parsed.name?.trim() || 'Impresora',
      address: normalizePrinterAddress(parsed.address, parsed.deviceType),
      deviceType: parsed.deviceType ?? 'bt',
    };
  } catch {
    return null;
  }
}

export function savePrinter(printer: SavedPrinter) {
  kvSet(
    KEY,
    JSON.stringify({
      name: printer.name.trim() || 'Impresora',
      address: normalizePrinterAddress(printer.address, printer.deviceType),
      deviceType: printer.deviceType,
    } satisfies SavedPrinter),
  );
}

export function clearSavedPrinter() {
  kvSet(KEY, '');
}

export function resolvePrinterAddress(): string | null {
  const saved = getSavedPrinter();
  if (saved?.address) return saved.address;
  const env = process.env.EXPO_PUBLIC_PRINTER_ADDRESS?.trim();
  if (env) return normalizePrinterAddress(env);
  return null;
}
