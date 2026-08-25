import type {
  KitchenTicketPayload,
  PrinterService,
  ReceiptPayload,
  PrintResult,
  PrinterStatus,
} from '@ordio/shared';
import { kitchenSlipPlainLines, receiptSlipPlainLines } from '@ordio/shared';

export class MockPrinterService implements PrinterService {
  async printReceipt(payload: ReceiptPayload): Promise<PrintResult> {
    console.log('[printer:mock:receipt]\n' + receiptSlipPlainLines(payload).join('\n'));
    return { ok: true };
  }

  async printKitchenTicket(payload: KitchenTicketPayload): Promise<PrintResult> {
    console.log('[printer:mock:kitchen]\n' + kitchenSlipPlainLines(payload).join('\n'));
    return { ok: true };
  }

  async getStatus(): Promise<PrinterStatus> {
    return 'mock';
  }
}
