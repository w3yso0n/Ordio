import Constants from 'expo-constants';

function packagerHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const host = value.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  return null;
}

export function apiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  const host = packagerHost();
  if (host) return `http://${host}:3001/api`;
  return 'http://localhost:3001/api';
}

export const API = apiBaseUrl();
