export class NetworkError extends Error {
  constructor(message = 'Sin conexión') {
    super(message);
    this.name = 'NetworkError';
  }
}

const NETWORK_RE =
  /network request failed|failed to fetch|fetch failed|unknownhost|unable to resolve host|no address associated|enotfound|eai_again|econnrefused|econnreset|etimedout|socketexception|connectexception|java\.net\.|internet|timed?\s?out|aborted|offline|dns|failed to connect|cleartext|sslhandshake/i;

function errorText(err: unknown, depth = 0): string {
  if (err == null || depth > 4) return '';
  if (typeof err === 'string') return err;
  const e = err as { message?: string; name?: string; cause?: unknown; code?: string };
  return [e.name, e.message, e.code, String(err), errorText(e.cause, depth + 1)]
    .filter(Boolean)
    .join(' ');
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof NetworkError) return true;
  return NETWORK_RE.test(errorText(err));
}

export function shouldQueueLocally(err: unknown): boolean {
  if (isNetworkError(err)) return true;
  const name = (err as { name?: string })?.name;
  if (name === 'AuthError') return true;
  const status = (err as { status?: number })?.status;
  if (status === 401 || status === 408 || status === 429 || (status != null && status >= 500)) return true;
  const text = errorText(err);
  if (/caja abierta/i.test(text)) return false;
  return /sin conexión|invalid token/i.test(text);
}

export function saleErrorMessage(err: unknown): string {
  const status = (err as { status?: number })?.status;
  const raw = ((err as Error)?.message || errorText(err)).trim();
  if (/caja abierta/i.test(raw)) {
    return 'Hoy no hay caja abierta. Ábrela desde el panel para enviar a cocina o cobrar.';
  }
  if (/order not found/i.test(raw) || status === 404) {
    return 'Esta cuenta ya no está en el servidor. Cierra sesión, activa de nuevo la caja y arma el pedido otra vez.';
  }
  if (/invalid token|unauthorized|sesión caducó|device token/i.test(raw) || status === 401) {
    return 'La sesión de esta caja ya no vale. Cierra sesión y actívala de nuevo con el código de sucursal.';
  }
  return raw || 'No se pudo completar. Reintenta.';
}
