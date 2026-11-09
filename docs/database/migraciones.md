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
| 2026-10-17 | `sprint_3_consumptions_points` | Sprint 3, primera versión: crea `consumptions`, `points_lots`, `points_movements` y `points_adjustments`, los enums `ConsumptionStatus`, `PointsMovementType`, `PointsLotStatus`, `Level` y `AdjustmentDirection`, y los umbrales de niveles en la configuración. Sin comentario en el SQL |
| 2026-10-17 | `sprint3_schema` | Sprint 3, modelo final (contrato S3 §3.12): crea `customer_points` y `audit_logs` con los enums de auditoría; agrega `accounts.must_change_password`; rehace las columnas de `consumptions` (`registered_by_*`, `voided_by_*`, `voided_reason`) y de `points_movements` (`performed_by_*`); `points_lots` pasa a `accredited_at` y `expired_at`; `employees.phone` pasa a nullable; umbrales por defecto 300 y 800. Borra `points_adjustments` y los enums `Level` y `AdjustmentDirection`. Cambia el email único de `employees` y `accounts` a único **entre activos** (`employees_active_email_key`, `accounts_active_email_key`) |
| 2026-10-19 | `sprint3_us57_audit_triggers` | US-56 (el nombre de la migración usa la numeración vieja, US-57): triggers que hacen `audit_logs` solo inserción (rechazan `UPDATE`, `DELETE` y `TRUNCATE`) |
| 2026-10-20 | `consumption_naming_and_voided_lot` | Renombra "compra" → "consumo" en lo que ya estaba en la base (`FirstConsumptionBonusType`, `CONSUMPTION_CREDIT`, `FIRST_CONSUMPTION_BONUS_UPDATED`, tabla `first_consumption_bonus_configuration` y sus constraints) y agrega `VOIDED` a `PointsLotStatus` |
| 2026-11-07 | `sprint4_base4_rewards_redemptions` | BASE-4 (contrato S4 §3.15): crea `rewards` y `redemptions`, los enums `RewardStatus`, `RewardDisabledReason`, `RedemptionStatus` y `RedemptionOrigin`, y la columna `points_movements.redemption_id`. Escribe a mano los `CHECK` y el índice único parcial del nombre de la recompensa. **Se aborta con error** si hay movimientos `REDEMPTION` viejos (de seeds): hay que borrarlos antes en desarrollo |

> **Faltan del Sprint 3** (no hay migración): el trigger de solo inserción de `points_movements` y los
> `CHECK` de la §3.12 del contrato del Sprint 3. Ver [modelo de datos](./modelo-de-datos.md#sprint-3).

## Advertencias que figuran en los docs

- Antes de aplicar `employee_email_unique` en Neon, revisar si hay emails de empleados repetidos: la
  migración borra los duplicados.
- Las migraciones de unicidad de clientes cortan con un mensaje claro si ya hay duplicados; hay que
  resolverlos a mano.
- `prisma migrate dev` no corre en terminales no interactivas; usar `migrate deploy`. `migrate reset`
  borra datos.
- Después de traer una migración nueva: `npx prisma migrate deploy` y `npx prisma generate` desde
  `backend/` (aviso del 20/10). Si aparecen errores de tipos de Prisma ("Property 'auditLog' does not
  exist"), el cliente quedó generado con un schema viejo: `npx prisma generate` lo arregla sin tocar la base.
- `sprint4_base4_rewards_redemptions` falla si la base de desarrollo tiene movimientos `REDEMPTION` de
  seeds viejos. Borrarlos y volver a correrla.
- Las migraciones se nombran por sprint e historia: `sprint4_base4_rewards_redemptions`. Solo la historia
  dueña del modelo (BASE, BASE-4) crea la migración de su sprint.

## Detalle de loyalty

Persistencia y versionado del programa de puntos: [persistencia-puntos](./persistencia-puntos.md).
Comandos diarios de Prisma: [prisma](./prisma.md).
