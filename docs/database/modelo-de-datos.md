# Modelo de datos

Fuente: `backend/prisma/schema.prisma` y las migraciones de `backend/prisma/migrations/`. Este documento
resume lo que hay ahí; **ante cualquier diferencia, mandan el schema y las migraciones**. Motor:
PostgreSQL 16 (Docker en local; Neon en producción).

Actualizado el 12/11/2026 con lo que está en `develop` al cierre del Sprint 4 (Sprints 1 a 4), el arrastre
del Sprint 4 (ARRASTRE-S4) y la base del Sprint 5 (BASE-5). Los contratos que definen cada parte son
`docs/sprint-3/API_CONTRACT_SPRINT_3.md` §3.12 y §3.9.6, `docs/sprint-4/API_CONTRACT_SPRINT_4.md` §3.15 y
`docs/sprint-5/API_CONTRACT_SPRINT_5.md` §3.15.

## Entidades

### Personas, cuentas y sesiones (Sprints 1 y 2)

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `Employee` | `employees` | Empleados: nombre, apellido, teléfono (opcional), email, rol y baja lógica. No hay reactivación |
| `Customer` | `customers` | Clientes: documento, email, teléfono (opcional), fecha de nacimiento (opcional) y baja lógica. No hay reactivación |
| `CustomerStatusChange` | `customer_status_changes` | Historial de bajas de un cliente (nunca se borra). `ACTIVATED` solo queda en filas viejas |
| `Account` | `accounts` | Credenciales (email, hash, rol) de un empleado o un cliente, `must_change_password` y estado. La cuenta de un **empleado** se puede reactivar |
| `Session` | `sessions` | Una fila por sesión; guarda el SHA-256 del refresh token |

### Configuración del programa de puntos (Sprints 2 y 3)

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `LoyaltyProgramConfiguration` | `loyalty_program_configurations` | Versión inmutable de toda la configuración: equivalencia, vigencia, bonificación por primer consumo y umbrales de niveles (`silver_min_points`, por defecto 300; `gold_min_points`, por defecto 800). Una sola versión activa. **Sprint 5 (BASE-5):** suma el beneficio de cada nivel (`bronze_benefit`, `silver_benefit` y `gold_benefit`, texto informativo que no cambia los puntos) y `frequent_min_consumptions` (mínimo de consumos de un cliente frecuente, por defecto 3) |
| `LoyaltyPointsConfiguration` | `loyalty_points_configuration` | **Legado.** Se importó como versión 1 de la configuración; la app no la lee |
| `LoyaltyPointsValidityConfiguration` | `loyalty_points_validity_configuration` | **Legado**, ídem |
| `FirstConsumptionBonusConfiguration` | `first_consumption_bonus_configuration` | **Legado**, ídem |

### Consumos y puntos (Sprint 3)

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `Consumption` | `consumptions` | Consumo registrado en caja: monto, puntos, bonificación, observaciones, **snapshot** de la configuración usada (versión, monto base y puntos), quién lo registró y, si se anuló, cuándo, quién y por qué. Nunca se edita. El código visible `C-000141` sale del id y no se guarda |
| `CustomerPoints` | `customer_points` | Una fila por cliente: saldo (puede ser negativo), deuda y puntos acumulados (`lifetime_points`, definen el nivel). Nace con el **primer movimiento** del cliente, no con el alta (decisión S3-01): sin fila, saldo 0 y nivel Bronce |
| `PointsLot` | `points_lots` | Lote de puntos acreditados, con su propio vencimiento (snapshot de la vigencia al acreditar). Lo crea un consumo (uno como máximo por consumo) o un ajuste "Sumar" |
| `PointsMovement` | `points_movements` | Libro de movimientos de puntos, con signo y saldo resultante. Se escribe solo por inserción |

