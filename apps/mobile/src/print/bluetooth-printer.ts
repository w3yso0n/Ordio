import type { KitchenTicketPayload, PrinterService, ReceiptPayload, PrintResult, PrinterStatus } from '@ordio/shared';
import { encodeEscPosKitchen, encodeEscPosReceipt } from '@ordio/shared';

export class BluetoothPrinterService implements PrinterService {
  constructor(private readonly address?: string) {}

  async printReceipt(payload: ReceiptPayload): Promise<PrintResult> {
    try {
      const bytes = encodeEscPosReceipt(payload);
      console.log('[printer:escpos:receipt]', this.address ?? 'unpaired', bytes.byteLength, 'bytes');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async printKitchenTicket(payload: KitchenTicketPayload): Promise<PrintResult> {
    try {
      const bytes = encodeEscPosKitchen(payload);
      console.log('[printer:escpos:kitchen]', this.address ?? 'unpaired', bytes.byteLength, 'bytes');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    return this.address ? 'ready' : 'disconnected';
  }
}

export function createPrinterService(): PrinterService {
  const address = process.env.EXPO_PUBLIC_PRINTER_ADDRESS;
  if (address) return new BluetoothPrinterService(address);
  return new (require('./mock-printer').MockPrinterService)();
}
