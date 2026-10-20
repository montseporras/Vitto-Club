# Migraciones

Carpeta: `backend/prisma/migrations/`. Las descripciones salen de los comentarios de cada
`migration.sql`; donde la migración no tiene comentario, la fila lo aclara.

| Fecha | Migración | Qué hace |
|---|---|---|
| 2026-09-08 | `init` | Tablas iniciales (empleados y clientes, en español) |
| 2026-09-20 | `translate_models_to_english` | Elimina las tablas en español y crea `employees` / `customers` con nombres en inglés (no es un rename; solo había datos de seed) |
| 2026-09-22 | `add_customer_status_history` | Crea `customer_status_changes` |
| 2026-10-05 | `employee_email_unique` | Email único en `employees`. **Deduplica**: conserva el de id más bajo por email |
| 2026-10-05 | `add_accounts_and_sessions` | Crea `accounts` y `sessions` (con el CHECK de dueño coherente con el rol) |
| 2026-10-05 | `account_identifier` | Renombra la columna de login a `identifier`, con el largo de `employees.email` |
| 2026-10-06 | `account_email` | Renombra `identifier` a `email`; las cuentas de cliente que guardaban el documento pasan al email |
| 2026-10-06 | `customers_unique_among_active` | Documento y email únicos solo entre clientes activos |
| 2026-10-07 | `customers_unique_email_all` | Documento y email únicos entre **todos** los clientes (decisión del PO del 07/10) |
| 2026-10-07 | `add_loyalty_points_configuration` | Tabla de equivalencia monto/puntos (sin comentario en el SQL) |
| 2026-10-07 | `add_points_validity_configuration` | Tabla de vigencia de puntos (sin comentario en el SQL) |
| 2026-10-07 | `add_first_purchase_bonus_configuration` | Tabla de bonificación de primer consumo (sin comentario en el SQL) |
| 2026-10-07 | `version_loyalty_program_configuration` | Configuración versionada; conserva los últimos valores singleton como versión 1 sin borrar las filas legado |
| 2026-10-08 | `customers_unique_among_active_final` | Vuelve a únicos solo entre **activos** (decisión final del PO del 08/10). Reemplaza a `unique_email_all` |
| 2026-10-08 | `set_percentage_bonus_minimum_to_one` | Exige mínimo 1 % en bonificaciones por porcentaje. **Se aborta con error** si hay valores menores a 1 |
| 2026-10-20 | `consumption_naming_and_voided_lot` | Renombra "compra" → "consumo" en lo que ya estaba en la base (`FirstConsumptionBonusType`, `CONSUMPTION_CREDIT`, `FIRST_CONSUMPTION_BONUS_UPDATED`, tabla `first_consumption_bonus_configuration` y sus constraints) y agrega `VOIDED` a `PointsLotStatus` |

## Advertencias que figuran en los docs

- Antes de aplicar `employee_email_unique` en Neon, revisar si hay emails de empleados repetidos: la
  migración borra los duplicados.
- Las migraciones de unicidad de clientes cortan con un mensaje claro si ya hay duplicados; hay que
  resolverlos a mano.
- `prisma migrate dev` no corre en terminales no interactivas; usar `migrate deploy`. `migrate reset`
  borra datos.

## Detalle de loyalty

Persistencia y versionado del programa de puntos: [persistencia-puntos](./persistencia-puntos.md).
Comandos diarios de Prisma: [prisma](./prisma.md).
