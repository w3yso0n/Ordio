import Constants from 'expo-constants';

const PROD_API = 'https://api-ordio.dogix.tech/api';

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
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) return fromEnv;

  const fromExtra = String(Constants.expoConfig?.extra?.apiUrl ?? '').replace(/\/$/, '');
  if (fromExtra) return fromExtra;

  const host = packagerHost();
  if (host) return `http://${host}:3001/api`;

  return PROD_API;
}

export const API = apiBaseUrl();
