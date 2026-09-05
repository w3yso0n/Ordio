import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { formatMxn, type KitchenTicketPayload } from '@ordio/shared';
import { pendingKitchenQty, type LocalOrderItem } from '../lib/order-engine';
import { saleErrorMessage } from '../lib/network';
import { sendOrder } from '../lib/orders-api';
import { printer, tryPrint } from '../print';
import { setTicketItemQty, startNewTicket, useTicket } from '../lib/ticket-store';
import { Button } from '../ui/button';
import { KitchenTicketModal } from '../ui/kitchen-ticket-modal';
import { Money } from '../ui/money';
import { Screen } from '../ui/screen';
import { colors, radius, space, type } from '../theme';

export default function ConfirmScreen() {
  const ticket = useTicket();
  const [busy, setBusy] = useState(false);
  const [kitchenPreview, setKitchenPreview] = useState<KitchenTicketPayload | null>(null);
  const count = ticket.items.reduce((sum, item) => sum + item.qty, 0);
  const pending = pendingKitchenQty(ticket);
  const title = ticket.dailyNumber != null ? `Cuenta #${ticket.dailyNumber}` : 'Pedido';

  async function handleSend() {
    if (busy || pending === 0) return;
    setBusy(true);
    try {
      const result = await sendOrder(ticket);
      startNewTicket();
      if (result.kitchen) {
        await tryPrint(() => printer.printKitchenTicket(result.kitchen!));
        setKitchenPreview(result.kitchen);
        return;
      }
      router.replace('/sale');
    } catch (err) {
      Alert.alert('No se pudo enviar', saleErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function changeQty(item: LocalOrderItem, nextQty: number) {
    const next = Math.max(0, Math.floor(nextQty));
    if (next >= item.qty || next >= item.sentQty) {
      setTicketItemQty(item.id, next);
      return;
    }
    const removing = item.sentQty - next;
    Alert.alert(
      'Ya se mandó a cocina',
      next === 0
        ? `«${item.nameSnapshot}» salió en una comanda anterior (${item.sentQty}). Si lo quitas, cocina debe cancelarlo. ¿Seguro?`
        : `Vas a quitar ${removing} de «${item.nameSnapshot}» que ya se mandó. Pudo ser un error; cocina verá un VOID al enviar. ¿Seguir?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar', style: 'destructive', onPress: () => setTicketItemQty(item.id, next) },
      ],
    );
  }

  if (kitchenPreview) {
    return (
      <KitchenTicketModal
        visible
        payload={kitchenPreview}
        onClose={() => {
          setKitchenPreview(null);
          router.replace('/sale');
        }}
      />
    );
  }

  if (ticket.items.length === 0) {
    return (
      <Screen>
        <Text style={{ fontSize: type.title, fontWeight: '700', color: colors.textPrimary }}>Pedido vacío</Text>
        <Text style={{ marginTop: space[8], fontSize: type.secondary, color: colors.textSecondary }}>
          Agrega productos en venta o abre una cuenta existente.
        </Text>
        <View style={{ marginTop: space[24], gap: space[12] }}>
          <Button label="Cuentas abiertas" variant="secondary" onPress={() => router.push('/checks' as Href)} />
          <Button label="Volver a venta" variant="ghost" onPress={() => router.replace('/sale')} />
        </View>
      </Screen>
    );
  }

  return (
      <Screen
      footer={
        <View style={{ paddingHorizontal: space[16], paddingBottom: space[12], gap: space[12] }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: type.secondary, color: colors.textSecondary }}>
              {count} {count === 1 ? 'artículo' : 'artículos'}
              {pending > 0 ? ` · ${pending} pendientes` : ' · todo enviado'}
            </Text>
            <Money size={28}>{formatMxn(ticket.totalCents)}</Money>
          </View>
          <Button
            label={pending > 0 ? `Enviar a cocina (${pending})` : 'Todo enviado'}
            onPress={() => void handleSend()}
            disabled={busy || pending === 0}
          />
          <Button label="Cobrar ahora" variant="secondary" onPress={() => router.push('/charge')} disabled={busy} />
          <View style={{ flexDirection: 'row', gap: space[12] }}>
            <Button label="Seguir vendiendo" variant="ghost" onPress={() => router.back()} disabled={busy} />
            <Button label="Cuentas" variant="ghost" onPress={() => router.push('/checks' as Href)} disabled={busy} />
          </View>
        </View>
      }
    >
      <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginBottom: space[16], alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: type.secondary, fontWeight: '600', color: colors.brand }}>← Venta</Text>
      </Pressable>
      <Text style={{ fontSize: type.screen, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
      <Text style={{ marginTop: space[4], marginBottom: space[16], fontSize: type.secondary, color: colors.textSecondary }}>
        Enviar manda solo lo nuevo a cocina. Cobrar cierra la cuenta.
      </Text>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: space[8], paddingBottom: space[16] }}>
        {ticket.items.map((item) => {
          const itemPending = Math.max(0, item.qty - item.sentQty);
          return (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: itemPending > 0 ? colors.brand : colors.border,
                borderRadius: radius.md,
                padding: space[12],
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[12],
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ fontSize: type.body, fontWeight: '700', color: colors.textPrimary }}>
                  {item.nameSnapshot}
                </Text>
                <Text style={{ marginTop: 2, fontSize: type.meta, color: colors.textMuted }}>
                  {formatMxn(item.unitPriceCents)} c/u
                  {item.sentQty > 0 ? ` · ${item.sentQty} en cocina` : ''}
                  {itemPending > 0 ? ` · +${itemPending} pendiente` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[8] }}>
                <QtyButton label="−" onPress={() => changeQty(item, item.qty - 1)} />
                <Text style={{ minWidth: 20, textAlign: 'center', fontSize: type.body, fontWeight: '700', color: colors.textPrimary }}>
                  {item.qty}
                </Text>
                <QtyButton label="+" onPress={() => changeQty(item, item.qty + 1)} />
              </View>
              <Text style={{ minWidth: 64, textAlign: 'right', fontSize: type.secondary, fontWeight: '700', color: colors.textPrimary }}>
                {formatMxn(item.lineTotalCents)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function QtyButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Sumar' : 'Restar'}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.brandMuted : colors.surfaceSecondary,
      })}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{label}</Text>
    </Pressable>
  );
}
