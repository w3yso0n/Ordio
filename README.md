# Ordio POS (MVP offline-first)

Guía de uso (flujos de caja, admin y arranque): [USO.md](./USO.md).

Monorepo pnpm:

- `apps/backend` NestJS + TypeORM + RLS
- `apps/admin` Next.js
- `apps/mobile` Expo
- `packages/shared` tipos, dinero, ESC/POS, schemas

## Arranque

```bash
pnpm install
pnpm --filter @ordio/backend setup-db
pnpm --filter @ordio/backend migration:run
pnpm --filter @ordio/backend seed
pnpm --filter @ordio/backend start:dev
pnpm --filter @ordio/admin dev
pnpm --filter @ordio/mobile start
```

Admin: `owner@ordio.local` / `ordio-admin`  
Pairing: `ORDIO-DEMO`  PIN cajeros: `1234`

El runtime de Nest usa `ordio_app`, nunca `postgres`. Login/pair pasan por funciones `SECURITY DEFINER`.
