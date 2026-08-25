import { Text, type TextStyle } from 'react-native';
import { colors, type } from '../theme';

type Props = {
  children: string;
  size?: number;
  color?: string;
  style?: TextStyle;
};

export function Money({ children, size = type.money, color = colors.textPrimary, style }: Props) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          fontWeight: '700',
          color,
          fontVariant: ['tabular-nums'],
          letterSpacing: -0.4,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
