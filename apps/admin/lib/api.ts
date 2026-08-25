const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ordio_token');
}

export async function api(path: string, init: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const msg = Array.isArray(json.message) ? json.message.join(', ') : json.message;
      throw new Error(msg || text || res.statusText);
    } catch (err) {
      if (err instanceof SyntaxError) throw new Error(text || res.statusText);
      throw err;
    }
  }
  return res.json();
}
