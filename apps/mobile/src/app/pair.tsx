import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { clearCashierSession, decodeJwtPayload, saveSession } from '../lib/api';
import { queueClear } from '../db/client.native';
import { API } from '../lib/host';
import { clearLocalSaleData, saveDeviceContext } from '../lib/local-checks';
import { resetTicketStore } from '../lib/ticket-store';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Screen } from '../ui/screen';
import { colors, space, type } from '../theme';

export default function PairScreen() {
  const [code, setCode] = useState('INDIO');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pair() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/device/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activationCode: code.trim(), name: 'Caja 1', platform: 'android' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.accessToken) {
        const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
        throw new Error(typeof message === 'string' ? message : 'No se pudo activar. Reintenta.');
      }
      await saveSession('device', { accessToken: data.accessToken, refreshToken: data.refreshToken });
      await clearCashierSession();
      clearLocalSaleData();
      resetTicketStore();
      queueClear();
      const claims = decodeJwtPayload(data.accessToken);
      saveDeviceContext({
        branchId: claims?.branchId ?? data.branch?.id ?? data.device?.branchId,
        deviceId: claims?.deviceId ?? data.device?.id,
        branchName: data.branch?.name,
      });
      router.replace('/pin');
    } catch (err) {
      setError((err as Error).message || 'No se pudo activar. Reintenta.');
    } finally {
      setBusy(false);
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
          onChangeText={(value) => setCode(value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())}
          placeholder="INDIO"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          spellCheck={false}
          error={error}
        />
        <Button label={busy ? 'Activando…' : 'Continuar'} onPress={() => void pair()} disabled={busy} />
      </View>
    </Screen>
  );
}
