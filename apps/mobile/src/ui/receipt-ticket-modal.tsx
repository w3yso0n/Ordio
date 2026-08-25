import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { ReceiptPayload } from '@ordio/shared';
import { Button } from './button';
import { ReceiptTicketSlip } from './receipt-ticket-slip';
import { colors, space, type } from '../theme';

type Props = {
  visible: boolean;
  payload: ReceiptPayload | null;
  onClose: () => void;
};

export function ReceiptTicketModal({ visible, payload, onClose }: Props) {
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
            Ticket de cuenta
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
            Este es el ticket que se entrega al cliente, con precios y total.
          </Text>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: space[16], paddingBottom: space[16] }}
            showsVerticalScrollIndicator={false}
          >
            <ReceiptTicketSlip payload={payload} />
          </ScrollView>

          <View style={{ paddingHorizontal: space[16], marginTop: space[8] }}>
            <Button label="Listo" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
