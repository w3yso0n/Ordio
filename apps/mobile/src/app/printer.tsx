import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  connectPrinter,
  disconnectPrinter,
  nativePrinterUnavailableReason,
  printTestPage,
  scanPrinters,
  type DiscoveredPrinter,
} from '../print/bluetooth';
import { clearSavedPrinter, getSavedPrinter, savePrinter, type SavedPrinter } from '../print/printer-store';
import { Button } from '../ui/button';
import { Screen } from '../ui/screen';
import { colors, radius, space, type } from '../theme';

export default function PrinterScreen() {
  const [saved, setSaved] = useState<SavedPrinter | null>(null);
  const [connected, setConnected] = useState(false);
  const [paired, setPaired] = useState<DiscoveredPrinter[]>([]);
  const [found, setFound] = useState<DiscoveredPrinter[]>([]);
  const [busy, setBusy] = useState<'scan' | 'connect' | 'test' | null>(null);
  const [error, setError] = useState('');
  const unavailable = nativePrinterUnavailableReason();

  const refreshSaved = useCallback(() => {
    setSaved(getSavedPrinter());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSaved();
    }, [refreshSaved]),
  );

  async function scan() {
    if (busy) return;
    setError('');
    setBusy('scan');
    try {
      const result = await scanPrinters();
      setPaired(result.paired);
      setFound(result.found);
      if (result.paired.length === 0 && result.found.length === 0) {
        setError('No apareció ninguna impresora. Empareja primero en Ajustes > Bluetooth y vuelve a buscar.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function choose(device: DiscoveredPrinter) {
    if (busy) return;
    setError('');
    setBusy('connect');
    try {
      const address = await connectPrinter(device);
      const next: SavedPrinter = { name: device.name, address, deviceType: device.deviceType };
      savePrinter(next);
      setSaved(next);
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function testPrint() {
    if (!saved || busy) return;
    setError('');
    setBusy('test');
    try {
      let address = saved.address;
      if (!connected) {
        address = await connectPrinter(saved);
        const next = { ...saved, address };
        savePrinter(next);
        setSaved(next);
        setConnected(true);
      }
      await printTestPage(address);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function forget() {
    Alert.alert('Quitar impresora', 'Esta caja dejará de imprimir tickets hasta que elijas otra.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          const address = saved?.address;
          clearSavedPrinter();
          setSaved(null);
          setConnected(false);
          if (address) void disconnectPrinter(address);
        },
      },
    ]);
  }

  const devices = useMemo(() => {
    const seen = new Set<string>();
    const list: DiscoveredPrinter[] = [];
    for (const device of [...paired, ...found]) {
      if (seen.has(device.address)) continue;
      seen.add(device.address);
      list.push(device);
    }
    return list.sort((a, b) => Number(isLikelyPrinter(b.name)) - Number(isLikelyPrinter(a.name)));
  }, [paired, found]);

  return (
    <Screen
      footer={
        <View style={{ paddingHorizontal: space[16], paddingBottom: space[12], gap: space[12] }}>
          {saved ? (
            <Button label={busy === 'test' ? 'Imprimiendo…' : 'Imprimir prueba'} onPress={() => void testPrint()} disabled={!!busy || !!unavailable} />
          ) : null}
          <Button
            label={busy === 'scan' ? 'Buscando…' : 'Buscar impresoras'}
            variant={saved ? 'secondary' : 'primary'}
            onPress={() => void scan()}
            disabled={!!busy || !!unavailable}
          />
        </View>
      }
    >
      <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginBottom: space[16], alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: type.secondary, fontWeight: '600', color: colors.brand }}>← Venta</Text>
      </Pressable>
      <Text style={{ fontSize: type.screen, fontWeight: '700', color: colors.textPrimary }}>Impresora</Text>
      <Text style={{ marginTop: space[4], marginBottom: space[16], fontSize: type.secondary, color: colors.textSecondary }}>
        Empareja la impresora en Bluetooth del teléfono y elígela aquí. Los tickets salen al enviar a cocina y al cobrar.
      </Text>

      {unavailable ? (
        <View
          style={{
            backgroundColor: colors.dangerMuted,
            borderRadius: radius.md,
            padding: space[12],
            marginBottom: space[16],
          }}
        >
          <Text style={{ fontSize: type.secondary, color: colors.danger, fontWeight: '600' }}>{unavailable}</Text>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: saved ? colors.brand : colors.border,
          borderRadius: radius.md,
          padding: space[16],
          marginBottom: space[16],
          gap: space[4],
        }}
      >
        <Text style={{ fontSize: type.meta, fontWeight: '700', letterSpacing: 1.2, color: colors.textMuted }}>
          {saved ? (connected ? 'CONECTADA' : 'GUARDADA') : 'SIN IMPRESORA'}
        </Text>
        <Text style={{ fontSize: type.body, fontWeight: '700', color: colors.textPrimary }}>
          {saved?.name ?? 'Ninguna'}
        </Text>
        {saved ? (
          <Text style={{ fontSize: type.meta, color: colors.textSecondary }}>{stripScheme(saved.address)}</Text>
        ) : (
          <Text style={{ fontSize: type.meta, color: colors.textSecondary }}>
            Busca y toca la que dice Printer, POS, XP, Epson o similar.
          </Text>
        )}
        {saved ? (
          <Pressable onPress={forget} hitSlop={8} style={{ marginTop: space[8], alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: type.secondary, fontWeight: '600', color: colors.danger }}>Quitar</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={{ marginBottom: space[12], fontSize: type.secondary, color: colors.danger }}>{error}</Text>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: space[8], paddingBottom: space[16] }}>
        {devices.length === 0 && busy !== 'scan' ? (
          <Text style={{ fontSize: type.secondary, color: colors.textSecondary }}>
            La búsqueda tarda unos 15 segundos. Si ya la emparejaste en el sistema, debe aparecer en la lista.
          </Text>
        ) : null}
        {devices.map((device) => {
          const active = saved?.address === device.address;
          return (
            <Pressable
              key={device.address}
              onPress={() => void choose(device)}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                minHeight: 64,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: active ? colors.brand : colors.border,
                backgroundColor: active ? colors.brandMuted : pressed ? colors.surfaceSecondary : colors.surface,
                paddingHorizontal: space[16],
                paddingVertical: space[12],
                opacity: busy ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: type.body, fontWeight: '700', color: colors.textPrimary }}>{device.name}</Text>
              <Text style={{ marginTop: 2, fontSize: type.meta, color: colors.textMuted }}>
                {transportLabel(device.deviceType)} · {stripScheme(device.address)}
                {busy === 'connect' && active ? ' · conectando…' : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function isLikelyPrinter(name: string) {
  return /print|pos|epson|xp-?|mpt|star|thermal|ticket|impresor|rongta|goojprt|milestone/i.test(name);
}

function stripScheme(address: string) {
  return address.replace(/^(bt|ble|lan|tcp):/i, '');
}

function transportLabel(deviceType: DiscoveredPrinter['deviceType']) {
  if (deviceType === 'ble') return 'BLE';
  if (deviceType === 'dual') return 'Bluetooth / BLE';
  return 'Bluetooth';
}
