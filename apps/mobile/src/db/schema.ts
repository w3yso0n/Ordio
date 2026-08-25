import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull(),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  isActive: integer('is_active').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
  isPinned: integer('is_pinned').notNull().default(0),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const cashiers = sqliteTable('cashiers', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  pinHash: text('pin_hash'),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  totalCents: integer('total_cents').notNull(),
  payload: text('payload').notNull(),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  operation: text('operation').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
});
