import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { formatMxn, type ReceiptPayload } from '@ordio/shared';
import { payOrder } from '../lib/orders-api';
import { printer, tryPrint } from '../print';
import { clearTicket, useTicket } from '../lib/ticket-store';
import { Button } from '../ui/button';
import { Money } from '../ui/money';
import { ReceiptTicketModal } from '../ui/receipt-ticket-modal';
import { Screen } from '../ui/screen';
import { colors, space, type } from '../theme';

export default function ChargeScreen() {
  const order = useTicket();
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const label = order.dailyNumber != null ? `Cuenta #${order.dailyNumber}` : 'Cobrar';

  async function pay(method: 'cash' | 'transfer') {
    if (busy) return;
    setBusy(true);
    try {
      const result = await payOrder(order, method);
      await tryPrint(async () => {
        if (result.kitchen) await printer.printKitchenTicket(result.kitchen);
        await printer.printReceipt(result.receipt);
      });
      clearTicket();
      setReceipt(result.receipt);
    } catch (err) {
      Alert.alert('No se pudo cobrar', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <ReceiptTicketModal
        visible
        payload={receipt}
        onClose={() => {
          setReceipt(null);
          router.replace('/sale');
        }}
      />
    );
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginBottom: space[16], alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: type.secondary, fontWeight: '600', color: colors.brand }}>← Pedido</Text>
      </Pressable>
      <View style={{ flex: 1, justifyContent: 'center', gap: space[32] }}>
        <View style={{ alignItems: 'center', gap: space[8] }}>
          <Text style={{ fontSize: type.meta, fontWeight: '700', letterSpacing: 1.6, color: colors.textSecondary }}>
            {label.toUpperCase()}
          </Text>
          <Money size={40}>{formatMxn(order.totalCents ?? 0)}</Money>
        </View>
        <View style={{ gap: space[12] }}>
          <Button label="Efectivo" onPress={() => void pay('cash')} disabled={busy} />
          <Button label="Transferencia" variant="secondary" onPress={() => void pay('transfer')} disabled={busy} />
        </View>
      </View>
    </Screen>
  );
}
