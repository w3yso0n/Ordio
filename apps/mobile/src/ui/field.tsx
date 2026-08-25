import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, space, type } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, style, ...rest }: Props) {
  return (
    <View style={{ gap: space[8] }}>
      <Text style={{ fontSize: type.secondary, fontWeight: '600', color: colors.textSecondary }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          {
            minHeight: 56,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            paddingHorizontal: space[16],
            fontSize: type.body,
            color: colors.textPrimary,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={{ color: colors.danger, fontSize: type.meta }}>{error}</Text>
      ) : null}
    </View>
  );
}
