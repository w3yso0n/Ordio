export class NetworkError extends Error {
  constructor(message = 'Sin conexión') {
    super(message);
    this.name = 'NetworkError';
  }
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof NetworkError) return true;
  const message = String((err as Error)?.message ?? err ?? '');
  return /network|failed to fetch|internet|timeout|aborted|network request failed/i.test(message);
}

export function shouldQueueLocally(err: unknown): boolean {
  if (isNetworkError(err)) return true;
  const name = (err as { name?: string })?.name;
  if (name === 'AuthError') return true;
  const status = (err as { status?: number })?.status;
  if (status === 401 || status === 408 || status === 429 || (status != null && status >= 500)) return true;
  const message = String((err as Error)?.message ?? '');
  return /caja abierta|sin conexión|invalid token/i.test(message);
}
