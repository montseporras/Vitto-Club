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

> **Nota:** actualmente `npm run test` y `npm run test:e2e` fallan por un
> conflicto entre ESM (`"type": "module"`) y la config por defecto de
> Jest/ts-jest, que compila a CommonJS. Ver el README de la raíz, sección
> "Pendiente", para el detalle. No afecta a `start:dev`, a las migraciones ni
> al seed, que sí funcionan.

## Resources

- [PRISMA.md](./PRISMA.md) — historial de cómo quedó configurado Prisma y comandos de uso diario.
- [Documentación de NestJS](https://docs.nestjs.com).
