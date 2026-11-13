# Estrategia de testing

## Tipos de test (backend)

| Tipo | Comando (desde `backend/`) | Qué necesita | Dónde |
|---|---|---|---|
| Unitarios | `npm test` | Nada: no usan base de datos | `*.spec.ts` junto al código |
| End to end (e2e) | `npm run test:e2e` | Docker y la base `vitto_club_test` | `backend/test/*.e2e-spec.ts` |
| Cobertura | `npm run test:cov` | — | — |

Los tests corren en modo ESM (`"type": "module"`): `ts-jest` emite ESM y Jest se lanza con
`--experimental-vm-modules` (ya incluido en los scripts). El objeto `jest` no es global en ESM; se expone
desde `test/jest-esm-globals.ts`.

## Base de datos de los e2e

1. Levantar la base: `docker compose up -d db`.
2. Crear la base de tests **una sola vez por máquina**:
   `docker exec vitto_db createdb -U vitto vitto_club_test`.
3. Definir `DATABASE_URL_TEST` en `backend/.env` (viene en `.env.example`).

Protecciones:

- Las migraciones se aplican solas antes de cada corrida (`test/global-setup-e2e.ts`).
- Los e2e **se niegan a correr** si `DATABASE_URL_TEST` no apunta a `localhost`/`127.0.0.1` o si el nombre
  de la base no contiene `test` (`test/e2e-database.ts`).
- Corren en serie (`--runInBand`) porque comparten la base. Cada spec limpia en un `beforeEach` las tablas
  que usa, respetando el orden de claves foráneas.
- `test/setup-e2e-env.ts` fija `DATABASE_URL` en la base de tests, `BCRYPT_COST` en 4 y deja apagados los tres
  crons que existen: `POINTS_EXPIRATION_CRON_ENABLED`, `REWARDS_EXPIRATION_CRON_ENABLED` y
  `REDEMPTIONS_EXPIRATION_CRON_ENABLED` en `false` (ARRASTRE-S4). Los tests que los prueban llaman al
  servicio directamente. Desde BASE-5 fija también `IMAGES_STORAGE_ENABLED=false` y
  `NOTIFICATIONS_EMAIL_ENABLED=false`: los e2e usan los adaptadores falsos de `ImageStorage` y de
  `EmailSender` y **nunca** llaman a Cloudinary ni a Resend. Los crons nuevos del Sprint 5 (misiones,
  notificaciones y promociones programadas) van a sumar su variable acá cuando los agregue cada historia.

### Orden de limpieza

Las claves foráneas son `onDelete: Restrict`, así que se borra de las hojas a la raíz. Desde el Sprint 4
los canjes apuntan a clientes, cuentas y recompensas, y los movimientos apuntan a canjes:

```ts
await deleteNotifications(prisma);        // Sprint 5: solo si el spec crea notificaciones (apunta a clientes y envíos)
await prisma.promotionSend.deleteMany();  // Sprint 5: apunta a empleados
await deletePointsMovements(prisma);      // apunta a lotes, consumos, canjes y misiones de clientes
await prisma.customerMission.deleteMany(); // Sprint 5: apunta a misiones y clientes
await prisma.mission.deleteMany();
await prisma.pointsLot.deleteMany();
await prisma.customerPoints.deleteMany();
await prisma.redemption.deleteMany();     // apunta a clientes, cuentas y recompensas
await prisma.reward.deleteMany();
await prisma.consumption.deleteMany();
await prisma.session.deleteMany();
await prisma.account.deleteMany();
await prisma.employee.deleteMany();
await prisma.customer.deleteMany();
```

Un spec solo borra lo que su historia usa. Las líneas de misiones, notificaciones y envíos aparecen solo en
los specs que crean esas filas (`base5-schema` y `points-bonus`); los demás siguen con la lista del Sprint 4,
porque esas tablas están vacías.

Si una suite deja un canje sin borrar, la siguiente que borre clientes o cuentas falla por la clave
foránea, aunque el problema no sea suyo. `fix/BASE-4-descripcion-canje-back` agregó el borrado de canjes y
recompensas a las 20 suites que existían.

**Tablas de solo inserción.** `points_movements` (desde ARRASTRE-S4) y `notifications` (desde BASE-5) tienen un
trigger que rechaza `DELETE`, así que un `deleteMany()` directo falla. Los e2e las vacían con dos helpers de
`backend/test/`: `delete-points-movements.ts` y `delete-notifications.ts`. Cada uno apaga el trigger
**solo dentro de una transacción**, borra y lo vuelve a prender; si algo falla, la transacción se deshace y el
trigger queda prendido. Es solo para tests: la aplicación nunca borra esas filas. Los specs
`points-movements-integrity` y `base5-schema` comprueban que, después del helper, el trigger sigue prendido.

