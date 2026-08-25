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

export async function getSecureItem(key: string): Promise<string | null> {
  if (!(await canUseNative())) {
    return Platform.OS === 'web' ? webGet(key) : (memory.get(key) ?? null);
  }
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (!(await canUseNative())) {
    if (Platform.OS === 'web') webSet(key, value);
    else memory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (!(await canUseNative())) {
    webDelete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
