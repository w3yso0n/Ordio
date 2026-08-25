import { DataSource } from 'typeorm';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

const envPath = join(__dirname, '../../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const ssl =
  process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_ADMIN_URL,
  ssl,
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
});
