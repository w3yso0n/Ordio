import { BluetoothPrinterService } from './bluetooth-printer';
import { MockPrinterService } from './mock-printer';
import type { PrinterService, PrintResult } from '@ordio/shared';

export function createPrinterService(): PrinterService {
  const address = process.env.EXPO_PUBLIC_PRINTER_ADDRESS;
  if (address) return new BluetoothPrinterService(address);
  return new MockPrinterService();
}

export const printer = createPrinterService();

export async function tryPrint(task: () => Promise<PrintResult | void>): Promise<void> {
  try {
    await task();
  } catch {
    /* La impresora es opcional: la venta no depende de ella. */
  }
}
