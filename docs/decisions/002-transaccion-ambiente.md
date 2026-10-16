# ADR 002 — Transacción ambiente con `@nestjs-cls/transactional` detrás de un puerto propio

**Estado:** vigente. Adoptada tras el spike del 2026-10-05.
**Informe completo del spike:** [spike-transacciones](../seguimiento/historico/spike-transacciones.md).

## Contexto

Hay operaciones que escriben en dos módulos y tienen que ser atómicas: registrar un cliente (cliente +
cuenta), dar de baja a un empleado (empleado + cuenta), cambiar un rol. Con `PrismaService` directo en
cada repositorio, dos módulos no pueden compartir una transacción sin pasarse el cliente de Prisma por
parámetro, lo que filtraría Prisma a `application/`.

## Opciones

| | Decorador `@Transactional()` | Puerto propio sobre la librería |
|---|---|---|
| Uso en el caso de uso | Decorador en el método | Se inyecta un puerto y se llama `run(fn)` |
| Dependencia en `application/` | Importa de `@nestjs-cls/transactional` | Ninguna externa |
| Cambiar de librería | Tocar cada caso de uso | Tocar solo el adaptador |

## Decisión

**Puerto propio** (`TransactionRunner` por módulo), con la librería como implementación en
`backend/src/prisma/prisma-transaction-runner.ts`. Los repositorios usan el `client` del runner en lugar
de `PrismaService`.

## Consecuencias

- Lo lento (hashear una contraseña) se hace **antes** de abrir la transacción: Prisma corta las
  transacciones interactivas a los 5 segundos por defecto.
- El repositorio de `customers` usaba `prisma.$transaction([...])`, forma que el cliente de una
  transacción ambiente no tiene. Ver [deuda técnica](../seguimiento/deuda-tecnica.md).
- No se probó contra Neon, solo contra el Postgres local.

## Detalle

Explicación paso a paso: [transacciones y eventos](../conceptos-transversales/transacciones-y-eventos.md).
