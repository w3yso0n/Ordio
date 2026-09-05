import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { apiFetch, hasApiConnection } from '../lib/api';
import { addProductToTicket, useTicket } from '../lib/ticket-store';
import { pendingKitchenQty } from '../lib/order-engine';
import {
  loadCachedCatalog,
  parseCatalogSnapshot,
  patchCachedPin,
  saveCachedCatalog,
  type CatalogCategory,
  type CatalogProduct,
} from '../lib/catalog-cache';
import { pinProduct } from '../lib/orders-api';
import { saveCachedSession } from '../lib/local-checks';
import { confirmSignOut } from '../lib/session';
import { flushSyncQueue, pendingCount } from '../lib/sync-queue';
import { formatMxn } from '@ordio/shared';
import { Screen } from '../ui/screen';
import { colors, radius, space, type } from '../theme';

export default function SaleScreen() {
  const ticket = useTicket();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [tab, setTab] = useState<string>('frequent');
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [queued, setQueued] = useState(0);

  function applyCatalog(catalog: { products: CatalogProduct[]; categories: CatalogCategory[] }, keepTab = true) {
    setProducts(catalog.products);
    setCategories(catalog.categories);
    setTab((current) => {
      if (keepTab && (current === 'frequent' || catalog.categories.some((c) => c.id === current))) return current;
      return catalog.products.some((p) => p.isPinned) ? 'frequent' : catalog.categories[0]?.id ?? 'frequent';
    });
  }

  async function fetchCatalog() {
    const data = await apiFetch('/catalog/snapshot');
    const catalog = parseCatalogSnapshot(data);
    saveCachedCatalog(catalog);
    applyCatalog(catalog);
  }

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const online = await hasApiConnection();
      setOffline(!online);
      setQueued(pendingCount());
      if (!online) {
        const cached = loadCachedCatalog();
        if (cached) applyCatalog(cached);
        if (!silent) {
          Alert.alert('Sin conexión', 'Se muestra el catálogo guardado. Las cuentas se suben cuando vuelva internet.');
        }
        return;
      }
      await fetchCatalog();
      try {
        const session = await apiFetch('/cash/sessions/current');
        if (session?.id) {
          saveCachedSession({
            id: session.id,
            branchId: session.branchId,
            openedByUserId: session.openedByUserId,
          });
        }
      } catch {
        /* Sin caja abierta: se avisa al enviar. */
      }
      await flushSyncQueue();
      setQueued(pendingCount());
    } catch {
      const cached = loadCachedCatalog();
      if (cached) applyCatalog(cached);
      setOffline(true);
      if (!silent) Alert.alert('Sin conexión', 'No se pudo actualizar. Sigue el catálogo del teléfono.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cached = loadCachedCatalog();
      if (cached) applyCatalog(cached);
      setQueued(pendingCount());
      void refresh(true);
    }, [refresh]),
  );

  const pinned = useMemo(() => products.filter((p) => p.isPinned), [products]);
  const visible = tab === 'frequent' ? pinned : products.filter((p) => p.categoryId === tab);
  const count = ticket.items.reduce((sum, item) => sum + item.qty, 0);
  const pending = pendingKitchenQty(ticket);
  const footerLabel =
    ticket.dailyNumber != null
      ? `#${ticket.dailyNumber} · ${formatMxn(ticket.totalCents)}`
      : `Pedido · ${formatMxn(ticket.totalCents)}`;

  async function persistPin(product: CatalogProduct, isPinned: boolean) {
    setProducts((list) => list.map((item) => (item.id === product.id ? { ...item, isPinned } : item)));
    patchCachedPin(product.id, isPinned);
    try {
      await pinProduct(product.id, isPinned);
    } catch {
      Alert.alert('No se pudo guardar', 'Quedó marcado en este teléfono y se sube cuando haya red.');
    }
  }

  function askPin(product: CatalogProduct) {
    const next = !product.isPinned;
    Alert.alert(
      next ? 'Mostrar primero' : 'Quitar de frecuentes',
      next
        ? `«${product.name}» va a aparecer en Frecuentes.`
        : `«${product.name}» ya no aparecerá en Frecuentes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: next ? 'Fijar' : 'Quitar', onPress: () => void persistPin(product, next) },
      ],
    );
  }

  return (
    <Screen
      padded={false}
      footer={
        count > 0 ? (
          <Pressable
            onPress={() => router.push('/confirm')}
            accessibilityRole="button"
            accessibilityLabel={`Ver pedido, ${count} artículos, ${formatMxn(ticket.totalCents)}`}
            style={({ pressed }) => ({
              marginHorizontal: space[12],
              marginBottom: space[12],
              minHeight: 52,
              borderRadius: radius.lg,
              backgroundColor: pressed ? colors.brandPressed : colors.brand,
              paddingHorizontal: space[16],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            })}
          >
            <Text style={{ color: colors.onBrand, fontSize: type.secondary, fontWeight: '700' }}>
              {count} {count === 1 ? 'artículo' : 'artículos'}
              {pending > 0 ? ` · ${pending} pend.` : ''}
            </Text>
            <Text style={{ color: colors.onBrand, fontSize: type.body, fontWeight: '800' }}>
              {footerLabel}
            </Text>
          </Pressable>
        ) : null
      }
    >
      <View
        style={{
          paddingHorizontal: space[16],
          paddingTop: space[8],
          paddingBottom: space[4],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[8], flex: 1 }}>
          <Text style={{ fontSize: type.title, fontWeight: '700', color: colors.textPrimary }}>Venta</Text>
          <Pressable
            onPress={() => void refresh(false)}
            disabled={refreshing}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Actualizar catálogo"
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.brandMuted : colors.surfaceSecondary,
              opacity: refreshing ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{refreshing ? '…' : '↻'}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[8] }}>
          <Pressable
            onPress={() => router.push('/checks' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Cuentas abiertas"
            style={({ pressed }) => ({
              minHeight: 32,
              paddingHorizontal: 12,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.brandPressed : colors.brand,
            })}
          >
            <Text style={{ color: colors.onBrand, fontSize: type.meta, fontWeight: '800' }}>Cuentas</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/printer' as Href)} hitSlop={10}>
            <Text style={{ color: colors.textMuted, fontSize: type.meta, fontWeight: '600' }}>Impresora</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/kitchen-preview' as Href)} hitSlop={10}>
            <Text style={{ color: colors.textMuted, fontSize: type.meta, fontWeight: '600' }}>80 mm</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              confirmSignOut('Salir borra la sesión de esta caja. Para volver a vender, activa el dispositivo otra vez.')
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Text style={{ color: colors.textMuted, fontSize: type.meta, fontWeight: '600' }}>Salir</Text>
          </Pressable>
        </View>
      </View>
      {offline || queued > 0 ? (
        <Text
          style={{
            paddingHorizontal: space[16],
            paddingBottom: space[4],
            fontSize: type.meta,
            color: colors.textMuted,
          }}
        >
          {[
            offline ? 'Sin red · se vende en el teléfono' : null,
            queued > 0 ? `${queued} ${queued === 1 ? 'cambio' : 'cambios'} por sincronizar` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}

      {products.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: space[16], paddingVertical: space[8], gap: 6 }}
        >
          <Chip label="Frecuentes" active={tab === 'frequent'} onPress={() => setTab('frequent')} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} active={tab === c.id} onPress={() => setTab(c.id)} />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space[12], paddingBottom: space[12], flexDirection: 'row', flexWrap: 'wrap' }}
      >
        {products.length === 0 ? (
          <View style={{ width: '100%', padding: space[32], alignItems: 'center' }}>
            <Text style={{ fontSize: type.title, fontWeight: '700', color: colors.textPrimary }}>Sin productos</Text>
            <Text style={{ fontSize: type.secondary, color: colors.textSecondary, marginTop: space[8], textAlign: 'center' }}>
              El catálogo se guarda en el teléfono. Con red, toca ↻ para traer productos nuevos.
            </Text>
          </View>
        ) : visible.length === 0 ? (
          <View style={{ width: '100%', padding: space[32], alignItems: 'center' }}>
            <Text style={{ fontSize: type.title, fontWeight: '700', color: colors.textPrimary }}>
              {tab === 'frequent' ? 'Sin frecuentes' : 'Sin productos'}
            </Text>
            <Text style={{ fontSize: type.secondary, color: colors.textSecondary, marginTop: space[8], textAlign: 'center' }}>
              {tab === 'frequent'
                ? 'Mantén presionado un producto para mostrarlo aquí primero.'
                : 'Agrega productos a esta categoría en el panel.'}
            </Text>
          </View>
        ) : (
          visible.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => addProductToTicket({ id: p.id, name: p.name, priceCents: p.priceCents })}
              onLongPress={() => askPin(p)}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${formatMxn(p.priceCents)}`}
              style={({ pressed }) => ({
                width: '48%',
                margin: '1%',
                minHeight: 76,
                backgroundColor: pressed ? colors.brandMuted : colors.surface,
                borderWidth: 1,
                borderColor: pressed ? colors.brand : colors.border,
                borderRadius: radius.md,
                paddingHorizontal: space[12],
                paddingVertical: space[12],
                justifyContent: 'space-between',
              })}
            >
              <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                {p.name}
              </Text>
              <Text style={{ marginTop: 6, fontSize: type.meta, fontWeight: '600', color: colors.textSecondary, fontVariant: ['tabular-nums'] }}>
                {formatMxn(p.priceCents)}
                {p.isPinned ? '  · fijo' : ''}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={4}
      style={{
        minHeight: 28,
        paddingHorizontal: 10,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.brandMuted : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: active ? '700' : '600',
          color: active ? colors.brand : colors.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
