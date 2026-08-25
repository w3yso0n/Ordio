import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { decodeJwtPayload, saveSession } from '../lib/api';
import { API } from '../lib/host';
import { saveDeviceContext } from '../lib/local-checks';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Screen } from '../ui/screen';
import { colors, space, type } from '../theme';

export default function PairScreen() {
  const [code, setCode] = useState('ORDIO-DEMO');
  const [error, setError] = useState('');

  async function pair() {
    setError('');
    try {
      const res = await fetch(`${API}/auth/device/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activationCode: code, name: 'Caja 1', platform: 'android' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Error');
      await saveSession('device', { accessToken: data.accessToken, refreshToken: data.refreshToken });
      const claims = decodeJwtPayload(data.accessToken);
      saveDeviceContext({
        branchId: claims?.branchId ?? data.branch?.id ?? data.device?.branchId,
        deviceId: claims?.deviceId ?? data.device?.id,
        branchName: data.branch?.name,
      });
      router.replace('/pin');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: space[24] }}>
        <View style={{ gap: space[8] }}>
          <Text style={{ fontSize: type.meta, fontWeight: '700', letterSpacing: 1.6, color: colors.brand }}>
            ORDIO
          </Text>
          <Text style={{ fontSize: type.screen, fontWeight: '700', color: colors.textPrimary }}>
            Activar dispositivo
          </Text>
          <Text style={{ fontSize: type.secondary, color: colors.textSecondary, lineHeight: 20 }}>
            Escribe el código de sucursal para vincular esta caja.
          </Text>
        </View>
        <Field
          label="Código de sucursal"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          error={error}
        />
        <Button label="Continuar" onPress={pair} />
      </View>
    </Screen>
  );
}
