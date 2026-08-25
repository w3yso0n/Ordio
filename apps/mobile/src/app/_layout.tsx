import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { hasApiConnection } from '../lib/api';
import { getSecureItem } from '../lib/secure-storage';
import { flushSyncQueue } from '../lib/sync-queue';
import { colors } from '../theme';

export default function RootLayout() {
  useEffect(() => {
    const sync = () => {
      void (async () => {
        if (!(await getSecureItem('cashierToken'))) return;
        if (await hasApiConnection()) await flushSyncQueue();
      })();
    };
    sync();
    const timer = setInterval(sync, 20_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}
