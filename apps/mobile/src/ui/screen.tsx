import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '../theme';

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
};

export function Screen({ children, footer, padded = true }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, padding: padded ? space[20] : 0 }}>{children}</View>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
