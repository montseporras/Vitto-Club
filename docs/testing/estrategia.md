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
- `test/setup-e2e-env.ts` fija `DATABASE_URL` en la base de tests, `BCRYPT_COST` en 4 y
  `POINTS_EXPIRATION_CRON_ENABLED=false`. Los crons de recompensas y canjes (US-37 y US-44) **todavía no**
  se apagan ahí: solo los apagan `rewards-expiration.e2e-spec.ts` y `redemptions-expiration.e2e-spec.ts`
  al principio del archivo. En las demás suites esos dos procesos corren una vez al iniciar la app de cada
  spec, antes de que el spec cargue sus datos (ver [SETUP](../SETUP.md#25-procesos-automáticos)).

### Orden de limpieza

Las claves foráneas son `onDelete: Restrict`, así que se borra de las hojas a la raíz. Desde el Sprint 4
los canjes apuntan a clientes, cuentas y recompensas, y los movimientos apuntan a canjes:

```ts
await prisma.pointsMovement.deleteMany(); // apunta a lotes, consumos y canjes
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

Si una suite deja un canje sin borrar, la siguiente que borre clientes o cuentas falla por la clave
foránea, aunque el problema no sea suyo. `fix/BASE-4-descripcion-canje-back` agregó el borrado de canjes y
recompensas a las 20 suites que existían.

`points_movements` se puede borrar porque el trigger de solo inserción todavía no existe (pendiente A-02
del Sprint 3). Cuando se agregue, la limpieza de los e2e va a tener que cambiar. `audit_logs` sí tiene el
trigger y no se puede vaciar: los specs que la consultan guardan el último id antes de cada caso y leen
solo las filas con id mayor (`where: { id: { gt: lastAuditId } }`).

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
| Auditoría (US-56, US-57) | `audit`, `audit-query` |
| Transacciones | `transactions` |
| Modelo del Sprint 4 (BASE-4: `CHECK`, índices, enums) | `base4-schema` |
| `PointsService.canjear` (FIFO, `REDEMPTION`, bloqueo) | `points-redemption` |
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
