import { kvGet as storeGet, kvSet as storeSet } from '../db/client.native';

export function kvGet(key: string): string | null {
  return storeGet(key);
}

export function kvSet(key: string, value: string) {
  storeSet(key, value);
}

export function kvGetJson<T>(key: string): T | null {
  const raw = kvGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function kvSetJson(key: string, value: unknown) {
  kvSet(key, JSON.stringify(value));
}
