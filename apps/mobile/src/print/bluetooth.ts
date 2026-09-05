import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import type { PrinterTransport } from './printer-store';
import { normalizePrinterAddress } from './printer-store';

export type DiscoveredPrinter = {
  name: string;
  address: string;
  deviceType: PrinterTransport;
  rssi?: number;
};

type Driver = typeof import('react-native-thermal-printer-driver').default;

let driver: Driver | null | undefined;
let printQueue: Promise<void> = Promise.resolve();

function getDriver(): Driver | null {
  if (driver !== undefined) return driver;
  if (Platform.OS === 'web') {
    driver = null;
    return null;
  }
  try {
    driver = require('react-native-thermal-printer-driver').default as Driver;
    return driver;
  } catch {
    driver = null;
    return null;
  }
}

export function isNativePrinterAvailable(): boolean {
  return getDriver() != null;
}

export function nativePrinterUnavailableReason(): string | null {
  if (Platform.OS === 'web') return 'La impresora Bluetooth solo funciona en el teléfono.';
  if (!isNativePrinterAvailable()) {
    return 'Esta función necesita un development build. Expo Go no incluye Bluetooth Classic.';
  }
  return null;
}

export async function requestPrinterPermissions(mode: 'scan' | 'connect' = 'connect'): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdk = typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);
  if (sdk >= 31) {
    const perms: Permission[] =
      mode === 'scan'
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]
        : [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT];
    const result = await PermissionsAndroid.requestMultiple(perms);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
      (mode === 'connect' || result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED)
    );
  }
  if (mode === 'connect') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function printerErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';
  return messageForCode(code, message);
}

function messageForCode(code: string, fallback: string): string {
  switch (code) {
    case 'BLUETOOTH_DISABLED':
    case 'BT_DISABLED':
      return 'Enciende el Bluetooth del teléfono.';
    case 'BLUETOOTH_NOT_SUPPORTED':
    case 'BT_NOT_SUPPORTED':
      return 'Este teléfono no tiene Bluetooth.';
    case 'BLUETOOTH_PERMISSION_DENIED':
    case 'BT_PERMISSION':
      return 'Falta permiso de Bluetooth. Actívalo en Ajustes.';
    case 'DEVICE_NOT_FOUND':
      return 'No se encontró la impresora. Acércate o emparéjala en Bluetooth.';
    case 'CONNECTION_FAILED':
      return 'No se pudo conectar. ¿Está encendida, cerca y emparejada?';
    case 'CONNECTION_TIMEOUT':
      return 'La impresora no respondió. Reintenta.';
    case 'CONNECTION_LOST':
      return 'Se perdió la conexión con la impresora.';
    case 'WRITE_FAILED':
      return 'Se conectó, pero no se pudo enviar el ticket.';
    case 'PRINT_TIMEOUT':
      return 'La impresión tardó demasiado.';
    case 'SCAN_FAILED':
    case 'SCAN_TIMEOUT':
    case 'SCAN_ERROR':
      return 'No se pudieron buscar impresoras. Revisa Bluetooth y ubicación.';
    case 'INVALID_ADDRESS':
      return 'La dirección de la impresora no es válida.';
    default:
      return fallback || 'No se pudo hablar con la impresora.';
  }
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = printQueue.then(task, task);
  printQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function scanPrinters(): Promise<{ paired: DiscoveredPrinter[]; found: DiscoveredPrinter[] }> {
  const native = getDriver();
  if (!native) throw new Error(nativePrinterUnavailableReason() ?? 'Impresora no disponible.');
  const allowed = await requestPrinterPermissions('scan');
  if (!allowed) throw new Error('Falta permiso de Bluetooth. Actívalo en Ajustes.');
  try {
    const result = await native.scan();
    return {
      paired: (result.paired ?? []).map(toDiscovered),
      found: (result.found ?? []).map(toDiscovered),
    };
  } catch (err) {
    throw new Error(printerErrorMessage(err));
  }
}

export async function connectPrinter(device: Pick<DiscoveredPrinter, 'address' | 'deviceType'>): Promise<string> {
  const native = getDriver();
  if (!native) throw new Error(nativePrinterUnavailableReason() ?? 'Impresora no disponible.');
  const allowed = await requestPrinterPermissions('connect');
  if (!allowed) throw new Error('Falta permiso de Bluetooth. Actívalo en Ajustes.');
  const address = normalizePrinterAddress(device.address, device.deviceType);
  try {
    await native.connect(address, { timeout: 12_000 });
    return address;
  } catch (err) {
    if (device.deviceType === 'dual' || device.deviceType === 'unknown') {
      const ble = normalizePrinterAddress(stripScheme(device.address), 'ble');
      try {
        await native.connect(ble, { timeout: 12_000 });
        return ble;
      } catch {
        /* keep the original error */
      }
    }
    throw new Error(printerErrorMessage(err));
  }
}

export async function disconnectPrinter(address?: string): Promise<void> {
  const native = getDriver();
  if (!native) return;
  try {
    await native.disconnect(address);
  } catch {
    /* ignore */
  }
}

export async function printRawBytes(address: string, bytes: Uint8Array | number[]): Promise<void> {
  const native = getDriver();
  if (!native) throw new Error(nativePrinterUnavailableReason() ?? 'Impresora no disponible.');
  const allowed = await requestPrinterPermissions('connect');
  if (!allowed) throw new Error('Falta permiso de Bluetooth. Actívalo en Ajustes.');
  const payload = Array.from(bytes);
  await enqueue(async () => {
    const result = await native.printRaw(address, payload, { keepAlive: true, timeout: 20_000 });
    if (!result?.success) {
      const error = result?.error as unknown;
      const message =
        typeof error === 'string'
          ? error
          : error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'No se pudo imprimir.';
      const code =
        error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
      throw new Error(printerErrorMessage({ code, message }));
    }
  });
}

export async function printTestPage(address: string): Promise<void> {
  const line = (text: string) => [...text].map((char) => char.charCodeAt(0) & 0xff).concat(0x0a);
  const bytes = [
    0x1b, 0x40,
    0x1b, 0x61, 0x01,
    ...line('ORDIO'),
    ...line('Prueba de impresora'),
    0x0a, 0x0a, 0x0a,
    0x1d, 0x56, 0x41, 0x10,
  ];
  await printRawBytes(address, bytes);
}

function stripScheme(address: string): string {
  return address.replace(/^(bt|ble|lan|tcp):/i, '');
}

function toDiscovered(device: { name?: string; address: string; deviceType?: string; rssi?: number }): DiscoveredPrinter {
  const deviceType: PrinterTransport =
    device.deviceType === 'ble' || device.deviceType === 'bt' || device.deviceType === 'dual' ? device.deviceType : 'unknown';
  return {
    name: device.name?.trim() || 'Impresora',
    address: normalizePrinterAddress(device.address, deviceType),
    deviceType,
    rssi: device.rssi,
  };
}
