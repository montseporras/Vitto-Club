# Modelo de datos

Fuente: `backend/prisma/schema.prisma`. Este documento resume lo que ahí está; **ante cualquier
diferencia, manda el schema**. Motor: PostgreSQL 16 (Docker en local; Neon en producción según los docs
de traspaso).

## Entidades

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `Employee` | `employees` | Empleados: nombre, apellido, teléfono, email (único), rol, baja lógica |
| `Customer` | `customers` | Clientes: documento, email, teléfono (opcional), fecha de nacimiento (opcional), baja lógica |
| `CustomerStatusChange` | `customer_status_changes` | Historial de bajas y reactivaciones de un cliente (nunca se borra) |
| `Account` | `accounts` | Credenciales de acceso (email, hash, rol) de un empleado o un cliente |
| `Session` | `sessions` | Una fila por sesión; guarda el SHA-256 del refresh token |
| `LoyaltyProgramConfiguration` | `loyalty_program_configurations` | Versión inmutable de toda la configuración del programa de puntos |
| `LoyaltyPointsConfiguration` | `loyalty_points_configuration` | Equivalencia monto/puntos (fila única, `id = 1`) |
| `LoyaltyPointsValidityConfiguration` | `loyalty_points_validity_configuration` | Vigencia de puntos en meses (fila única, `id = 1`) |
| `FirstConsumptionBonusConfiguration` | `first_consumption_bonus_configuration` | Bonificación de primer consumo (fila única, `id = 1`) |

> Las tres tablas de fila única son anteriores al versionado completo. El doc de loyalty indica que una
> migración importó sus valores como versión inicial y que los endpoints seccionales crean versiones.
> **No determinado:** si las tres tablas singleton todavía se leen o quedaron solo como legado.

## Enums

| Enum | Valores |
|---|---|
| `EmployeeRole` | `ADMIN`, `CASHIER` |
| `AccountRole` | `ADMIN`, `CASHIER`, `CUSTOMER` |
| `DocumentType` | `DNI`, `PASSPORT` |
| `CustomerStatusAction` | `DEACTIVATED`, `ACTIVATED` |
| `FirstConsumptionBonusType` | `PERCENTAGE`, `FIXED_AMOUNT` |

## Relaciones

```
Employee 1 ── 0..1 Account ── 0..N Session
Customer 1 ── 0..1 Account
Customer 1 ── 0..N CustomerStatusChange
```

Todas las claves foráneas usan `onDelete: Restrict`.

## Restricciones relevantes

| Restricción | Dónde | Detalle |
|---|---|---|
| Un solo dueño, coherente con el rol | `accounts` | `CHECK accounts_owner_matches_role_check`: `CUSTOMER` → `customerId`; `ADMIN`/`CASHIER` → `employeeId`. Está escrito a mano en la migración (Prisma no modela CHECK) |
| Un email, una cuenta | `accounts.email` | `UNIQUE` global |
| Email de empleado único | `employees.email` | `UNIQUE` |
| Documento único entre clientes activos | `customers` | Índice único parcial `customers_active_document_key` (`WHERE is_active = true`). Ver [ADR 006](../decisions/006-unicidad-documento-y-email-de-clientes.md) |
| Email único entre clientes activos | `customers` | Índice único parcial `customers_active_email_key` |
| Una sola versión activa del programa | `loyalty_program_configurations` | Índice único parcial `loyalty_program_configurations_one_active_key` |
| Refresh token único | `sessions.token_hash` | `UNIQUE`; nunca se guarda el token |
| Fila única de configuración | tablas singleton | La clave primaria vale `1` |

## Dos vencimientos por sesión

`sessions.expires_at` es el de inactividad (se corre en cada renovación) y `absolute_expires_at` el
límite duro, fijado al iniciar sesión. `revoked_at` marca la sesión cerrada.

## Copias derivadas

- `Account.role` copia `Employee.role` (fuente de verdad) y se sincroniza por el evento
  `employee.role-changed`.
- `Account.email` copia `Employee.email` (no editable) o `Customer.email` (se sincroniza con
  `customer.email-changed`; **la publicación de ese evento figuraba como pendiente en los docs de
  octubre, no verificada**).

## Convenciones

- Columnas en `snake_case` (`@map`), modelos en inglés y PascalCase. Los modelos se tradujeron del
  español al inglés el 2026-09-20.
- Baja lógica con `is_active` y `deactivated_at`.
- `created_at` / `updated_at` en todas las tablas operativas.
