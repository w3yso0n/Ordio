import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { KitchenTicketPayload } from '@ordio/shared';
import { KitchenTicketSlip } from '../ui/kitchen-ticket-slip';
import { Button } from '../ui/button';
import { Screen } from '../ui/screen';
import { colors, space, type } from '../theme';

const samples: Array<{ label: string; payload: KitchenTicketPayload }> = [
  {
    label: 'Primera ronda',
    payload: {
      dailyNumber: 14,
      createdAtIso: new Date().toISOString(),
      round: 1,
      lines: [
        { name: 'Taco al pastor', qty: 4, kind: 'add' },
        { name: 'Agua 600 ml', qty: 2, kind: 'add' },
      ],
    },
  },
  {
    label: 'Ronda extra',
    payload: {
      dailyNumber: 14,
      createdAtIso: new Date().toISOString(),
      round: 2,
      tableLabel: 'Barra',
      lines: [{ name: 'Taco al pastor', qty: 2, kind: 'add' }],
    },
  },
  {
    label: 'Corrección (VOID)',
    payload: {
      dailyNumber: 14,
      createdAtIso: new Date().toISOString(),
      round: 3,
      lines: [
        { name: 'Taco al pastor', qty: 1, kind: 'void' },
        { name: 'Quesadilla', qty: 1, kind: 'add' },
      ],
    },
  },
];

export default function KitchenPreviewScreen() {
  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: space[16], paddingTop: space[8], paddingBottom: space[12], gap: space[8] }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: type.secondary, fontWeight: '600', color: colors.brand }}>← Venta</Text>
        </Pressable>
        <Text style={{ fontSize: type.screen, fontWeight: '700', color: colors.textPrimary }}>Vista comanda 80 mm</Text>
        <Text style={{ fontSize: type.secondary, color: colors.textSecondary }}>
          Diseño de ticket térmico para cocina. Solo imprime lo de esta ronda, no el pedido acumulado.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space[16], paddingBottom: space[24], gap: space[24] }}
        showsVerticalScrollIndicator={false}
      >
        {samples.map((sample) => (
          <View key={sample.label} style={{ gap: space[8] }}>
            <Text style={{ fontSize: type.meta, fontWeight: '700', letterSpacing: 1.2, color: colors.textMuted }}>
              {sample.label.toUpperCase()}
            </Text>
            <KitchenTicketSlip payload={sample.payload} />
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: space[16], paddingBottom: space[12] }}>
        <Button label="Volver a venta" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
