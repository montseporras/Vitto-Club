# Modelo de datos

Fuente: `backend/prisma/schema.prisma` y las migraciones de `backend/prisma/migrations/`. Este documento
resume lo que hay ahí; **ante cualquier diferencia, mandan el schema y las migraciones**. Motor:
PostgreSQL 16 (Docker en local; Neon en producción).

Actualizado el 09/11/2026 con lo que está en `develop` al cierre del Sprint 4 (Sprints 1 a 4). Los
contratos que definen cada parte son `docs/sprint-3/API_CONTRACT_SPRINT_3.md` §3.12 y §3.9.6, y
`docs/sprint-4/API_CONTRACT_SPRINT_4.md` §3.15.

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
| `LoyaltyProgramConfiguration` | `loyalty_program_configurations` | Versión inmutable de toda la configuración: equivalencia, vigencia, bonificación por primer consumo y umbrales de niveles (`silver_min_points`, por defecto 300; `gold_min_points`, por defecto 800). Una sola versión activa |
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
| `Reward` | `rewards` | Recompensa del catálogo: nombre, descripción, puntos, stock (`null` = sin límite), vencimiento (`DATE`, `null` = no vence), estado, motivo de deshabilitación, canjes usados (`used_count`) y baja lógica (`deleted_at`). Sin foto: la foto es del Sprint 5 |
| `Redemption` | `redemptions` | Canje: código de 6 caracteres, cliente, recompensa, **snapshot** del nombre y los puntos de la recompensa al confirmar, origen (app o caja), quién lo confirmó y quién lo resolvió, motivo de rechazo y saldos antes y después (solo si se usó) |

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
| `PointsMovementType` | `CONSUMPTION_CREDIT`, `VOID_REVERSAL`, `MANUAL_ADJUSTMENT`, `EXPIRATION`, `REDEMPTION` | No existe ningún tipo de reintegro (decisión S4-1) |
| `RewardStatus` | `ACTIVE`, `DISABLED`, `INACTIVE`, `DELETED` | `DISABLED` lo pone solo el Sistema; `DELETED` es final (el botón dice "Eliminar") |
| `RewardDisabledReason` | `OUT_OF_STOCK`, `EXPIRED` | Solo con `status = DISABLED` |
| `RedemptionStatus` | `CONFIRMED`, `USED`, `REJECTED`, `CANCELLED`, `EXPIRED` | Nace `CONFIRMED`; los otros cuatro son finales. **No existe "Pendiente"** |
| `RedemptionOrigin` | `APP`, `COUNTER` | |
| `AuditActorType` | `EMPLOYEE`, `SYSTEM` | |
| `AuditModule` | `EMPLOYEES`, `CUSTOMERS`, `CONSUMPTIONS`, `POINTS`, `REDEMPTIONS`, `REWARDS`, `MISSIONS`, `CONFIGURATION` | `MISSIONS` es del Sprint 5 |
| `AuditAction` | 37 acciones | Lista completa, con su texto y su sprint: contrato del Sprint 3 §3.9.2 y contrato del Sprint 4 §3.14. Las de `MISSIONS`, `LOGO_AND_MESSAGES_UPDATED` y `PROMOTIONS_UPDATED` ya existen en la base pero son del Sprint 5 |

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

> **Pendiente del Sprint 3 (no está en la base).** El contrato del Sprint 3 (§3.12) pide también el trigger
> de solo inserción en `points_movements` y varios `CHECK` (`amount > 0`, `points >= 0`, los tres campos
> de anulación juntos, `initial_points > 0`, `0 <= remaining <= initial`, `points <> 0`, `reason`
> obligatorio en `MANUAL_ADJUSTMENT`, `debt >= 0`, `lifetime_points >= 0`, `silver_min_points > 0`,
> `gold > silver`). **Ninguno existe**, aunque los comentarios de `schema.prisma` los mencionan. Es el
> ítem A-02 y A-03 de `docs/sprint-4/CIERRE_SPRINT_3.md`. Hoy esas reglas las cumple solo el código.

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

## Invariante de los puntos

`customer_points.balance = Σ remaining_points de los lotes ACTIVE − debt`. Toda operación que mueve puntos
bloquea primero la fila de `customer_points` del cliente (`SELECT … FOR UPDATE`). Ver
[transacciones y eventos](../conceptos-transversales/transacciones-y-eventos.md#orden-de-los-bloqueos)
(sección 8).

- `lifetime_points` suma los `CONSUMPTION_CREDIT` (con la bonificación) y resta los `VOID_REVERSAL`. Los
  ajustes, los vencimientos y los canjes **no** lo cambian: el nivel no baja por eso.
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
