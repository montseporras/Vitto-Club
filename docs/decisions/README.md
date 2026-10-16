# Decisiones de arquitectura y de producto (ADR)

Cada archivo registra **una** decisión: el contexto, qué se decidió y qué consecuencias tiene.
Para crear uno nuevo, usar la [plantilla](../plantillas/adr.md).

| # | Decisión | Estado |
|---|---|---|
| [001](./001-monolito-modular-hexagonal.md) | Backend como monolito modular hexagonal; frontend por feature | Vigente |
| [002](./002-transaccion-ambiente.md) | Transacción ambiente con `@nestjs-cls/transactional` detrás de un puerto propio | Vigente |
| [003](./003-prisma-7-estable.md) | Prisma 7 estable con driver adapter de `pg` (se descarta "Prisma Next") | Vigente |
| [004](./004-decisiones-de-autenticacion.md) | Tabla de decisiones de autenticación y sesiones | Vigente (ver nota del archivo) |
| [005](./005-registro-de-clientes-orquestado-por-accounts.md) | El registro de clientes lo orquesta `accounts` | Vigente según los docs; falta verificar contra el código |
| [006](./006-unicidad-documento-y-email-de-clientes.md) | Documento y email de cliente únicos solo entre clientes activos | Vigente (reemplaza una decisión anterior) |
| [007](./007-bcrypt-y-limite-de-72-bytes.md) | Hash con bcryptjs y contraseña limitada a 72 bytes | Vigente |
