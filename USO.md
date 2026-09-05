# Uso de Ordio

Ordio es un POS offline-first para **negocios pequeños**: tienda, cafetería, fonda, kiosco o el mix que sea. El catálogo, las cajas y las sucursales son por organización, no hay un giro fijo. La caja vende en el teléfono, el dueño administra en la web y Nest guarda todo en Postgres con aislamiento por tenant (RLS).

Los precios van en **centavos**. `$35.00` se guarda como `3500`.

## Piezas

| App | Carpeta | Puerto | Para qué |
| --- | --- | --- | --- |
| API | `apps/backend` | `3001` | Auth, catálogo, órdenes, cobro, caja, admin |
| Admin | `apps/admin` | `3002` | Dashboard, sucursales, productos, cajeros, ventas |
| Caja | `apps/mobile` | Metro `8081` | Pairing, PIN, venta, cobro, abrir/cerrar caja |
| Shared | `packages/shared` | — | Tipos, dinero, ticket ESC/POS |

La API vive bajo `/api`. El WebSocket de eventos es `http://localhost:3001/events` (catálogo y caja; no hay `order.updated`).

## Primera vez

Hace falta Node, pnpm, Postgres y la base `ordio`. Copia `apps/backend/.env.example` a `apps/backend/.env` y apunta las URLs a tu instancia. El runtime de Nest usa el rol `ordio_app`, no `postgres`.

```bash
pnpm install
pnpm --filter @ordio/backend setup-db
pnpm --filter @ordio/backend migration:run
pnpm --filter @ordio/backend seed
```

`setup-db` crea el rol `ordio_app`. `seed` carga dos tenants de prueba (ver credenciales más abajo).

## Arranque diario

Tres terminales, o los scripts de la raíz:

```bash
pnpm dev:backend    # API :3001 (compila @ordio/shared antes)
pnpm dev:admin      # http://localhost:3002
pnpm dev:mobile     # Expo / Metro :8081
```

Comprueba la API: `GET http://localhost:3001/api/health`.

En el teléfono usa Expo Go y el QR de Metro. En un dispositivo físico, `localhost` es el propio teléfono: define `EXPO_PUBLIC_API_URL` (por ejemplo `http://192.168.1.167:3001/api`) en el entorno de la app móvil. El default es `http://localhost:3001/api`, válido en emulador o web.

EAS ya está ligado al proyecto (`eas.json` + `projectId` en `app.json`). No hace falta para desarrollar en Expo Go. Úsalo cuando quieras un development client o un binario de preview/producción.

## Credenciales de demo (seed)

| Quién | Dato |
| --- | --- |
| Admin tenant A | `owner@ordio.local` / `ordio-admin` |
| Pairing sucursal A | `ORDIO-DEMO` |
| Cajeros A (Caja 1 y Caja 2) | PIN `1234` |
| Admin tenant B | `owner-b@ordio.local` / `ordio-admin` |
| Pairing sucursal B | `ORDIO-B` |

El seed de sucursal A trae un catálogo de ejemplo (bebidas y comida). Es solo demo: en el admin se dan de alta los productos reales del negocio. Los importes son MXN.

## Cómo funciona un día en caja

La app arranca en **activar dispositivo** (`/pair`).

