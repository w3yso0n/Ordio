import { Platform, Text, View } from 'react-native';
import {
  buildKitchenSlip,
  formatItemLines,
  KITCHEN_SLIP_PREVIEW_WIDTH,
  ruleLine,
  type KitchenSlipInput,
} from '@ordio/shared';
import { colors, space } from '../theme';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const bannerColors = {
  new: { bg: colors.textPrimary, fg: colors.onBrand },
  extra: { bg: colors.brand, fg: colors.onBrand },
  void: { bg: colors.danger, fg: colors.onBrand },
  change: { bg: colors.warning, fg: colors.onBrand },
} as const;

type Props = {
  payload: KitchenSlipInput;
  compact?: boolean;
};

export function KitchenTicketSlip({ payload, compact }: Props) {
  const blocks = buildKitchenSlip(payload);

  return (
    <View
      style={{
        width: KITCHEN_SLIP_PREVIEW_WIDTH,
        maxWidth: '100%',
        alignSelf: 'center',
        backgroundColor: '#FFFDF8',
        borderWidth: 1,
        borderColor: '#D4D0C8',
        paddingHorizontal: compact ? 10 : 14,
        paddingVertical: compact ? 16 : 24,
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
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        }}
      />

      {blocks.map((block, index) => {
        switch (block.type) {
          case 'spacer':
            return <View key={`${block.type}-${index}`} style={{ height: block.lines * 10 }} />;
          case 'title':
            return (
              <Text
                key={`${block.type}-${index}`}
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 2,
                  textAlign: 'center',
                  color: '#1A1A1A',
                }}
              >
                {block.text}
              </Text>
            );
          case 'number':
            return (
              <Text
                key={`${block.type}-${index}`}
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
          case 'banner': {
            const tone = bannerColors[block.tone];
            return (
              <View
                key={`${block.type}-${index}`}
                style={{
                  alignSelf: 'center',
                  backgroundColor: tone.bg,
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
                    color: tone.fg,
                  }}
                >
                  {block.text}
                </Text>
              </View>
            );
          }
          case 'meta':
            return (
              <Text
                key={`${block.type}-${index}`}
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  textAlign: 'center',
                  color: '#666660',
                  marginBottom: space[12],
                }}
              >
                {block.text}
              </Text>
            );
          case 'rule':
            return (
              <Text
                key={`${block.type}-${index}`}
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: '#999994',
                  marginVertical: space[8],
                  letterSpacing: -0.5,
                }}
              >
                {ruleLine()}
              </Text>
            );
          case 'item':
            return (
              <View key={`${block.type}-${index}`} style={{ marginBottom: space[12] }}>
                {formatItemLines(block.qty, block.name, block.kind).map((row, rowIndex) => (
                  <Text
                    key={rowIndex}
                    style={{
                      fontFamily: mono,
                      fontSize: block.kind === 'void' ? 32 : 44,
                      fontWeight: block.kind === 'void' ? '600' : '800',
                      color: block.kind === 'void' ? colors.danger : '#1A1A1A',
                      textDecorationLine: block.kind === 'void' ? 'line-through' : 'none',
                      lineHeight: block.kind === 'void' ? 38 : 52,
                    }}
                  >
                    {row}
                  </Text>
                ))}
              </View>
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
        80 mm · cocina
      </Text>
    </View>
  );
}
