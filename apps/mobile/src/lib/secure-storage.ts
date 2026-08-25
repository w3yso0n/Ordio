import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memory = new Map<string, string>();

async function canUseNative(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

function webGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function webSet(key: string, value: string) {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

function webDelete(key: string) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
  memory.delete(key);
}

/** Android SecureStore only allows [A-Za-z0-9._-]. */
function nativeKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export async function getSecureItem(key: string): Promise<string | null> {
  const safe = nativeKey(key);
  if (!(await canUseNative())) {
    if (Platform.OS === 'web') return webGet(safe) ?? webGet(key);
    return memory.get(safe) ?? memory.get(key) ?? null;
  }
  return SecureStore.getItemAsync(safe);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  const safe = nativeKey(key);
  if (!(await canUseNative())) {
    if (Platform.OS === 'web') webSet(safe, value);
    else memory.set(safe, value);
    return;
  }
  await SecureStore.setItemAsync(safe, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  const safe = nativeKey(key);
  if (!(await canUseNative())) {
    webDelete(key);
    webDelete(safe);
    return;
  }
  await SecureStore.deleteItemAsync(safe);
}
