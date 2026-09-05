import type { KitchenTicketPayload, PrinterService, ReceiptPayload, PrintResult, PrinterStatus } from '@ordio/shared';
import { encodeEscPosKitchen, encodeEscPosReceipt } from '@ordio/shared';
import { isNativePrinterAvailable, printRawBytes } from './bluetooth';
import { resolvePrinterAddress } from './printer-store';

export class BluetoothPrinterService implements PrinterService {
  async printReceipt(payload: ReceiptPayload): Promise<PrintResult> {
    return this.send(encodeEscPosReceipt(payload));
  }

  async printKitchenTicket(payload: KitchenTicketPayload): Promise<PrintResult> {
    return this.send(encodeEscPosKitchen(payload));
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!isNativePrinterAvailable()) return 'mock';
    return resolvePrinterAddress() ? 'ready' : 'disconnected';
  }

  private async send(bytes: Uint8Array): Promise<PrintResult> {
    const address = resolvePrinterAddress();
    if (!address) return { ok: true };
    if (!isNativePrinterAvailable()) {
      return { ok: false, error: 'Esta caja necesita un development build para imprimir por Bluetooth.' };
    }
    try {
      await printRawBytes(address, bytes);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
