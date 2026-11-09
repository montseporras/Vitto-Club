# Decisiones de arquitectura y de producto (ADR)

Cada archivo registra **una** decisión: el contexto, qué se decidió y qué consecuencias tiene.
Para crear uno nuevo, usar la [plantilla](../plantillas/adr.md).

| # | Decisión | Estado |
|---|---|---|
| [001](./001-monolito-modular-hexagonal.md) | Backend como monolito modular hexagonal; frontend por feature | Vigente |
| [002](./002-transaccion-ambiente.md) | Transacción ambiente con `@nestjs-cls/transactional` detrás de un puerto propio | Vigente |
| [003](./003-prisma-7-estable.md) | Prisma 7 estable con driver adapter de `pg` (se descarta "Prisma Next") | Vigente |
| [004](./004-decisiones-de-autenticacion.md) | Tabla de decisiones de autenticación y sesiones | Vigente (ver nota del archivo) |
| [005](./005-registro-de-clientes-orquestado-por-accounts.md) | El registro de clientes lo orquesta `accounts` | Vigente (verificado el 09/11/2026: `CustomerRegistrationService` en `accounts`) |
| [006](./006-unicidad-documento-y-email-de-clientes.md) | Documento y email de cliente únicos solo entre clientes activos | Vigente (reemplaza una decisión anterior) |
| [007](./007-bcrypt-y-limite-de-72-bytes.md) | Hash con bcryptjs y contraseña limitada a 72 bytes | Vigente |

**Decisiones de los Sprints 3 y 4.** No tienen ADR propio: están en los contratos (S3 §8.3, "decisiones del
17/10"; S4 §8.3, S4-1 a S4-20), en el cierre del Sprint 3 (S3-01 a S3-42 y D-01 a D-38) y, las que se
tomaron al programar cada historia, en
[decisiones de implementación](../seguimiento/decisiones-de-implementacion.md).
