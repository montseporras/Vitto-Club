# ADR 003 — Prisma 7 estable con driver adapter de `pg`

**Estado:** vigente.

## Contexto

`npx prisma init` con el CLI de la RC de Prisma 8 ya no genera `schema.prisma`. `npx prisma orm init`
generó un esquema para **"Prisma Next"**, un motor experimental distinto, incompatible con el resto del
proyecto (`seed.ts` y `@prisma/client` estaban escritos para el Prisma clásico). Convivían dos sistemas
y producían errores.

## Decisión

- Abandonar "Prisma Next".
- Fijar **Prisma `7.10.0`** (última versión no-RC).
- Prisma 7 ya no admite `url = env(...)` en `datasource`: la URL para migraciones va en
  `prisma.config.ts` y el `PrismaClient` usa `@prisma/adapter-pg`.

## Consecuencias

- Dependencias: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `@types/pg`.
- El `postinstall` ejecuta `prisma generate`.
- Si alguien actualiza a Prisma 8 cuando salga estable, hay que revisar esta configuración.

## Detalle

Configuración final y comandos diarios: [prisma](../database/prisma.md).
