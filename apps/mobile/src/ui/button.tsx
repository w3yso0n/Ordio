import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space, type } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

const tones: Record<Variant, { bg: string; bgPressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.brand, bgPressed: colors.brandPressed, fg: colors.onBrand },
  secondary: {
    bg: colors.surface,
    bgPressed: colors.surfaceSecondary,
    fg: colors.textPrimary,
    border: colors.border,
  },
  ghost: { bg: 'transparent', bgPressed: colors.surfaceSecondary, fg: colors.textSecondary },
  danger: { bg: colors.danger, bgPressed: '#931B16', fg: colors.onBrand },
};

export function Button({ label, variant = 'primary', style, disabled, ...rest }: Props) {
  const tone = tones[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: 56,
          borderRadius: radius.md,
          paddingHorizontal: space[20],
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? tone.bgPressed : tone.bg,
          borderWidth: tone.border ? 1 : 0,
          borderColor: tone.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Text
        style={{
          color: tone.fg,
          fontSize: type.body,
          fontWeight: '700',
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