`audit_logs` también tiene el trigger y **no** se vacía con un helper: los specs que la consultan guardan el
último id antes de cada caso y leen solo las filas con id mayor (`where: { id: { gt: lastAuditId } }`).

## Por qué los e2e usan base real

Un rollback no se puede probar con una base falsa. Los tests de transacciones y eventos comprueban, contra
Postgres real, que una escritura no confirmada no se ve desde otra conexión.

## Suites documentadas

| Tema | Documento |
|---|---|
| Autenticación, sesiones, guards, matriz de permisos | [auth](./auth.md) |
| Transacción ambiente y eventos de dominio | [transacciones-y-eventos](./transacciones-y-eventos.md) |
| Programa de puntos | [loyalty](./loyalty.md) |

## Suites e2e por tema (`backend/test/`)

| Tema | Suites |
|---|---|
| Autenticación y permisos | `auth-http`, `auth-integration`, `auth-sessions`, `endpoint-permissions` |
| Cuentas y clientes | `accounts-abmc`, `customer-registration`, `customer-account-creation`, `customers-admin`, `my-profile` |
| Configuración | `loyalty`, `loyalty-levels` |
| Consumos (US-21, US-22, US-23) | `consumptions`, `consumptions-query` |
| Puntos (US-19, US-24, US-25, US-26) | `customer-points`, `points-adjustments`, `points-expiration`, `points-movements` |
| Integridad de `points_movements` (ARRASTRE-S4: solo inserción y `CHECK`) | `points-movements-integrity` |
| Auditoría (US-56, US-57) | `audit`, `audit-query` |
| Transacciones | `transactions` |
| Modelo del Sprint 4 (BASE-4: `CHECK`, índices, enums) | `base4-schema` |
| `PointsService.canjear` (FIFO, `REDEMPTION`, bloqueo) | `points-redemption` |
| Modelo del Sprint 5 (BASE-5: `CHECK`, índices, trigger de `notifications`, valores por defecto) | `base5-schema` |
| `PointsService.acreditarBonificacion` (`MISSION_REWARD`, `BIRTHDAY_BONUS`; no toca `lifetime_points`) | `points-bonus` |
| Mensajes automáticos, envío común, reenvío e historial de notificaciones (US-14) | `notifications-messages`, `notifications-history`, `notifications-send` |
| Recompensas (US-34 a US-39) | `rewards-create`, `rewards-edit`, `rewards-status`, `rewards-delete`, `rewards-expiration`, `rewards-catalog` |
| Canjes (US-40 a US-45) | `redemptions-confirm`, `redemptions-by-code`, `redemptions-use`, `redemptions-reject-cancel`, `redemptions-expiration`, `redemptions-query` |

Las reglas de arquitectura del Sprint 4 (módulos sin ciclos, sin reintegro) están en un test unitario:
`backend/src/architecture.spec.ts`.

Algunos criterios de US-35, US-36 y US-38 los tiene que probar la historia que construye el endpoint:
están en [verificaciones pendientes de recompensas](../seguimiento/verificaciones-pendientes-recompensas.md).

## Conteo

Ver el último conteo en [estado actual](../seguimiento/estado-actual.md#verificación). Los números de
cada suite en [auth](./auth.md) son de octubre y no se reejecutaron.

`npx tsc --noEmit` sobre todo el backend marca errores de tipos en algunos e2e (`supertest`), conocidos
desde el Sprint 3 (`test/audit-query.e2e-spec.ts` y `test/loyalty.e2e-spec.ts`). No afectan el build.

## Frontend

El frontend **no tiene framework de tests** (Vitest y Testing Library no están instalados; pendiente
D-17). La verificación es `npm run lint`, `npm run build` y un recorrido manual con MSW
(`frontend/src/mocks/handlers/`), criterio por criterio, como dice `frontend/CLAUDE.md` §6.

Los mocks simulan lo que hace el backend según el contrato, con datos propios. Ojo: el saldo del Cliente
en `my-account.handlers.ts` y el de Caja en `cashier.handlers.ts` son independientes, así que registrar un
uso en Caja no cambia el saldo que ve el Cliente. Con el backend real el saldo es uno solo.

## Lo que no hay

- **No hay CI**: los tests corren solo en local.
- No se probó nada contra Neon.
