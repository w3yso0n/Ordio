import { API } from './host';
import { NetworkError, isNetworkError } from './network';
import { deleteSecureItem, getSecureItem, setSecureItem } from './secure-storage';

export { API } from './host';

export class AuthError extends Error {
  constructor(message = 'La sesión caducó. Vuelve a entrar con tu PIN.') {
    super(message);
    this.name = 'AuthError';
  }
}

type TokenKind = 'cashier' | 'device';

export type JwtClaims = {
  exp?: number;
  typ?: string;
  branchId?: string;
  deviceId?: string;
  userId?: string;
  sub?: string;
};

const ACCESS_KEY: Record<TokenKind, string> = {
  cashier: 'cashierToken',
  device: 'deviceToken',
};

const REFRESH_KEY: Record<TokenKind, string> = {
  cashier: 'cashierRefreshToken',
  device: 'refreshToken',
};

const inflight: Partial<Record<TokenKind, Promise<string | null>>> = {};

function decodeBase64Url(part: string): string {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  if (typeof globalThis.atob === 'function') return globalThis.atob(padded);
  const BufferImpl = (globalThis as { Buffer?: { from(data: string, enc: string): { toString(enc: string): string } } })
    .Buffer;
  if (BufferImpl) return BufferImpl.from(padded, 'base64').toString('utf8');
  throw new Error('base64');
}

export function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    return JSON.parse(decodeBase64Url(part)) as JwtClaims;
  } catch {
    return null;
  }
}

function isExpired(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now() + 30_000;
}

type RefreshResult =
  | { kind: 'ok'; accessToken: string; refreshToken?: string }
  | { kind: 'invalid' }
  | { kind: 'network' };

async function postRefresh(refreshToken: string): Promise<RefreshResult> {
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.accessToken) {
      return { kind: 'ok', accessToken: data.accessToken, refreshToken: data.refreshToken };
    }
    if (res.status === 401) return { kind: 'invalid' };
    return { kind: 'network' };
  } catch {
    return { kind: 'network' };
  }
}

export async function hasStoredSession(kind: TokenKind) {
  return Boolean((await getSecureItem(ACCESS_KEY[kind])) || (await getSecureItem(REFRESH_KEY[kind])));
}

export async function peekAccessToken(kind: TokenKind) {
  return getSecureItem(ACCESS_KEY[kind]);
}

export async function saveSession(
  kind: TokenKind,
  tokens: { accessToken: string; refreshToken?: string },
) {
  await setSecureItem(ACCESS_KEY[kind], tokens.accessToken);
  if (tokens.refreshToken) await setSecureItem(REFRESH_KEY[kind], tokens.refreshToken);
}

export async function clearCashierSession() {
  await deleteSecureItem('cashierToken');
  await deleteSecureItem('cashierRefreshToken');
}

export async function ensureAccessToken(kind: TokenKind, force = false): Promise<string | null> {
  if (inflight[kind]) return inflight[kind]!;
  inflight[kind] = (async () => {
    const current = await getSecureItem(ACCESS_KEY[kind]);
    if (!force && current && !isExpired(current)) return current;

    const refresh = await getSecureItem(REFRESH_KEY[kind]);
    if (!refresh) return current;

    const next = await postRefresh(refresh);
    if (next.kind === 'ok') {
      await saveSession(kind, next);
      return next.accessToken;
    }
    if (next.kind === 'invalid') {
      if (kind === 'cashier') await clearCashierSession();
      return null;
    }
    return current;
  })();
  try {
    return await inflight[kind]!;
  } finally {
    inflight[kind] = undefined;
  }
}

export async function hasApiConnection(): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(`${API}/health`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function authHeaders(extra?: Record<string, string>) {
  const token = await ensureAccessToken('cashier');
  return {
    Authorization: token ? `Bearer ${token}` : '',
    ...extra,
  };
}

export async function apiFetch(path: string, init?: RequestInit) {
  const extra = (init?.headers ?? {}) as Record<string, string>;
  const token = await ensureAccessToken('cashier');
  if (!token) throw new AuthError();

  const run = async (access: string) => {
    const headers = {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...extra,
      Authorization: `Bearer ${access}`,
    };
    const res = await fetch(`${API}${path}`, { ...init, headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        typeof data?.message === 'string'
          ? data.message
          : Array.isArray(data?.message)
            ? data.message.join(', ')
            : `Error ${res.status}`;
      const err = new Error(message) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return data;
  };

  try {
    return await run(token);
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err) || err instanceof TypeError) throw new NetworkError();
    const status = (err as { status?: number }).status;
    const message = String((err as Error)?.message ?? '');
    if (status === 401 || /invalid token|missing token|unauthorized/i.test(message)) {
      const next = await ensureAccessToken('cashier', true);
      if (!next) throw new AuthError();
      try {
        return await run(next);
      } catch (retryErr) {
        if ((retryErr as { status?: number }).status === 401) throw new AuthError();
        if (isNetworkError(retryErr) || retryErr instanceof TypeError) throw new NetworkError();
        throw retryErr;
      }
    }
    throw err;
  }
}