### Recompensas y canjes (Sprint 4, BASE-4)

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `Reward` | `rewards` | Recompensa del catálogo: nombre, descripción, puntos, stock (`null` = sin límite), vencimiento (`DATE`, `null` = no vence), estado, motivo de deshabilitación, canjes usados (`used_count`) y baja lógica (`deleted_at`). Sprint 5 (BASE-5): `photo_public_id` y `photo_url` (la foto vive en Cloudinary; ver [Sprint 5](#misiones-notificaciones-e-imágenes-sprint-5-base-5)) |
| `Redemption` | `redemptions` | Canje: código de 6 caracteres, cliente, recompensa, **snapshot** del nombre y los puntos de la recompensa al confirmar, origen (app o caja), quién lo confirmó y quién lo resolvió, motivo de rechazo y saldos antes y después (solo si se usó) |

### Misiones, notificaciones e imágenes (Sprint 5, BASE-5)

Las tablas y columnas existen desde BASE-5 (migración `sprint5_base5_missions_notifications`). Las pantallas
y los endpoints que las usan los agrega cada historia del Sprint 5.

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `Mission` | `missions` | Misión mensual: nombre, descripción, tipo de objetivo, objetivo, condición (días y franja horaria), recompensa en puntos (`null` = sin recompensa), mes de inicio y de fin, estado y baja lógica (`deleted_at`) |
| `CustomerMission` | `customer_missions` | La misión de un cliente en un mes: **snapshot** del objetivo, la condición y la recompensa, progreso, estado, fechas de completada, reclamada y vencida, quién la reclamó (`CUSTOMER` o `SYSTEM`) y motivo del vencimiento |
| `NotificationTemplate` | `notification_templates` | Un mensaje por tipo **automático** (vencimiento de puntos, cumpleaños y misiones): activo, asunto y cuerpo. Promociones no tiene plantilla |
| `Notification` | `notifications` | Cada notificación: tipo, canal, destinatario, cliente, asunto, mensaje, estado, error, fecha, el envío de promoción (si es una) y el original (si es un reenvío). Solo inserción |
| `PromotionSend` | `promotion_sends` | Cada envío de promoción: asunto, mensaje, nivel (o todos), fecha programada, estado (`SCHEDULED`, `SENT`, `CANCELLED`), destinatarios y quién lo cargó. **No hay tabla de promociones** (S5-36) |
| `NotificationSettings` | `notification_settings` | Fila única (`id = 1`): puntos de regalo por cumpleaños. **Sin logo** (S5-35) |

Las imágenes **no se guardan en la base**: viven en Cloudinary. `rewards` y `customers` guardan solo
`photo_public_id` y `photo_url`; la URL solo se guarda para las públicas (recompensas), y la foto de perfil de
un cliente se entrega con una URL firmada que se genera en cada respuesta.

### Auditoría (Sprint 3, US-56)

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `AuditLog` | `audit_logs` | Registro de operaciones sensibles: actor (empleado o Sistema, nunca un cliente), módulo, acción, descripción, cliente afectado (snapshot, sin clave foránea), código de operación y `details` (arreglo ordenado de `{ label, value }`). Solo inserción |

## Enums

| Enum | Valores | Notas |
|---|---|---|
| `EmployeeRole` | `ADMIN`, `CASHIER` | |
| `AccountRole` | `ADMIN`, `CASHIER`, `CUSTOMER` | |
| `DocumentType` | `DNI`, `PASSPORT` | |
| `CustomerStatusAction` | `DEACTIVATED`, `ACTIVATED` | `ACTIVATED` ya no se escribe (no hay reactivación de clientes) |
| `FirstConsumptionBonusType` | `PERCENTAGE`, `FIXED_AMOUNT` | Antes `FirstPurchaseBonusType` (renombrado el 20/10) |
| `ConsumptionStatus` | `REGISTERED`, `VOIDED` | `VOIDED` es final |
| `PointsLotStatus` | `ACTIVE`, `CONSUMED`, `EXPIRED`, `VOIDED` | `VOIDED` = se anuló su consumo (agregado el 20/10) |
| `PointsMovementType` | `CONSUMPTION_CREDIT`, `VOID_REVERSAL`, `MANUAL_ADJUSTMENT`, `EXPIRATION`, `REDEMPTION`, `MISSION_REWARD`, `BIRTHDAY_BONUS` | No existe ningún tipo de reintegro (decisión S4-1). `MISSION_REWARD` y `BIRTHDAY_BONUS` (Sprint 5) son puntos de regalo: crean un lote y **no suman a `lifetime_points`** |
| `MissionStatus` | `ACTIVE`, `DELETED` | `DELETED` es final (el botón dice "Eliminar") |
| `MissionObjectiveType` | `CONSUMPTION_COUNT`, `CONSUMPTION_AMOUNT` | Qué mide la misión: cantidad de consumos o monto acumulado |
| `CustomerMissionStatus` | `IN_PROGRESS`, `COMPLETED`, `CLAIMED`, `EXPIRED` | `COMPLETED` es final si la misión no tiene recompensa (S5-4) |
| `NotificationType` | `POINTS_EXPIRING`, `BIRTHDAY`, `PROMOTION`, `MISSION` | `PROMOTION` no tiene plantilla ni interruptor (S5-37) |
| `NotificationChannel` | `EMAIL` | El único canal (S5-10) |
| `NotificationStatus` | `SENT`, `FAILED`, `SKIPPED` | `SKIPPED`: el tipo estaba desactivado o el envío de correos está apagado en el entorno |
| `PromotionSendStatus` | `SCHEDULED`, `SENT`, `CANCELLED` | |
| `RewardStatus` | `ACTIVE`, `DISABLED`, `INACTIVE`, `DELETED` | `DISABLED` lo pone solo el Sistema; `DELETED` es final (el botón dice "Eliminar") |
| `RewardDisabledReason` | `OUT_OF_STOCK`, `EXPIRED` | Solo con `status = DISABLED` |
| `RedemptionStatus` | `CONFIRMED`, `USED`, `REJECTED`, `CANCELLED`, `EXPIRED` | Nace `CONFIRMED`; los otros cuatro son finales. **No existe "Pendiente"** |
| `RedemptionOrigin` | `APP`, `COUNTER` | |
| `AuditActorType` | `EMPLOYEE`, `SYSTEM` | |
| `AuditModule` | `EMPLOYEES`, `CUSTOMERS`, `CONSUMPTIONS`, `POINTS`, `REDEMPTIONS`, `REWARDS`, `MISSIONS`, `CONFIGURATION` | `MISSIONS` es del Sprint 5 |
| `AuditAction` | 39 acciones | Lista completa, con su texto y su sprint: contrato del Sprint 3 §3.9.2, del Sprint 4 §3.14 y del Sprint 5 §2.8. Las de `MISSIONS`, `LOGO_AND_MESSAGES_UPDATED` y `PROMOTIONS_UPDATED` existen en la base desde el Sprint 3 y se usan en el Sprint 5 (`PROMOTIONS_UPDATED` no se usa: las promociones ya no se guardan, S5-36). BASE-5 suma `BIRTHDAY_BONUS_GRANTED` (módulo `POINTS`, actor Sistema) y `FREQUENT_CUSTOMERS_UPDATED` (módulo `CONFIGURATION`) |

El nivel (`BRONZE`, `SILVER`, `GOLD`) **no es un enum de la base**: se calcula con `lifetime_points` y los
umbrales de la configuración vigente (`points/domain/level.ts`). La primera migración del Sprint 3 creó
los enums `Level` y `AdjustmentDirection`, y la segunda los borró.

## Relaciones

```
Employee      1 ── 0..1 Account ── 0..N Session
Customer      1 ── 0..1 Account
Customer      1 ── 0..N CustomerStatusChange
Customer      1 ── 0..1 CustomerPoints
Customer      1 ── 0..N Consumption ── 0..1 PointsLot
Customer      1 ── 0..N PointsLot
Customer      1 ── 0..N PointsMovement
Customer      1 ── 0..N Redemption
Reward        1 ── 0..N Redemption
Redemption    1 ── 0..N PointsMovement (REDEMPTION; en la práctica, uno solo y solo si se usó)
PointsLot     1 ── 0..N PointsMovement
Consumption   1 ── 0..N PointsMovement (CONSUMPTION_CREDIT y VOID_REVERSAL)
LoyaltyProgramConfiguration (version) 1 ── 0..N Consumption
Account       1 ── 0..N Consumption (registró / anuló)
Account       1 ── 0..N PointsMovement (lo hizo; null = Sistema)
Account       1 ── 0..N Redemption (confirmó en la caja / resolvió)
Mission         1 ── 0..N CustomerMission
Customer        1 ── 0..N CustomerMission
CustomerMission 1 ── 0..1 PointsMovement (MISSION_REWARD, solo si se reclamó)
Customer        1 ── 0..N Notification
PromotionSend   1 ── 0..N Notification (PROMOTION)
Notification    1 ── 0..1 Notification (reenvío)
Employee        1 ── 0..N PromotionSend
```

Todas las claves foráneas usan `onDelete: Restrict`. `audit_logs` no tiene claves foráneas: guarda copias.

## Restricciones relevantes

Prisma no modela `CHECK` ni índices por expresión: los que figuran acá están **escritos a mano** en la
migración que se indica.

### Sprints 1 y 2

| Restricción | Dónde | Detalle |
|---|---|---|
| Un solo dueño, coherente con el rol | `accounts` | `accounts_owner_matches_role_check`: `CUSTOMER` → `customer_id`; `ADMIN`/`CASHIER` → `employee_id` |
| Email único entre **activos** | `employees`, `accounts`, `customers` | Índices únicos parciales `employees_active_email_key`, `accounts_active_email_key` y `customers_active_email_key` (`WHERE is_active = true`). Un registro dado de baja libera el email. Además, los servicios controlan que el email no lo use otro cliente o empleado activo |
| Documento único entre clientes activos | `customers` | `customers_active_document_key`. Ver [ADR 006](../decisions/006-unicidad-documento-y-email-de-clientes.md) |
| Un empleado, una cuenta | `accounts.employee_id` | `UNIQUE`. Por eso la cuenta del empleado se reactiva en lugar de crear otra |
| Una sola versión activa del programa | `loyalty_program_configurations` | `loyalty_program_configurations_one_active_key` (único parcial) y los `CHECK` `…_base_pair_check`, `…_bonus_pair_check`, `…_validity_check` y `…_validity_dates_check` |
| Refresh token único | `sessions.token_hash` | `UNIQUE`; nunca se guarda el token |
| Fila única de configuración (legado) | tablas singleton | La clave primaria vale `1` (`…_singleton_check`) |

### Sprint 3

| Restricción | Dónde | Detalle |
|---|---|---|
| Solo inserción | `audit_logs` | Triggers `audit_logs_immutable` y `audit_logs_no_truncate` (migración `sprint3_us57_audit_triggers`): rechazan `UPDATE`, `DELETE` y `TRUNCATE` |
| Un lote por consumo | `points_lots.consumption_id` | `UNIQUE` |
| Solo inserción | `points_movements` | Triggers `points_movements_immutable` y `points_movements_no_truncate` (migración `sprint4_arrastre_points_movements_integrity`, ARRASTRE-S4): rechazan `UPDATE`, `DELETE` y `TRUNCATE`. Los e2e vacían la tabla con `test/delete-points-movements.ts` |
| Un movimiento nunca vale 0 | `points_movements` | `points_movements_points_check`: `points <> 0`. Un consumo que da 0 puntos se registra **sin** movimiento (decisión D-07, opción a) |
| Ajuste manual con motivo | `points_movements` | `points_movements_manual_adjustment_reason_check`: `MANUAL_ADJUSTMENT` siempre lleva `reason` |

> **Pendiente del Sprint 3 (no está en la base).** De los `CHECK` de la §3.12 del contrato del Sprint 3,
> ARRASTRE-S4 agregó solo los dos de `points_movements` (`points <> 0` y `reason` en `MANUAL_ADJUSTMENT`).
> **Siguen sin existir** los de las demás tablas: `amount > 0`, `points >= 0` y `bonus_points >= 0` en
> `consumptions`, los tres campos de anulación juntos, `initial_points > 0` y `0 <= remaining <= initial` en
> `points_lots`, `debt >= 0` y `lifetime_points >= 0` en `customer_points`, `silver_min_points > 0` y
> `gold > silver`, aunque los comentarios de `schema.prisma` los mencionan. Es lo que queda del ítem A-03 de
> `docs/sprint-4/CIERRE_SPRINT_3.md`. Hoy esas reglas las cumple solo el código.

### Sprint 4 (migración `sprint4_base4_rewards_redemptions`)

`backend/test/base4-schema.e2e-spec.ts` verifica que existan.

| Restricción | Dónde | Detalle |
|---|---|---|
| Nombre único entre las no dadas de baja | `rewards` | `rewards_active_name_key`: `lower(trim(name)) WHERE status <> 'DELETED'`. Una dada de baja libera el nombre |
| Rangos | `rewards` | `rewards_points_range_check` (1 a 1.000.000), `rewards_stock_range_check` (`NULL` o 0 a 100.000) y `rewards_used_count_check` (≥ 0) |
| Motivo solo si está deshabilitada | `rewards` | `rewards_disabled_reason_check`: `(status = 'DISABLED') = (disabled_reason IS NOT NULL)` |
| Fecha de baja solo si está dada de baja | `rewards` | `rewards_deleted_at_check`: `(status = 'DELETED') = (deleted_at IS NOT NULL)` |
| Código del canje | `redemptions` | `redemptions_code_key` (`UNIQUE`) y `redemptions_code_format_check`: `^[A-HJ-NP-Z2-9]{6}$` (sin 0, O, 1 ni I) |
| Dura 15 minutos | `redemptions` | `redemptions_expires_at_check`: `expires_at = created_at + 15 minutos` |
| Coherencia con el estado | `redemptions` | `redemptions_resolved_at_check` (`NULL` solo en `CONFIRMED`), `redemptions_rejection_reason_check` (solo en `REJECTED`), `redemptions_balance_before_check` y `redemptions_balance_after_check` (obligatorios en `USED` y solo ahí) |
| Quién lo confirmó | `redemptions` | `redemptions_confirmed_by_check`: con empleado si y solo si `origin = 'COUNTER'` |
| Puntos positivos | `redemptions` | `redemptions_points_check`: `points > 0` |
| Movimiento de canje con su canje | `points_movements` | `points_movements_redemption_check`: `(type = 'REDEMPTION') = (redemption_id IS NOT NULL)` |

### Sprint 5 (migración `sprint5_base5_missions_notifications`)

`backend/test/base5-schema.e2e-spec.ts` verifica que existan y que la base rechace lo que corresponde.

| Restricción | Dónde | Detalle |
|---|---|---|
| Nombre único entre las no dadas de baja | `missions` | `missions_active_name_key`: `lower(trim(name)) WHERE status <> 'DELETED'`. Una dada de baja libera el nombre |
| Objetivo positivo, y entero si cuenta consumos | `missions` | `missions_target_check` (`target > 0`) y `missions_target_whole_count_check` (entero si `CONSUMPTION_COUNT`) |
| Días y franja horaria | `missions` | `missions_days_of_week_check` (solo valores 1 a 7) y `missions_time_range_check` (las dos horas o ninguna, y desde < hasta) |
| Recompensa | `missions` | `missions_reward_points_check`: `NULL` o 1 a 100.000 |
| Meses | `missions` | `missions_end_month_check`: `end_month` nulo o `>= start_month` |
| Baja lógica coherente | `missions` | `missions_deleted_at_check`: `(status = 'DELETED') = (deleted_at IS NOT NULL)` |
| Una asignación por mes | `customer_missions` | `UNIQUE (mission_id, customer_id, period)` |
| Progreso | `customer_missions` | `customer_missions_progress_check`: `0 <= progress <= target` |
| Fechas coherentes con el estado | `customer_missions` | `…_completed_at_check` (con valor en `COMPLETED` y `CLAIMED`), `…_claimed_at_check` y `…_claimed_by_check` (con valor solo en `CLAIMED`; `claimed_by` es `CUSTOMER` o `SYSTEM`), `…_expired_at_check` y `…_expiration_reason_check` (con valor solo en `EXPIRED`) |
| Recompensa de misión con su asignación | `points_movements` | `points_movements_mission_check`: `(type = 'MISSION_REWARD') = (customer_mission_id IS NOT NULL)`, y `UNIQUE (customer_mission_id)`: una misión reclamada tiene a lo sumo un movimiento de recompensa |
| Plantillas solo de los tipos automáticos | `notification_templates` | `notification_templates_type_check`: `type <> 'PROMOTION'` |
| Fila única de configuración | `notification_settings` | `…_singleton_check` (`id = 1`) y `…_birthday_bonus_points_check` (0 a 10.000; 0 = no regala) |
| Mínimo de cliente frecuente | `loyalty_program_configurations` | `…_frequent_min_check`: 1 a 100 |
| Error solo si falló | `notifications` | `notifications_error_check`: `(status = 'FAILED') = (error IS NOT NULL)` |
| Promoción con su envío | `notifications` | `notifications_promotion_send_check`: `(type = 'PROMOTION') = (promotion_send_id IS NOT NULL)` |
| No se repite | `notifications` | `UNIQUE (type, customer_id, dedupe_key)`: el mismo tipo al mismo cliente por el mismo motivo se manda una sola vez |
| Un solo reenvío | `notifications` | `UNIQUE (resent_from_id)`. Que el original esté `FAILED` lo valida el servicio |
| Solo inserción | `notifications` | Triggers `notifications_immutable` y `notifications_no_truncate`: rechazan `UPDATE`, `DELETE` y `TRUNCATE`. Los e2e la vacían con `test/delete-notifications.ts` |
| Nivel válido | `promotion_sends` | `promotion_sends_level_check`: `BRONZE`, `SILVER`, `GOLD` o `NULL` (= todos los clientes activos) |
| Estado y fechas coherentes | `promotion_sends` | `…_scheduled_check` (`SCHEDULED` con `scheduled_at` y sin `sent_at`), `…_sent_check` (`SENT` con `sent_at`) y `…_cancelled_check` (`cancelled_at` si y solo si `CANCELLED`) |
| Proceso de programados | `promotion_sends` | Índice `(status, scheduled_at)` |

## Invariante de los puntos

`customer_points.balance = Σ remaining_points de los lotes ACTIVE − debt`. Toda operación que mueve puntos
bloquea primero la fila de `customer_points` del cliente (`SELECT … FOR UPDATE`). Ver
[transacciones y eventos](../conceptos-transversales/transacciones-y-eventos.md#orden-de-los-bloqueos)
(sección 8).

- `lifetime_points` suma los `CONSUMPTION_CREDIT` (con la bonificación) y resta los `VOID_REVERSAL`. Los
  ajustes, los vencimientos y los canjes **no** lo cambian: el nivel no baja por eso. Tampoco lo cambian los
  puntos de regalo (`MISSION_REWARD` y `BIRTHDAY_BONUS`, Sprint 5): crean un lote y cancelan primero la deuda,
  pero el nivel sale solo de los consumos (S5-9). Los acredita `PointsService.acreditarBonificacion`.
- Un lote vencido queda `EXPIRED` con `remaining_points = 0` (vence entero, decisión S3-07).
- Un lote que llega a 0 por gasto pasa a `CONSUMED`; el de un consumo anulado, a `VOIDED`.
- Anular un consumo cuyos puntos ya se gastaron genera **deuda** y puede dejar el saldo negativo.

## Dos vencimientos por sesión

`sessions.expires_at` es el de inactividad (se corre en cada renovación) y `absolute_expires_at` el
límite duro, fijado al iniciar sesión. `revoked_at` marca la sesión cerrada.

## Copias (snapshots)

Se guardan para que un cambio posterior no altere lo ya registrado (RF-014).

| Dónde | Qué copia |
|---|---|
| `consumptions` | `configuration_version`, `base_amount` y `points_awarded` vigentes al registrar; `registered_by_name` y `voided_by_name` |
| `points_lots` | `expires_at`, calculado con la vigencia al acreditar. Cambiar la vigencia no corre los lotes ya creados |
| `points_movements` | `performed_by_name`: el nombre del empleado o "Sistema" |
| `redemptions` | `reward_name` y `points` de la recompensa **al confirmar**: al usar el canje se descuentan esos puntos aunque la recompensa haya cambiado (S4-14). `confirmed_by_name` y `resolved_by_name`: el empleado en ese momento o "Sistema" |
| `audit_logs` | `performed_by`, el cliente afectado (nombre y documento) y los `details` ya formateados |
| `customer_missions` | `objective_type`, `target`, `days_of_week`, `time_from`, `time_to` y `reward_points` de la misión **al asignarla**: editar la misión rige desde el mes siguiente y no cambia las ya asignadas (S5-20) |
| `notifications` | `recipient` (el email en ese momento) y `subject` y `body` ya con las variables reemplazadas (el reenvío usa el mismo texto) |
| `promotion_sends` | `subject` y `body` con `{nombre}` **sin** reemplazar; cada correo lo reemplaza al salir |

## Copias sincronizadas por eventos

- `Account.role` copia `Employee.role` (fuente de verdad) y se sincroniza con `employee.role-changed`.
- `Account.email` copia `Employee.email` (no editable) o `Customer.email` (se sincroniza con
  `customer.email-changed`).

## Convenciones

- Columnas en `snake_case` (`@map`), modelos en inglés y PascalCase. Los modelos se tradujeron del
  español al inglés el 2026-09-20.
- Baja lógica con `is_active` y `deactivated_at` (personas y cuentas) o con `status` y `deleted_at`
  (recompensas).
- `created_at` / `updated_at` en las tablas operativas. Las de solo inserción (`points_movements`,
  `audit_logs`) tienen solo `created_at`.
- **Teléfono del empleado:** la columna es nullable desde el Sprint 3, pero
  `employees.repository.ts` todavía guarda `''` cuando no hay teléfono y lo devuelve como `null` (ítem B5
  del cierre del Sprint 3).
