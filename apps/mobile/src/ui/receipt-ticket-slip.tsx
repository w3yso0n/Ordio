import { Platform, Text, View } from 'react-native';
import {
  buildReceiptSlip,
  KITCHEN_SLIP_PREVIEW_WIDTH,
  receiptRuleLine,
  type ReceiptSlipInput,
} from '@ordio/shared';
import { colors, space } from '../theme';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

type Props = {
  payload: ReceiptSlipInput;
};

export function ReceiptTicketSlip({ payload }: Props) {
  const blocks = buildReceiptSlip(payload);

  return (
    <View
      style={{
        width: KITCHEN_SLIP_PREVIEW_WIDTH,
        maxWidth: '100%',
        alignSelf: 'center',
        backgroundColor: '#FFFDF8',
        borderWidth: 1,
        borderColor: '#D4D0C8',
        paddingHorizontal: 14,
        paddingVertical: 18,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          backgroundColor: '#E8E4DC',
        }}
      />

      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case 'title':
            return (
              <Text
                key={key}
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 2,
                  textAlign: 'center',
                  color: '#1A1A1A',
                  marginTop: space[4],
                }}
              >
                {block.text}
              </Text>
            );
          case 'number':
            return (
              <Text
                key={key}
                style={{
                  fontFamily: mono,
                  fontSize: 36,
                  fontWeight: '900',
                  textAlign: 'center',
                  color: '#1A1A1A',
                  lineHeight: 40,
                  marginTop: 2,
                  marginBottom: space[8],
                }}
              >
                {block.text}
              </Text>
            );
          case 'banner':
            return (
              <View
                key={key}
                style={{
                  alignSelf: 'center',
                  backgroundColor: colors.success,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  marginBottom: space[8],
                  minWidth: 120,
                }}
              >
                <Text
                  style={{
                    fontFamily: mono,
                    fontSize: 16,
                    fontWeight: '800',
                    letterSpacing: 3,
                    textAlign: 'center',
                    color: colors.onBrand,
                  }}
                >
                  {block.text}
                </Text>
              </View>
            );
          case 'meta':
            return (
              <Text
                key={key}
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  textAlign: 'center',
                  color: '#666660',
                  marginBottom: space[8],
                }}
              >
                {block.text}
              </Text>
            );
          case 'rule':
            return (
              <Text
                key={key}
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: '#999994',
                  marginVertical: space[8],
                  letterSpacing: -0.5,
                }}
              >
                {receiptRuleLine()}
              </Text>
            );
          case 'itemName':
            return (
              <Text
                key={key}
                style={{
                  fontFamily: mono,
                  fontSize: 14,
                  fontWeight: '800',
                  color: '#1A1A1A',
                  lineHeight: 20,
                }}
              >
                {block.text}
              </Text>
            );
          case 'itemPrice':
            return (
              <View
                key={key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: space[8],
                }}
              >
                <Text
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    color: '#666660',
                    flexShrink: 0,
                  }}
                >
                  {block.left}
                </Text>
                <Text
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#1A1A1A',
                    flexShrink: 0,
                  }}
                >
                  {block.right}
                </Text>
              </View>
            );
          case 'total':
            return (
              <Text
                key={key}
                style={{
                  fontFamily: mono,
                  fontSize: 15,
                  fontWeight: '900',
                  color: '#1A1A1A',
                  marginBottom: space[4],
                }}
              >
                {block.text}
              </Text>
            );
          case 'pay':
            return (
              <Text
                key={key}
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#1A1A1A',
                  marginBottom: space[8],
                }}
              >
                {block.text}
              </Text>
            );
          case 'footer':
            return (
              <Text
                key={key}
                style={{
                  fontFamily: mono,
                  fontSize: 12,
                  textAlign: 'center',
                  color: '#1A1A1A',
                  marginTop: space[4],
                }}
              >
                {block.text}
              </Text>
            );
          default:
            return null;
        }
      })}

      <Text
        style={{
          fontFamily: mono,
          fontSize: 9,
          textAlign: 'center',
          color: '#B0ADA6',
          marginTop: space[12],
        }}
      >
        80 mm · cliente
      </Text>
    </View>
  );
}
