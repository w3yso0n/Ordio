import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { API } from '../lib/host';
import { apiFetch, ensureAccessToken, hasStoredSession, saveSession } from '../lib/api';
import {
  loadCachedCashiers,
  parseCatalogSnapshot,
  saveCachedCashiers,
  saveCachedCatalog,
} from '../lib/catalog-cache';
import { saveCachedSession, saveDeviceContext } from '../lib/local-checks';
import { isNetworkError } from '../lib/network';
import { saveLocalPin, verifyLocalPin } from '../lib/pin-local';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Screen } from '../ui/screen';
import { colors, radius, space, type } from '../theme';

export default function PinScreen() {
  const [people, setPeople] = useState<Array<{ id: string; displayName: string }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await ensureAccessToken('device');
        if (!token) throw new Error();
        const res = await fetch(`${API}/catalog/snapshot`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error();
        const cashiers = data.cashiers ?? [];
        saveCachedCashiers(cashiers);
        saveCachedCatalog(parseCatalogSnapshot(data));
        setPeople(cashiers.map((c: { id: string; displayName: string }) => ({ id: c.id, displayName: c.displayName })));
      } catch {
        setPeople(loadCachedCashiers());
      }
    })();
  }, []);

  async function enterOffline() {
    const ok = await verifyLocalPin(selected!, pin);
    if (!ok) {
      setError('PIN incorrecto');
      return;
    }
    if (!(await hasStoredSession('cashier'))) {
      setError('La primera vez necesitas internet para entrar. Después la sesión queda en esta caja.');
      return;
    }
    await goToSale();
  }

  async function goToSale() {
    const person = people.find((item) => item.id === selected);
    saveDeviceContext({ cashierUserId: selected!, cashierName: person?.displayName });
    router.replace('/sale');
  }

  async function enter() {
    if (!selected || busy) return;
    setError('');
    setBusy(true);
    try {
      const token = await ensureAccessToken('device');
      if (!token) {
        if (await hasStoredSession('device')) {
          await enterOffline();
          return;
        }
        setError('El dispositivo no está vinculado. Vuelve a activarlo.');
        return;
      }
      const res = await fetch(`${API}/auth/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selected, pin }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
        if (message === 'Invalid token' || message === 'Device token required') {
          await enterOffline();
          return;
        }
        if (res.status >= 500 || !data) {
          setError('No se pudo entrar. Reintenta.');
          return;
        }
        setError('PIN incorrecto');
        return;
      }
      if (!data?.accessToken) {
        setError('No se pudo entrar. Reintenta.');
        return;
      }
      await saveSession('cashier', { accessToken: data.accessToken, refreshToken: data.refreshToken });
      try {
        await saveLocalPin(selected, pin);
      } catch {
        /* El PIN local no debe bloquear la entrada si el servidor ya aceptó. */
      }
      try {
        const snap = await apiFetch('/catalog/snapshot');
        saveCachedCatalog(parseCatalogSnapshot(snap));
        const session = await apiFetch('/cash/sessions/current');
        if (session?.id) {
          saveCachedSession({
            id: session.id,
            branchId: session.branchId,
            openedByUserId: session.openedByUserId,
          });
        }
      } catch {
        /* Catálogo y caja quedan los que ya se guardaron; se venden offline igual. */
      }
      await goToSale();
    } catch (err) {
      if (isNetworkError(err) || err instanceof TypeError) {
        await enterOffline();
        return;
      }
      setError('No se pudo entrar. Reintenta.');
    } finally {
      setBusy(false);
    }
  }

  function initials(name: string) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: space[20] }}>
        <View style={{ gap: space[8] }}>
          <Text style={{ fontSize: type.meta, fontWeight: '700', letterSpacing: 1.6, color: colors.brand }}>
            CAJA
          </Text>
          <Text style={{ fontSize: type.screen, fontWeight: '700', color: colors.textPrimary }}>Cajero</Text>
          <Text style={{ fontSize: type.secondary, color: colors.textSecondary }}>
            Elige tu nombre e ingresa el PIN.
          </Text>
        </View>

        <View style={{ gap: space[8] }}>
          {people.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: type.secondary }}>
              No hay cajeros en esta sucursal.
            </Text>
          ) : (
            people.map((p) => {
              const active = selected === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelected(p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => ({
                    minHeight: 56,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: active ? colors.brand : colors.border,
                    backgroundColor: active ? colors.brandMuted : pressed ? colors.surfaceSecondary : colors.surface,
                    paddingHorizontal: space[16],
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space[12],
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: active ? colors.brand : colors.surfaceSecondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: active ? colors.onBrand : colors.textPrimary, fontWeight: '700', fontSize: type.meta }}>
                      {initials(p.displayName)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: type.body, fontWeight: active ? '700' : '500', color: colors.textPrimary }}>
                    {p.displayName}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        <Field
          label="PIN"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          error={error || undefined}
        />
        <Button label={busy ? 'Entrando…' : 'Entrar'} onPress={() => void enter()} disabled={busy || !selected} />
      </View>
    </Screen>
  );
}
