import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { KitchenTicketPayload } from '@ordio/shared';
import { Button } from './button';
import { KitchenTicketSlip } from './kitchen-ticket-slip';
import { colors, space, type } from '../theme';

type Props = {
  visible: boolean;
  payload: KitchenTicketPayload | null;
  onClose: () => void;
};

export function KitchenTicketModal({ visible, payload, onClose }: Props) {
  if (!payload) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(25,26,24,0.55)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            maxHeight: '88%',
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: space[12],
            paddingBottom: space[24],
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: space[12] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <Text
            style={{
              fontSize: type.title,
              fontWeight: '700',
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: space[4],
            }}
          >
            Comanda enviada
          </Text>
          <Text
            style={{
              fontSize: type.secondary,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: space[16],
              paddingHorizontal: space[24],
            }}
          >
            Así la verá cocina en la impresora de 80 mm.
          </Text>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: space[16], paddingBottom: space[16] }}
            showsVerticalScrollIndicator={false}
          >
            <KitchenTicketSlip payload={payload} />
          </ScrollView>

          <View style={{ paddingHorizontal: space[16], marginTop: space[8] }}>
            <Button label="Listo" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
