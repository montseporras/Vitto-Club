# Vitto Club — Backend

API en NestJS del proyecto Vitto Club. Ver el [README de la raíz](../README.md)
para el estado general del proyecto (qué está hecho, qué se revisó, qué queda
pendiente).

## Stack

- **NestJS 12** (ESM, `"type": "module"` en `package.json`).
- **Prisma 7** con `@prisma/adapter-pg` como driver adapter de PostgreSQL —
  ver [PRISMA.md](./PRISMA.md) para el porqué de esta configuración y los
  comandos de día a día (`migrate dev`, `db seed`, `studio`).
- **PostgreSQL 16** vía Docker (`docker-compose.yml` en la raíz del repo).

## Requisitos

- Node.js 22 LTS o superior (probado también con Node 24).
- Docker Desktop.

Para que el resto del equipo arranque sin preguntar:

## Arranque

1. `cp backend/.env.example backend/.env`
2. `docker compose up -d db` (desde la raíz del repo)
3. `cd backend && npm install`
4. `npx prisma migrate dev`
5. `npx prisma db seed` (opcional, carga datos de prueba)
6. `npm run start:dev`

- Backend: http://localhost:3000/api/health
- Base de datos: `localhost:5433` (usuario `vitto` / password `vitto_dev` / base `vitto_club`)
- Prisma Studio: `npx prisma studio`

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

> **Nota:** los tests corren en modo ESM (`"type": "module"`): `ts-jest` emite
> ESM y Jest se lanza con `--experimental-vm-modules` (ya incluido en los
> scripts). En ESM el objeto `jest` no es global, así que se expone desde
> `test/jest-esm-globals.ts`; en los specs se sigue usando `jest.fn()` sin
> importarlo.

### Tests e2e

`npm run test:e2e` corre contra una base separada, `vitto_club_test`, para no
pisar los datos de desarrollo. Necesita:

1. La base levantada: `docker compose up -d db`.
2. La base de tests creada (una sola vez por máquina):
   `docker exec vitto_db createdb -U vitto vitto_club_test`
3. `DATABASE_URL_TEST` en `backend/.env` (ver `.env.example`).

Las migraciones se aplican solas a la base de tests antes de cada corrida
(`test/global-setup-e2e.ts`); el setup también crea la tabla de auditoría
exclusivamente en esa base local protegida por nombre. Los tests **se niegan a correr** si
`DATABASE_URL_TEST` no apunta a `localhost`/`127.0.0.1` o si el nombre de la
base no contiene `test` (`test/e2e-database.ts`).

Corren en serie (`--runInBand`) porque comparten la base. Cada spec limpia en
un `beforeEach` las tablas que usa, en orden de claves foráneas (`sessions`,
`accounts`, y después `employees` y `customers`).

## Auditoría (solo develop)

`GET /api/auditoria` devuelve un listado paginado, reservado a ADMIN. Acepta
`performedBy`, `category` (`SESSION`, `CUSTOMERS`, `EMPLOYEES`,
`CONFIGURATION`), `documentType`, `documentNumber`, `date` o el rango
`fromDate`/`toDate` (fechas ISO `YYYY-MM-DD`), además de `page` y `limit`
(máximo 100). No existen endpoints de modificación o eliminación; un trigger
PostgreSQL también rechaza `UPDATE` y `DELETE`.

La tabla se crea fuera de las migraciones normales de Prisma para evitar que
un `migrate deploy` en otro entorno la aplique. Solo en la base de desarrollo,
desde `backend/` en PowerShell:

```powershell
$env:APP_ENV = 'develop'
npm run db:audit:migrate:develop
```

El script requiere `APP_ENV=develop`, rechaza `NODE_ENV=production` y exige
`DATABASE_URL`; compruebe que la URL apunte a la base de desarrollo antes de
ejecutarlo. El valor recomendado `APP_ENV=develop` está en `.env.example`.

Para conectar la pantalla del frontend (base URL, autenticación, filtros,
ejemplo de llamada y forma de la respuesta), consultar
[docs/auditoria-api.md](../docs/auditoria-api.md). La tabla debe existir en la
base de desarrollo antes de consultar el endpoint.

## Resources

- [PRISMA.md](./PRISMA.md) — historial de cómo quedó configurado Prisma y comandos de uso diario.
- [Documentación de NestJS](https://docs.nestjs.com).
