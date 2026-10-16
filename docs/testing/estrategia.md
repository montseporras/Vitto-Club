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
- En los e2e, `BCRYPT_COST` se fija en 4.

## Por qué los e2e usan base real

Un rollback no se puede probar con una base falsa. Los tests de transacciones y eventos comprueban, contra
Postgres real, que una escritura no confirmada no se ve desde otra conexión.

## Suites documentadas

| Tema | Documento |
|---|---|
| Autenticación, sesiones, guards, matriz de permisos | [auth](./auth.md) |
| Transacción ambiente y eventos de dominio | [transacciones-y-eventos](./transacciones-y-eventos.md) |
| Programa de puntos | [loyalty](./loyalty.md) |

## Conteo informado

Al 2026-10-06 los documentos de traspaso informaban 457 tests unitarios y 73 e2e en verde. **No fueron
reejecutados al reordenar la documentación.** Los números de cada suite en [auth](./auth.md) tampoco.

## Frontend

El frontend usa MSW para simular la API; los handlers están en `frontend/src/mocks/handlers/`. **No hay
documentación de tests automatizados del frontend** en lo que revisé.

## Lo que no hay

- **No hay CI**: los tests corren solo en local.
- No se probó nada contra Neon.
