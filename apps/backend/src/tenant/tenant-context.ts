import { AsyncLocalStorage } from 'async_hooks';
import { QueryRunner } from 'typeorm';

export const tenantAls = new AsyncLocalStorage<QueryRunner>();

export function getTenantQueryRunner(): QueryRunner {
  const qr = tenantAls.getStore();
  if (!qr) {
    throw new Error('Tenant QueryRunner missing from request context');
  }
  return qr;
}

export function getTenantManager() {
  return getTenantQueryRunner().manager;
}
