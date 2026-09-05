import { openDatabaseSync } from 'expo-sqlite';

const sqlite = openDatabaseSync('ordio.db');

sqlite.execSync(`
CREATE TABLE IF NOT EXISTS kv (key text primary key, value text not null);
CREATE TABLE IF NOT EXISTS sync_queue (
  id text primary key,
  operation text not null,
  idempotency_key text not null,
  payload text not null,
  status text not null,
  attempts integer not null default 0,
  last_error text,
  created_at integer not null default 0
);
`);

try {
  sqlite.execSync(`ALTER TABLE sync_queue ADD COLUMN created_at integer not null default 0`);
} catch {
  /* already exists */
}

export function kvGet(key: string): string | null {
  try {
    const row = sqlite.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function kvSet(key: string, value: string) {
  sqlite.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
}

export function queueInsert(row: {
  id: string;
  operation: string;
  idempotencyKey: string;
  payload: string;
}) {
  sqlite.runSync(
    `INSERT INTO sync_queue (id, operation, idempotency_key, payload, status, attempts, created_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?)`,
    [row.id, row.operation, row.idempotencyKey, row.payload, Date.now()],
  );
}

export function queuePendingCount(): number {
  try {
    const row = sqlite.getFirstSync<{ n: number }>(
      `SELECT COUNT(*) as n FROM sync_queue WHERE status = 'pending'`,
    );
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

export function queuePending(): Array<{ id: string; payload: string }> {
  return sqlite.getAllSync<{ id: string; payload: string }>(
    `SELECT id, payload FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC, id ASC`,
  );
}

export function queueFail(id: string, error: string) {
  sqlite.runSync(`UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`, [
    error,
    id,
  ]);
}

export function queueUpdatePayload(id: string, payload: string) {
  sqlite.runSync(`UPDATE sync_queue SET payload = ? WHERE id = ?`, [payload, id]);
}

export function queueDone(id: string) {
  sqlite.runSync(`UPDATE sync_queue SET status = 'done' WHERE id = ?`, [id]);
}

export function queueClear() {
  sqlite.runSync(`DELETE FROM sync_queue`);
}
