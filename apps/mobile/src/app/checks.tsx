import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { formatMxn, type ReceiptPayload } from '@ordio/shared';
import { fetchOrder, listOpenChecks, listPaidSales, saveOrder, type LocalPaidSale, type OpenCheckSummary } from '../lib/orders-api';
import { flushSyncQueue } from '../lib/sync-queue';
import { loadTicket, parkCurrentTicket } from '../lib/ticket-store';
import { Button } from '../ui/button';
import { ReceiptTicketModal } from '../ui/receipt-ticket-modal';
import { Screen } from '../ui/screen';
import { colors, radius, space, type } from '../theme';

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  return `hace ${hours} h`;
}

function startFreshAccount() {
  const parked = parkCurrentTicket();
  if (parked) void saveOrder(parked).catch(() => {});
  router.replace('/sale');
}

export default function ChecksScreen() {
  const [checks, setChecks] = useState<OpenCheckSummary[]>([]);
  const [paid, setPaid] = useState<LocalPaidSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await flushSyncQueue();
      setChecks(await listOpenChecks());
      setPaid(listPaidSales());
    } catch (err) {
      setChecks(await listOpenChecks().catch(() => []));
      setPaid(listPaidSales());
      Alert.alert('No se pudieron cargar las cuentas', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function openCheck(check: OpenCheckSummary) {
    try {
      const parked = parkCurrentTicket();
      if (parked && parked.id !== check.id) void saveOrder(parked).catch(() => {});
      const order = await fetchOrder(check.id);
      loadTicket(order);
      router.replace('/confirm');
    } catch (err) {
      Alert.alert('No se pudo abrir la cuenta', (err as Error).message);
    }
  }

  const totalOpen = useMemo(() => checks.reduce((sum, check) => sum + check.totalCents, 0), [checks]);
  const pendingPaid = paid.filter((item) => !item.synced).length;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: space[16], paddingTop: space[8], paddingBottom: space[12], gap: space[8] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: type.secondary, fontWeight: '600', color: colors.brand }}>← Venta</Text>
        </Pressable>
        <Text style={{ fontSize: type.screen, fontWeight: '700', color: colors.textPrimary }}>Cuentas</Text>
        <Text style={{ fontSize: type.secondary, color: colors.textSecondary }}>
          {checks.length === 0
            ? 'No hay cuentas pendientes de cobro.'
            : `${checks.length} ${checks.length === 1 ? 'abierta' : 'abiertas'} · ${formatMxn(totalOpen)}`}
          {pendingPaid > 0 ? ` · ${pendingPaid} cobradas por subir` : ''}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space[16], paddingBottom: space[16], gap: space[8] }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
      >
        {checks.length === 0 && !loading ? (
          <View style={{ paddingVertical: space[24], alignItems: 'center', gap: space[12] }}>
            <Text style={{ fontSize: type.secondary, color: colors.textSecondary, textAlign: 'center' }}>
              Toca productos en venta y usa Enviar o Cobrar. Todo queda en el teléfono si no hay red.
            </Text>
          </View>
        ) : (
          checks.map((check) => (
            <Pressable
              key={check.id}
              onPress={() => void openCheck(check)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.brandMuted : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: space[16],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space[12],
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: type.title, fontWeight: '800', color: colors.textPrimary }}>
                  #{check.dailyNumber ?? '—'}
                </Text>
                <Text style={{ marginTop: 4, fontSize: type.meta, color: colors.textMuted }}>
                  {check.itemCount} {check.itemCount === 1 ? 'artículo' : 'artículos'}
                  {check.pendingKitchenQty > 0 ? ` · ${check.pendingKitchenQty} sin enviar` : ' · en cocina'}
                  {' · '}
                  {timeAgo(check.createdAt)}
                </Text>
              </View>
              <Text style={{ fontSize: type.body, fontWeight: '800', color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                {formatMxn(check.totalCents)}
              </Text>
            </Pressable>
          ))
        )}

        {paid.length > 0 ? (
          <View style={{ marginTop: space[16], gap: space[8] }}>
            <Text style={{ fontSize: type.meta, fontWeight: '700', letterSpacing: 1.2, color: colors.textMuted }}>
              COBRADAS EN ESTA CAJA
            </Text>
            {paid.slice(0, 20).map((sale) => (
              <Pressable
                key={sale.orderId}
                onPress={() => setReceipt(sale.receipt)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.brandMuted : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: space[16],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: space[12],
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: type.body, fontWeight: '800', color: colors.textPrimary }}>
                    #{sale.dailyNumber ?? '—'}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: type.meta, color: colors.textMuted }}>
                    {sale.method === 'cash' ? 'Efectivo' : 'Transferencia'}
                    {' · '}
                    {sale.synced ? 'subida' : 'por sincronizar'}
                    {' · '}
                    {timeAgo(sale.paidAt)}
                  </Text>
                </View>
                <Text style={{ fontSize: type.body, fontWeight: '800', color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                  {formatMxn(sale.totalCents)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: space[16], paddingBottom: space[12] }}>
        <Button label="Nueva cuenta" variant="secondary" onPress={startFreshAccount} />
      </View>

      <ReceiptTicketModal visible={Boolean(receipt)} payload={receipt} onClose={() => setReceipt(null)} />
    </Screen>
  );
}
