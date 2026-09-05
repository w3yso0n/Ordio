import { Alert, Platform } from 'react-native';
import { BluetoothPrinterService } from './bluetooth-printer';
import { MockPrinterService } from './mock-printer';
import type { PrinterService, PrintResult } from '@ordio/shared';

export function createPrinterService(): PrinterService {
  if (Platform.OS === 'web') return new MockPrinterService();
  return new BluetoothPrinterService();
}

export const printer = createPrinterService();

export async function tryPrint(task: () => Promise<PrintResult | void>): Promise<void> {
  try {
    const result = await task();
    if (result && 'ok' in result && result.ok === false && result.error) {
      Alert.alert('No se imprimió', result.error);
    }
  } catch (err) {
    Alert.alert('No se imprimió', (err as Error).message || 'Revisa la impresora Bluetooth.');
  }
}