1. **Pairing** — El encargado escribe el código de sucursal (`ORDIO-DEMO`). El servidor crea un `device` y devuelve JWT de tipo dispositivo. Se guarda en SecureStore (`deviceToken` + `refreshToken`). Un dispositivo queda atado a esa sucursal.
2. **PIN** — Con el token de dispositivo pide el snapshot del catálogo (incluye cajeros de la sucursal). Eliges cajero, escribes el PIN y obtienes un JWT de cajero (`cashierToken`).
3. **Abrir el día (admin)** — En el panel, **Caja**: elige sucursal, escribe el fondo inicial y **Abrir día**. Sin esto la app no puede tomar cuentas.
4. **Vender** — Tocar producto → pedido. **Enviar a cocina** deja la cuenta abierta (#14). **Cobrar ahora** cierra esa cuenta.
5. **Cuentas** — Lista de cuentas abiertas. Tocás una para seguir agregando o cobrar.
6. **Cerrar el día (admin)** — En **Caja**, el panel muestra fondo, ventas en efectivo/tarjeta y lo que debería haber. Contás el cajón, escribís el efectivo y **Cerrar día**. No deja cerrar si hay cuentas abiertas.

## Cómo funciona el admin

Abre `http://localhost:3002` → redirige a `/login`.

1. Entras con el owner.
2. **Dashboard** — Ventas del día, total, efectivo vs tarjeta, desglose por hora.
3. **Caja** — Abrir y cerrar el día por sucursal: fondo inicial, lo esperado y el efectivo contado. La app no abre ni cierra caja.
4. **Sucursales** — CRUD de sucursales: nombre, dirección y código de pairing (si lo dejas vacío se genera). Ese código es el que escribe la caja en `/pair`.
5. **Productos** — Elige sucursal, luego categorías y catálogo (alta, edición y baja). Un cambio emite `catalog.updated` por WebSocket a esa sucursal (`cash.session.changed` cuando abre o cierra caja).
6. **Usuarios** — Cajeros y admins: nombre, PIN, sucursal y rol. El owner no se borra.
7. **Ventas** — Lista de tickets cobrados de la organización.

El token admin se guarda en `localStorage` (`ordio_token`). Si caduca, la UI te manda otra vez a login.

## Qué hace el backend por debajo

- Prefijo `/api`, CORS abierto, JWT.
- Cada request abre una transacción y, si el JWT trae organización, ejecuta `SET LOCAL app.current_org_id` (RLS). Login y pairing no “saltan” RLS: resuelven usuario/sucursal con funciones `SECURITY DEFINER` y después hacen `SET LOCAL`.
- Tipos de token: `admin` (panel), `device` (terminal emparejada), `cashier` (cajero + device + sucursal). Caja y órdenes exigen token con `deviceId`.
- `Idempotency-Key` en `PUT`/`POST` evita dobles cobros si la red se cae a mitad del sync.
- Una orden abierta solo la puede tocar el device que la creó.
- El rol de runtime es `ordio_app` (sin `BYPASSRLS`). Migraciones y seed usan `DATABASE_ADMIN_URL`.

### Endpoints que usa el flujo

```
POST /api/auth/admin/login
POST /api/auth/device/pair
POST /api/auth/pin
POST /api/auth/refresh
GET  /api/auth/me

GET  /api/catalog/snapshot

PUT  /api/orders/:id
POST /api/orders/:id/pay

GET  /api/cash/sessions/current
POST /api/cash/sessions/:id/movements

GET  /api/admin/dashboard/today
GET  /api/admin/cash?branchId=
POST /api/admin/cash/open
POST /api/admin/cash/:id/close
GET/POST /api/admin/branches
PUT/DELETE /api/admin/branches/:id
GET/POST /api/admin/categories?branchId=
PUT/DELETE /api/admin/categories/:id
GET/POST /api/admin/products?branchId=
PUT/DELETE /api/admin/products/:id
GET  /api/admin/sales
GET/POST /api/admin/users
PUT/DELETE /api/admin/users/:id
```

## Impresora

En la caja: **Venta → Impresora**. Empareja la térmica en Ajustes > Bluetooth del teléfono, búsca en la app y elígela. Queda guardada en el dispositivo. Al enviar a cocina y al cobrar se manda ESC/POS por Bluetooth Classic (SPP). Sin impresora elegida la venta sigue igual.

Bluetooth Classic no entra en Expo Go: hace falta un development build (`pnpm --filter @ordio/mobile exec expo run:android` o el perfil `development` de EAS). `EXPO_PUBLIC_PRINTER_ADDRESS` (MAC o `bt:AA:BB:CC:DD:EE:FF`) sirve de respaldo si aún no hay una impresora guardada.

## Aislar tenants

Con `ORDIO-DEMO` vendes en el tenant A. Con `ORDIO-B` emparejas otro teléfono al tenant B. El owner A no debe ver ventas ni productos de B: Postgres filtra por `app.current_org_id`. Hay un e2e en `apps/backend/test/rls.e2e-spec.ts` (`pnpm test:e2e`).

## Estado actual (MVP)

- La venta en pantalla es local en memoria; SQLite (`ordio.db`) y `sync_queue` están definidos para el camino offline, pero las pantallas actuales pegan a la API en el momento del cobro.
- El pairing no se recuerda al reabrir la app: el índice redirige siempre a `/pair`.
- La impresora Bluetooth imprime desde un development build; Expo Go no alcanza.
- Los movimientos de caja (depósito, retiro, gasto) existen en la API; la app móvil solo abre y cierra.
- No se puede borrar una sucursal si todavía tiene categorías/productos activos, dispositivos emparejados o historial de caja/ventas.
- EAS no interviene en `expo start`.
