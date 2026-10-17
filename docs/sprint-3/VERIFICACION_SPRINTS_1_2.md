# Verificación de lo construido (Sprints 1 y 2) · Vitto Club

> **Para qué sirve:** comprobar que lo que ya está hecho coincide con el prototipo v2 y con las decisiones
> vigentes. Cubre todo lo que **no** está en `API_CONTRACT_SPRINT_3.md`: empleados, usuarios, autenticación,
> registro, clientes (ABMC del Sprint 1), configuración de puntos y el modelo de datos actual.
>
> **Fuentes revisadas (17/10/2026):**
> - Rama `develop` del repo `montseporras/Vitto-Club` (commit `e499d11`, 15/10): `backend/prisma/schema.prisma`, `backend/src/**` y `docs/**`.
> - Rama `feature/SCRUM-161-registrar-auditoria`.
> - Export del prototipo *Vitto Club Prototipo v2*.
>
> **Versión 2 (17/10/2026):** incorpora las decisiones del contrato del Sprint 3 (sección 8.3): la
> reactivación de **usuarios** se mantiene, el alta en caja crea la cuenta con contraseña inicial = documento, y la
> política única de contraseña queda a futuro.
>
> **No se ejecutaron los tests.** Lo que dice "verificar" hay que probarlo con la app levantada.

**Cómo leer las tablas**

| Marca | Significa |
|---|---|
| ✅ | Coincide con el prototipo y con las decisiones |
| ⚠️ | Funciona, pero hay una diferencia menor o algo sin verificar |
| ❌ | Hay que cambiarlo |

---

## Índice

1. [Decisiones vigentes que impactan lo ya hecho](#1-decisiones-vigentes-que-impactan-lo-ya-hecho)
2. [Modelo de datos (`schema.prisma`)](#2-modelo-de-datos-schemaprisma)
3. [Unicidad de email entre registros activos (cambio principal)](#3-unicidad-de-email-entre-registros-activos-cambio-principal)
4. [Quitar la reactivación de clientes y empleados](#4-quitar-la-reactivación-de-clientes-y-empleados)
5. [Endpoints existentes, uno por uno](#5-endpoints-existentes-uno-por-uno)
6. [Validaciones campo por campo: prototipo vs backend](#6-validaciones-campo-por-campo-prototipo-vs-backend)
7. [Pantallas del prototipo que no coinciden con lo hecho](#7-pantallas-del-prototipo-que-no-coinciden-con-lo-hecho)
8. [Panel "Tipos de datos" del prototipo: correcciones](#8-panel-tipos-de-datos-del-prototipo-correcciones)
9. [Documentos que hay que actualizar](#9-documentos-que-hay-que-actualizar)
10. [Casos de prueba de regresión](#10-casos-de-prueba-de-regresión)
11. [Resumen de cambios a hacer](#11-resumen-de-cambios-a-hacer)

---

## 1. Decisiones vigentes que impactan lo ya hecho

| # | Decisión | Qué pide revisar |
|---|---|---|
| D1 | **No existe la reactivación de clientes ni de empleados.** La de **usuarios** (cuentas de acceso de empleados) **se mantiene** (decisión #8 del 17/10) | `PATCH /customers/:id/activate`, botones del frontend y del prototipo, eventos, historial y documentos ([sección 4](#4-quitar-la-reactivación-de-clientes-y-empleados)) |
| D2 | **El email no se repite entre registros activos.** En la base se puede repetir: se distingue por si el registro está activo o no. Vale para clientes **y** empleados | `customers` ya lo cumple. `employees` y `accounts` tienen `UNIQUE` global ([sección 3](#3-unicidad-de-email-entre-registros-activos-cambio-principal)) |
| D3 | Un cliente dado de baja pierde sus puntos y, si vuelve, se inscribe como cliente nuevo (PO, 08/10) | Al darlo de baja hay que desactivar su cuenta. Su documento y su email quedan libres |
| D4 | Tres roles: Cliente, Cajero, Administrador. Login único con email y contraseña | ✅ |
| D5 | El primer Administrador se crea con el *seed* | ✅ (`backend/prisma/seed.ts`) |
| D6 | El rol del empleado se cambia solo desde empleados, no desde usuarios (PO, 06/10) | ❌ `UpdateAccountDto` todavía acepta `role` |
| D7 | La auditoría registra solo acciones de empleados y del Sistema; no sesiones ni acciones del cliente | La rama de auditoría registra sesiones y autorregistro (en el contrato del Sprint 3, [3.9](./API_CONTRACT_SPRINT_3.md#39-auditoría-ítem-aparte)) |
| D8 | En la UI es "Consumo", no "Compra" | Textos del frontend y del prototipo |
| D9 | El cliente que da de alta el Cajero o el Administrador **recibe una cuenta con contraseña inicial = su número de documento**, y se le pide cambiarla al ingresar (decisión #7 del 17/10) | `POST /customers` hoy no crea cuenta ([5.2](#52-clientes-apicustomers--administrador-y-cajero)) |
| D10 | La política única de contraseña queda **para más adelante** (decisión #12). Mientras tanto rige la del backend | Las pantallas que exigen más que el backend ([6.2](#62-contraseñas)) |

---

## 2. Modelo de datos (`schema.prisma`)

### 2.1 `Employee` → tabla `employees`

| Campo (JSON) | Columna | Tipo DB | Obligatorio | Regla esperada | Estado |
|---|---|---|---|---|---|
| `id` | `id` | `SERIAL` PK | Sistema | Autoincremental | ✅ |
| `firstName` | `first_name` | `VARCHAR(80)` | Sí | No vacío (se recorta), máx. 80 | ✅ |
| `lastName` | `last_name` | `VARCHAR(80)` | Sí | No vacío, máx. 80 | ✅ |
| `phone` | `phone` | `VARCHAR(30)` **NOT NULL** | **No** | Opcional; 8 a 15 dígitos; `+` solo al inicio | ❌ Es `NOT NULL` y guarda `''` cuando falta. Migrar a `phone String?` y convertir `''` en `NULL` |
| `email` | `email` | `VARCHAR(150)` **UNIQUE** | Sí | Minúsculas; **único entre empleados activos**; no se edita | ❌ `@unique` global ([sección 3](#3-unicidad-de-email-entre-registros-activos-cambio-principal)) |
| `role` | `role` | enum `EmployeeRole` | Sí | `ADMIN` o `CASHIER` | ✅ |
| `isActive` | `is_active` | `BOOLEAN` default `true` | Sistema | Baja lógica, sin vuelta atrás | ✅ |
| — | `deactivated_at` | `TIMESTAMP(3)` | Sistema | Fecha de baja (no se expone) | ✅ |
| — | `created_at` / `updated_at` | `TIMESTAMP(3)` | Sistema | | ✅ |

### 2.2 `Customer` → tabla `customers`

| Campo (JSON) | Columna | Tipo DB | Obligatorio | Regla esperada | Estado |
|---|---|---|---|---|---|
| `id` | `id` | `SERIAL` PK | Sistema | | ✅ |
| `firstName` | `first_name` | `VARCHAR(80)` | Sí | No vacío, máx. 80 | ✅ |
| `lastName` | `last_name` | `VARCHAR(80)` | Sí | No vacío, máx. 80 | ✅ |
| `documentType` | `document_type` | enum `DocumentType` | Sí | `DNI` o `PASSPORT` | ✅ |
| `documentNumber` | `document_number` | `VARCHAR(20)` | Sí | Se normaliza sin puntos, espacios ni guiones y en mayúsculas. DNI: 7 u 8 dígitos. Pasaporte: letras y números. **Es texto, no número** | ✅ |
| `email` | `email` | `VARCHAR(150)` | Sí | Minúsculas; único entre clientes **activos** | ✅ (índice parcial `customers_active_email_key`) |
| `phone` | `phone` | `VARCHAR(30)` nullable | No | 8 a 15 dígitos | ✅ |
| `dateOfBirth` | `date_of_birth` | `DATE` nullable | No | `YYYY-MM-DD`, no futura | ⚠️ El prototipo además rechaza años anteriores a 1900. Agregarlo al backend |
| `active` | `is_active` | `BOOLEAN` | Sistema | En el JSON se llama `active` (en empleados, `isActive`) | ⚠️ Nombres distintos entre módulos. Documentado; no cambiar ahora para no romper el frontend |
| `deactivatedAt` | `deactivated_at` | `TIMESTAMP(3)` | Sistema | | ✅ |
| `createdAt` | `created_at` | `TIMESTAMP(3)` | Sistema | Es la "Fecha de alta" de las pantallas | ✅ |

**Índices:**

| Índice | Estado |
|---|---|
| Único parcial `(document_type, document_number) WHERE is_active` | ✅ |
| Único parcial `(email) WHERE is_active` | ✅ |
| No único `(document_type, document_number)`, para encontrar inactivos | ✅ |
| `(last_name, first_name)` y `(is_active)` | ✅ |

### 2.3 `CustomerStatusChange` → tabla `customer_status_changes`

| Campo | Tipo | Estado |
|---|---|---|
| `id`, `customer_id` (FK `Restrict`), `created_at` | | ✅ |
| `action` | enum `CustomerStatusAction` (`DEACTIVATED`, `ACTIVATED`) | ❌ Con D1 ya no se escribe `ACTIVATED`. No borrar el valor del enum (puede haber filas viejas), pero no usarlo más. El historial pasa a tener como mucho una fila por cliente |

### 2.4 `Account` → tabla `accounts`

| Campo | Columna | Tipo | Regla esperada | Estado |
|---|---|---|---|---|
| `id` (`accountId`) | `id` | `SERIAL` PK | | ✅ |
| `email` | `email` | `VARCHAR(150)` **UNIQUE** | Único entre cuentas **activas** | ❌ Global. Bloquea que un cliente dado de baja se vuelva a registrar con el mismo email (el propio `docs/funcionalidades/registro-de-clientes.md` §6 lo marca como pendiente) |
| `passwordHash` | `password_hash` | `TEXT` | bcryptjs, costo `BCRYPT_COST` | ✅ Nunca sale en las respuestas |
| `role` | `role` | enum `AccountRole` | Copia de `Employee.role`; `CUSTOMER` para clientes | ✅ |
| `isActive` | `is_active` | `BOOLEAN` | Baja lógica. Las cuentas de **empleados** se pueden reactivar; las de **clientes**, no | ✅ |
| `employeeId` | `employee_id` | `INTEGER` **UNIQUE** | Un empleado tiene siempre la misma cuenta (se reactiva en lugar de crear otra) | ✅ Queda como está |
| `mustChangePassword` | `must_change_password` | `BOOLEAN` default `false` | `true` para clientes creados por Cajero o Administrador hasta que cambien la contraseña inicial | ❌ **No existe**: agregar (contrato del Sprint 3, 3.11.3) |
| `customerId` | `customer_id` | `INTEGER` **UNIQUE** | | ✅ Cada inscripción es un `Customer` nuevo con su cuenta nueva |
| CHECK `accounts_owner_matches_role_check` | | | `CUSTOMER` → `customerId`; `ADMIN`/`CASHIER` → `employeeId` | ✅ |

### 2.5 `Session` → tabla `sessions`

| Campo | Regla | Estado |
|---|---|---|
| `token_hash` `VARCHAR(64)` UNIQUE | SHA-256 del refresh token; nunca el token | ✅ |
| `expires_at` | Inactividad: Cajero y Administrador 30 min, Cliente 7 días | ⚠️ Verificar los valores en `.env` |
| `absolute_expires_at` | Máximo: Cajero y Administrador 12 h, Cliente 30 días | ⚠️ Verificar |
| `revoked_at` | Se completa al cerrar sesión, al dar de baja la cuenta y (Sprint 3) al cambiar la contraseña | ⚠️ El de cambio de contraseña es nuevo |

**Deuda:** no hay limpieza de sesiones vencidas (la tabla crece). Sigue pendiente.

### 2.6 Configuración de puntos

| Modelo | Uso | Estado |
|---|---|---|
| `LoyaltyProgramConfiguration` (`loyalty_program_configurations`) | **Fuente actual**. Una versión inmutable por guardado; una sola activa (índice parcial) | ✅ |
| `LoyaltyPointsConfiguration`, `LoyaltyPointsValidityConfiguration`, `FirstPurchaseBonusConfiguration` | Legado (importado como versión 1) | ⚠️ Confirmar que nadie las lee. Si es así, documentarlas como legado y no tocarlas |

| Campo | Tipo DB | Backend hoy | Prototipo | Estado |
|---|---|---|---|---|
| `baseAmount` | `DECIMAL(12,2)` | > 0, 2 decimales, máx. 9.999.999.999,99 | > 0, 2 decimales, **máx. 1.000.000** | ❌ Unificar (ver [6.3](#63-configuración-de-puntos)) |
| `pointsAwarded` | `INTEGER` | 1 a 2.147.483.647 | **1 a 10.000** | ❌ Unificar |
| `pointsExpirationMonths` | `INTEGER` default 12 | 1 a 2.147.483.647; vacío → 12 | **1 a 120**; por defecto 12 | ❌ Unificar |
| `bonusType` | enum | `PERCENTAGE` / `FIXED_AMOUNT` | Porcentaje / Puntos fijos | ✅ |
| `bonusValue` | `DECIMAL(12,2)` | %: 1–100 con 2 decimales; fijo: entero 1–10.000 | Igual | ✅ |
| `version`, `isActive`, `validFrom`, `validTo` | | Versionado RF-014 | — | ✅ |
| Quién modificó | — | **No se guarda** (`updatedBy`) | — | ⚠️ Queda cubierto por la auditoría (actor y antes → después). No hace falta otra columna |

### 2.7 Enums actuales

| Enum | Valores | Estado |
|---|---|---|
| `EmployeeRole` | `ADMIN`, `CASHIER` | ✅ |
| `AccountRole` | `ADMIN`, `CASHIER`, `CUSTOMER` | ✅ |
| `DocumentType` | `DNI`, `PASSPORT` | ✅ (UI: DNI, Pasaporte) |
| `CustomerStatusAction` | `DEACTIVATED`, `ACTIVATED` | ⚠️ `ACTIVATED` deja de usarse |
| `FirstPurchaseBonusType` | `PERCENTAGE`, `FIXED_AMOUNT` | ✅ |
| `AuditCategory` (rama de auditoría) | `SESSION`, `CUSTOMERS`, `EMPLOYEES`, `CONFIGURATION` | ❌ Se reemplaza por `AuditModule` (contrato del Sprint 3, 3.9) |

### 2.8 Relaciones

```
Employee 1 ── 0..1 Account ── 0..N Session
Customer 1 ── 0..1 Account
Customer 1 ── 0..N CustomerStatusChange
```

Todas las FK usan `onDelete: Restrict` ✅. No hay borrado físico en ningún módulo ✅.

---

## 3. Unicidad de email entre registros activos (cambio principal)

**Regla pedida (D2):** el email puede repetirse en la base, pero **no entre registros activos**. Un
empleado o cliente dado de baja libera su email.

### 3.1 Estado actual

| Dónde | Hoy | Qué tiene que pasar |
|---|---|---|
| `customers.email` | Único parcial `WHERE is_active` | ✅ Sin cambios |
| `employees.email` | `@unique` global. `POST /empleados` responde **409 "incluso si está dado de baja"** | ❌ Único parcial `WHERE is_active = true`. Un empleado nuevo puede usar el email de uno dado de baja |
| `accounts.email` | `@unique` global | ❌ Único parcial `WHERE is_active = true` |
| Cliente contra empleado | `customers` consulta a `employees` en un solo sentido; `employees` no consulta a `customers` (riesgo aceptado) | ⚠️ Comparar **solo contra activos** en los dos sentidos. Con el índice parcial en `accounts` alcanza como red de seguridad, pero el `409` claro conviene darlo en el alta del empleado también |
| Login (`findByEmail`) | `findUnique({ where: { email } })` | ❌ Con emails repetidos hay que buscar `{ email, isActive: true }` (con el índice parcial hay como mucho una) |
| Cambio de email del cliente (`customer.email-changed`) | Actualiza `Account.email` | ⚠️ Comprobar contra cuentas **activas** |

### 3.2 Migración sugerida

```sql
-- employees: de único global a único entre activos
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_key;
DROP INDEX IF EXISTS employees_email_key;
CREATE UNIQUE INDEX employees_active_email_key ON employees (email) WHERE is_active = true;
CREATE INDEX employees_email_idx ON employees (email);

-- accounts: de único global a único entre activas
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_email_key;
DROP INDEX IF EXISTS accounts_email_key;
CREATE UNIQUE INDEX accounts_active_email_key ON accounts (email) WHERE is_active = true;
CREATE INDEX accounts_email_idx ON accounts (email);

-- cambio obligatorio de la contraseña inicial
ALTER TABLE accounts ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
```

En `schema.prisma`, igual que en `Customer`:

```prisma
@@unique([email], map: "employees_active_email_key", where: { isActive: true })
```

Hay que **sacar** `@unique` de `email` en `Employee` y en `Account`.

> **Condición previa:** antes de aplicarla, comprobar que no haya dos registros **activos** con el mismo
> email (`SELECT email, count(*) FROM employees WHERE is_active GROUP BY email HAVING count(*) > 1;`, y lo
> mismo para `accounts`).

### 3.3 Para que funcione con clientes, la baja del cliente tiene que desactivar su cuenta

**El acceso ya se corta bien.** `AccountsService` lee el estado del `Customer` en cada login y en cada
renovación (`toCustomerAuthInfo`). Un cliente dado de baja no inicia sesión ni renueva; su access token
sigue valiendo hasta 15 minutos ✅.

**Lo que falta es la cuenta.** `customers` solo publica `customer.email-changed`. **No publica**
`customer.deactivated`: el evento está declarado en `shared/events/domain-events.ts`, pero nadie lo emite.
Por eso `accounts.is_active` del cliente dado de baja **queda en `true`**. Con el índice parcial de la
[sección 3.2](#32-migración-sugerida), esa cuenta seguiría ocupando el email y el cliente **no podría
volver a registrarse** con él.

**Qué hacer:**
1. `CustomersService.deactivate` publica `customer.deactivated` dentro de su transacción.
2. `accounts` la escucha y pone `is_active = false` en la cuenta del cliente.
3. `auth` revoca sus sesiones (igual que con `account.deactivated`).

Como no hay reactivación de clientes, no hace falta el camino de vuelta.

### 3.4 Reactivar un usuario con la unicidad entre activos

Como la reactivación de **usuarios** se mantiene, `PATCH /usuarios/:id/reactivate` tiene que comprobar que el
email no lo use **otra cuenta activa**. Mientras el usuario estuvo de baja, un cliente pudo registrarse con
ese email. Si está en uso: `409 EMAIL_IN_USE`. Sin este control, el índice parcial rechazaría el `UPDATE`
con un error 500.

---

## 4. Quitar la reactivación de clientes y empleados

| Capa | Elemento | Acción |
|---|---|---|
| Backend | `PATCH /api/customers/:id/activate` (`customers.controller.ts`, `CustomersService.activate`) | Eliminar endpoint, caso de uso y tests |
| Backend | `PATCH /api/usuarios/:id/reactivate` (`accounts.controller.ts`) | **Se mantiene** (decisión #8). Agregar el control de email de [3.4](#34-reactivar-un-usuario-con-la-unicidad-entre-activos) |
| Backend | Evento `customer.reactivated` | Sacar de `domain-events.ts` |
| Backend | `CustomerStatusAction.ACTIVATED` | Dejar de escribirlo |
| Backend | Auditoría "Alta lógica de cliente" | Sacar la llamada. La de "Reactivación de cuenta de usuario" se queda, con el código `USER_ACCOUNT_REACTIVATED` |
| Backend | Mensaje "Un cliente inactivo no se puede modificar: hay que reactivarlo primero" | Cambiar a "El cliente está dado de baja y no se puede modificar." |
| Frontend | Botón **"Reactivar cuenta"** en Caja (`features/cashier/components/CustomerSummary.tsx`), `activateCustomer` en `cashier.api.ts`, `useActivateCustomer` en `cashier.queries.ts` y el handler de MSW | Eliminar. Cliente inactivo en la búsqueda = "No existe un cliente activo con ese documento. Registrar cliente" |
| Frontend | Botón **"Reactivar usuario"** en el modal de empleado | **Se mantiene** |
| Prototipo | `reactivarCliente`, el aviso "Cuenta reactivada", el texto "Para editar sus datos, primero hay que reactivar su cuenta" y "Reactivar" (empleado) en el modal viejo de empleados | Sacar del `.dc.html`. "Reactivar usuario" se queda |
| Prototipo | Cliente de prueba "Carlos Ruiz (Inactivo)" | Dejarlo para probar que **no** aparece en la búsqueda |
| Docs | `docs/domain/clientes.md` (sección Estado), `docs/funcionalidades/clientes.md` (§3, §3.6, §7), `docs/seguimiento/pendientes-frontend.md` (#2) | Reescribir sin reactivación de clientes. En `docs/domain/cuentas-y-empleados.md` dejar la reactivación de cuentas y aclarar que no existe la de empleados |

---

## 5. Endpoints existentes, uno por uno

### 5.1 Autenticación (`/api/auth`)

| Endpoint | Acceso | Request | Respuesta | Errores | Estado |
|---|---|---|---|---|---|
| `POST /auth/login` | Público | `email` (string, oblig., máx. 150; no se valida formato) · `password` (string, oblig., máx. 64) | `200 { accessToken, user: { accountId, role, email, firstName?, lastName?, employeeId?, customerId? } }` + cookie `refresh_token` | `401 INVALID_CREDENTIALS` siempre con "Los datos de acceso son incorrectos" · `400` | ✅ Coincide con el prototipo ("Los datos de acceso son incorrectos.") · ❌ buscar la cuenta **activa** por email ([3.1](#31-estado-actual)) |
| `POST /auth/refresh` | Público (cookie) | Sin cuerpo | Igual que login | `401 INVALID_SESSION` | ✅ |
| `POST /auth/logout` | Público | Sin cuerpo | `204` siempre | — | ✅ Lo usan los tres roles con el diálogo "¿Querés cerrar sesión?" |
| `POST /auth/register` | Público | `firstName`, `lastName` (oblig., máx. 80) · `documentType` · `documentNumber` (oblig., máx. 20) · `email` (oblig., máx. 150) · `password` (8–64, ≤ 72 bytes, ≠ email) · `phone?` · `dateOfBirth?` (`YYYY-MM-DD`) | `201 { customerId, email, firstName, lastName }`, **sin tokens** | `400` · `409` documento o email en uso | ✅ La política no cambia por ahora (D10) · ⚠️ agregar el campo `mustChangePassword: false` en el login de estos clientes · ❌ volver a registrarse con el email de una cuenta dada de baja: hoy `409` (se arregla con [3.2](#32-migración-sugerida)) |

**Para verificar:**
- El frontend, después de registrar, llama a `login` con el email normalizado que devuelve la API.
- El código **ya devuelve** `firstName`/`lastName` también para el Cliente (`toCustomerAuthInfo`), pero `docs/funcionalidades/autenticacion.md` §3 dice que no vienen. ⚠️ Actualizar el doc.
- Access token en memoria; renueva solo ante un `401`; un solo `refresh` a la vez.

### 5.2 Clientes (`/api/customers`) — Administrador y Cajero

| Endpoint | Request | Respuesta | Errores | Estado |
|---|---|---|---|---|
| `GET /customers` | `page` (≥ 1, def. 1) · `limit` (1–100, def. 20) · `active` (`true`/`false`; sin valor = todos) · `name` (máx. 80; no ignora tildes) | `200 { items: Customer[], total, page, limit }` ordenado por `id` | `400` | ⚠️ El Sprint 3 agrega `q`, `level`, `sort` y campos de puntos. Que `lucia` no encuentre `Lucía` sigue abierto |
| `GET /customers/by-document` | `documentType` (def. `DNI`) · `documentNumber` (oblig., máx. 30, se normaliza) | `200 Customer` (activo; si no hay, el inactivo más reciente) | `400`, `404` | ✅ El frontend trata el inactivo como no encontrado |
| `GET /customers/:id` | — | `200 Customer` | `400`, `404` | ✅ |
| `GET /customers/:id/status-history` | — | `200 [{ id, action, createdAt }]` | `400`, `404` | ⚠️ Ninguna pantalla lo usa. Mantener o quitar |
| `POST /customers` | `firstName`, `lastName`, `documentType`, `documentNumber`, `email` (oblig.) · `phone?`, `dateOfBirth?` | `201 Customer` | `400` · `409` (documento o email de otro **activo**, o email de empleado) | ❌ El cliente queda **sin cuenta** y no puede ingresar a la app. Por D9 tiene que crear también la cuenta (contraseña inicial = documento normalizado, `mustChangePassword = true`) en la misma transacción, vía el evento `customer.created`. Además hay que crearles cuenta a los clientes activos que ya existen sin ella (contrato 3.11.3) |
| `PATCH /customers/:id` | Cualquier subconjunto del alta (al menos uno); `null` borra `phone` o `dateOfBirth` | `200 Customer` | `400` · `404` · `409` (inactivo, o documento/email en uso) | ⚠️ El Sprint 3 agrega `reason` y la restricción del documento para el Cajero |
| `PATCH /customers/:id/deactivate` | Sin cuerpo | `204` | `400`, `404`, `409` (ya inactivo) | ✅ Corta el acceso · ❌ No pone la cuenta en inactiva ([3.3](#33-para-que-funcione-con-clientes-la-baja-del-cliente-tiene-que-desactivar-su-cuenta)) |
| `PATCH /customers/:id/activate` | — | `204` | — | ❌ Eliminar (D1) |

**Formato de error del módulo:** `{ statusCode, error, message: string | string[], path, timestamp, details? }`.
Los mensajes están en inglés ("Customer with ID 1 is already inactive") ⚠️. Para lo nuevo se usa español;
unificar cuando se pueda.

### 5.3 Empleados (`/api/empleados`) — solo Administrador

| Endpoint | Request | Respuesta | Errores | Estado |
|---|---|---|---|---|
| `GET /empleados` | `active?`, `name?` (máx. 80). Sin paginación | `200 Employee[]` ordenado por apellido, nombre e `id` | `400` | ✅ La pantalla ordena por apellido y busca "por nombre o apellido" |
| `GET /empleados/:id` | — | `200 Employee` | `400`, `404` | ✅ |
| `POST /empleados` | `firstName`, `lastName` (oblig., máx. 80) · `email` (oblig., máx. 150) · `role` (`ADMIN`/`CASHIER`) · `phone?` | `201 Employee` (`isActive: true`) | `400` · `409` email repetido **aunque esté de baja** | ❌ El `409` tiene que ser solo contra empleados **activos** (D2) y contra clientes activos |
| `PATCH /empleados/:id` | **Formulario completo**: `firstName`, `lastName`, `role` (oblig.) · `phone?` (null o vacío = sin teléfono). `email` → `400` | `200 Employee` | `400`, `404`, `409` (de baja, o `LAST_ADMIN` al degradar) | ✅ El prototipo muestra el mail en solo lectura |
| `DELETE /empleados/:id` | Sin cuerpo | `200 Employee` (`isActive: false`) | `400`, `404`, `409` (ya de baja, o `LAST_ADMIN`) | ✅ Diálogo: "¿Dar de baja a {nombre}? Va a dejar de poder ingresar al sistema." |

**Tipo `Employee`:** `{ id, firstName, lastName, phone: string | null, email, role, isActive }`.

**Pantalla (Configuración → Empleados):**
- **Columnas:** Apellido · Nombre · Teléfono ("—" si falta) · Rol · Estado · Usuario ("Sin usuario" / "Con usuario" / "Usuario dado de baja", cruzando con `GET /usuarios` por `employeeId`).
- **Buscador:** "Buscar por nombre o apellido…".
- **Botón:** "Registrar empleado".
- **Empleado dado de baja:** su modal es de solo lectura ("Este empleado está dado de baja: sus datos no se pueden editar.").

### 5.4 Usuarios de empleados (`/api/usuarios`) — solo Administrador

| Endpoint | Request | Respuesta | Errores | Estado |
|---|---|---|---|---|
| `GET /usuarios` | — | `200 [{ accountId, employeeId, email, role, active }]` (solo empleados) | — | ✅ Está en `develop` |
| `POST /usuarios` | `employeeId` (entero > 0) · `email` (= mail del empleado, máx. 150) · `password` (8–64, ≤ 72 bytes, ≠ email) | `201` cuenta | `400` (email distinto al del empleado) · `404` · `409` (empleado inactivo, ya tiene cuenta, email de un cliente) | ✅ El prototipo genera la contraseña (12 caracteres, mayúscula, número y especial), la muestra **una sola vez** y deja copiarla. ⚠️ Si se escribe a mano, la pantalla no puede exigir más que el backend (D10) |
| `PATCH /usuarios/:id` | `password?` · **`role?`** | `200` | `400`, `404`, `409` | ❌ Sacar `role` del DTO (D6). El Sprint 3 agrega el cierre de sesiones y la auditoría |
| `PATCH /usuarios/:id/deactivate` | — | `200`/`204` | `409` (ya inactiva, o `LAST_ADMIN`) | ✅ Diálogo: "Va a dejar de poder ingresar al sistema y se cierran sus sesiones abiertas." · ✅ `AccountsService` devuelve `code: "LAST_ADMIN"` (actualizar `errores-y-codigos.md`, que lo marca como no verificado) |
| `PATCH /usuarios/:id/reactivate` | — | `200`/`204` | `409` (ya activa, empleado inactivo) | ✅ Se mantiene (decisión #8) · ❌ falta el `409 EMAIL_IN_USE` si otra cuenta activa usa el email ([3.4](#34-reactivar-un-usuario-con-la-unicidad-entre-activos)) |
| `GET /usuarios/empleado/:employeeId` | — | `200` cuenta | `404` | ✅ Nunca devuelve `passwordHash` |

**Regla del último Administrador:** no se puede dejar el sistema sin un empleado activo con rol `ADMIN` y
cuenta activa. Aplica a la baja de usuario, la baja de empleado y el cambio de rol. Mensaje: "No se puede
dar de baja: es el único administrador que puede ingresar al sistema." ✅ (`code: "LAST_ADMIN"` presente
en el código).

### 5.5 Configuración de puntos (`/api/loyalty/configuration`) — solo Administrador

| Endpoint | Request | Respuesta | Estado |
|---|---|---|---|
| `GET /current` | — | `200 { version, baseAmount, pointsAwarded, pointsExpirationMonths, bonusType, bonusValue, isActive, validFrom, validTo, createdAt }` | ✅ El Sprint 3 agrega `silverMinPoints` y `goldMinPoints` |
| `PUT /` (completo) | Los 4 obligatorios + `pointsExpirationMonths?` | `200` versión nueva | ✅ |
| `GET`/`PUT /points-equivalence` | `baseAmount`, `pointsAwarded` | `200 { baseAmount, pointsAwarded, updatedAt }` · `404` si nunca se configuró | ❌ Límites distintos al prototipo ([6.3](#63-configuración-de-puntos)) |
| `GET`/`PUT /points-validity` | `pointsExpirationMonths?` (vacío → 12) | `200` | ❌ Límite superior distinto |
| `GET`/`PUT /first-purchase-bonus` | `bonusType`, `bonusValue` | `200` | ✅ |

**Pantalla (Configuración → Puntos):** tres tarjetas, cada una con su botón **Guardar**, deshabilitado si
no hay cambios. Arriba, el texto "Los cambios se aplican a las operaciones futuras. Los movimientos ya
registrados no se modifican." Mensajes de éxito:
- "Equivalencia de puntos guardada. Aplica a las operaciones futuras."
- "Vigencia de los puntos guardada. …"
- "Bonificación por primera compra guardada. …"

⚠️ **Verificar:** `docs/funcionalidades/configuracion-de-puntos.md`, sección "Estado de disponibilidad",
todavía dice que responde `401` hasta que se integre la autenticación. La autenticación ya está integrada.

### 5.6 Salud

| Endpoint | Acceso | Estado |
|---|---|---|
| `GET /api/health` | Público | ✅ |

### 5.7 Matriz de permisos vigente (antes del Sprint 3)

| Endpoints | Administrador | Cajero | Cliente | Estado |
|---|---|---|---|---|
| `/auth/*`, `/health` | público | público | público | ✅ |
| `/customers/*` | Sí | Sí | No | ✅ (el Sprint 3 agrega `/customers/me*` para el Cliente) |
| `/empleados/*` | Sí | No | No | ✅ |
| `/usuarios/*` | Sí | No | No | ✅ |
| `/loyalty/configuration/*` | Sí | No | No | ✅ |
| `/auditoria` | Sí | No | No | ⚠️ En la rama de auditoría |

Test de la matriz: `backend/test/endpoint-permissions.e2e-spec.ts`. ⚠️ Agregar las rutas nuevas del Sprint 3.

---

## 6. Validaciones campo por campo: prototipo vs backend

### 6.1 Clientes (Registrarme, Nuevo cliente, Editar datos, Ver más, Mi perfil)

| Campo | Prototipo | Backend | Estado | Acción |
|---|---|---|---|---|
| Nombre | Obligatorio, máx. 80. "Ingresá el nombre" / "Máximo 80 caracteres" | Obligatorio, máx. 80 | ✅ | En "Ver más" del Administrador no hay validación local: agregarla |
| Apellido | Igual que el nombre | Igual | ✅ | Ídem |
| Tipo de documento | DNI / Pasaporte (selector) | `DNI` / `PASSPORT` | ✅ | |
| N° de documento | DNI: 7 u 8 números ("El DNI tiene que tener 7 u 8 números"). Pasaporte: letras y números. Se normaliza | DNI `^\d{7,8}$`, pasaporte `^[A-Z0-9]+$`, máx. 20 | ⚠️ | El prototipo no limita a 20 caracteres: agregar. En "Registrar cliente" del Administrador el input es `type=number` (rompe pasaportes y ceros a la izquierda): cambiar a texto |
| Correo electrónico | Obligatorio, formato válido | Obligatorio, formato, máx. 150, minúsculas | ⚠️ | El prototipo no limita a 150: agregar. Mensajes: "Ingresá el correo electrónico" / "Ingresá un correo electrónico válido" |
| Teléfono | Opcional, solo números, espacios, `+ - . ( )`, 8 a 15 números | Igual | ✅ / ❌ | ✅ en Registrarme, Nuevo cliente y Editar datos. ❌ en **Mi perfil** dice "mínimo 6": corregir a 8–15 |
| Fecha de nacimiento | Opcional. `DD/MM/AAAA` con máscara; tiene que existir, no ser futura y tener año ≥ 1900 | `YYYY-MM-DD`, no futura | ⚠️ | El frontend convierte `DD/MM/AAAA` → `YYYY-MM-DD`. Agregar al backend la regla del año ≥ 1900. En "Registrar cliente" del Administrador **falta el campo** |
| Duplicados | "Ya hay un cliente registrado con ese documento (DNI). Ante cualquier duda, comunicate con el restaurante." / "Ya hay una cuenta registrada con ese email. …" | `409` con esos textos (registro) | ✅ | |

### 6.2 Contraseñas

| Lugar | Prototipo | Backend | Estado |
|---|---|---|---|
| Login | Obligatoria ("Ingresá tu contraseña") | No vacía, máx. 64; no valida forma | ✅ |
| Registrarme | 8 a 64 ("Entre 8 y 64 caracteres."), distinta del email | 8–64, ≤ 72 bytes, ≠ email | ⚠️ El prototipo no controla los 72 bytes: igual responde el backend. Mostrar su mensaje |
| Crear usuario / Cambiar contraseña de empleado | 8–64, mayúscula, número, carácter especial, ≠ mail | 8–64, ≤ 72 bytes, ≠ email | ⚠️ El generador cumple las dos reglas. Si se escribe a mano, la pantalla tiene que aceptar lo mismo que el backend (D10) |
| Mi perfil (cliente) | ≥ 8, letras y números, ≠ actual | Nuevo en el Sprint 3: regla del backend + ≠ actual + ≠ documento | ❌ Cambiar la ayuda y la validación del prototipo a la regla del backend |
| Contraseña inicial (cliente cargado en caja) | No existe | Nueva: número de documento, exenta de la regla | ❌ Nueva (contrato 3.11.3) |

> **La política única queda a futuro (D10).** Mientras tanto, la regla que manda es la del backend y ninguna
> pantalla puede rechazar una contraseña que el backend acepta.

### 6.3 Configuración de puntos

| Campo | Prototipo (texto de ayuda) | Backend | Propuesta |
|---|---|---|---|
| Monto base ($) | "> 0, hasta $ 1.000.000, con centavos si hace falta (2 decimales)" | > 0, hasta 9.999.999.999,99, 2 decimales | Backend con máx. **1.000.000** (la pantalla ya lo promete) |
| Puntos por monto | "Entre 1 y 10.000 puntos, sin decimales" | 1 a 2.147.483.647 | Backend con máx. **10.000** |
| Vigencia (meses) | "Entre 1 y 120 meses, sin decimales. Por defecto, 12 meses." | 1 a 2.147.483.647 | Backend con máx. **120** |
| Bonificación % | "Entre 1 y 100, con hasta 2 decimales." | Igual | ✅ |
| Bonificación fija | "Entre 1 y 10.000, sin decimales." | Igual | ✅ |

> Si se prefiere no tocar el backend, hay que cambiar los textos de ayuda del prototipo y del frontend.
> Lo importante es que **el mismo valor** sea válido en los dos lados.

### 6.4 Empleados

| Campo | Prototipo | Backend | Estado |
|---|---|---|---|
| Nombre / Apellido | Obligatorios, máx. 80 ("El nombre es obligatorio") | Igual | ✅ |
| Mail | Obligatorio al crear, formato válido; **solo lectura al editar**. "Ya existe un empleado registrado con ese mail." | Obligatorio, máx. 150, minúsculas, no editable; único global | ❌ La unicidad tiene que ser entre activos (D2) |
| Teléfono | Opcional, 8–15 números | Opcional en la API, `NOT NULL` en la base | ❌ Migrar la columna |
| Rol | Cajero / Administrador | `CASHIER` / `ADMIN` | ✅ |

---

## 7. Pantallas del prototipo que no coinciden con lo hecho

| # | Dónde | Qué pasa | Qué hacer |
|---|---|---|---|
| P1 | **Caja → "Buscar cliente"** | En la v2, esa opción abre la pantalla de **registrar consumo**. La pantalla vieja de búsqueda, con **"Editar datos"** (US-18), quedó oculta (`eIsCliente: false`), y la ficha no tiene edición. Hoy el **Cajero no puede editar un cliente** | Decidir: (a) agregar "Editar datos" en la ficha del cliente para el Cajero, o (b) que la edición sea solo del Administrador y cambiar el actor de US-18 |
| P2 | **Baja de cliente (US-20)** | El backlog dice "Como Cajero", pero en el prototipo la baja está solo en Clientes del Administrador ("Eliminar") | Mismo criterio que P1: agregar la baja al Cajero o cambiar el actor de US-20 |
| P3 | Caja → resumen del cliente inactivo | Muestra "Dado de baja" y "Reactivar cuenta" | Sacar (D1). Un inactivo se trata como inexistente |
| P4 | Modal de empleado | Botón "Reactivar usuario" | ✅ Se mantiene (decisión #8) |
| P5 | Alta de cliente por Cajero o Administrador | Mensaje "Recibirá un mail para definir su contraseña". **No existe** ni la cuenta ni el mail | **Resuelto (D9):** se crea la cuenta con contraseña inicial = documento. Mensaje: "Cliente registrado. Ingresa con su mail y su número de documento como contraseña; al entrar se le va a pedir que la cambie." Agregar al prototipo la ventana "Cambiá tu contraseña" que aparece al ingresar |
| P6 | "Ver más" del Administrador | Permite editar **puntos** y documento | Puntos: sacar (contrato 3.8.2). Documento: solo el Administrador |
| P7 | Configuración → "Niveles de fidelización" (menú "Próx.") | Tabla vieja con "Agregar nivel", "Observaciones" y beneficios | Sacar. Los niveles se configuran en Puntos → Niveles (3 fijos) |
| P8 | Historial del Cliente | "Historial de compras", "Compra #101" | Cambiar a "Consumo" (D8) |
| P9 | Varias tablas | "DNI" escrito fijo aunque sea pasaporte | Mostrar el tipo real |
| P10 | Nombre del Cliente | El login ya lo trae (el doc dice que no) | Mi perfil igual usa `GET /customers/me`, que trae también documento, contacto y fecha de alta. Actualizar el doc de autenticación |
| P11 | Registrar cliente (Administrador) | Faltan "Fecha de nacimiento" y la validación local; documento con input numérico | Unificar con el formulario "Nuevo cliente" de Caja |
| P12 | Auditoría | El estado del prototipo conserva filtros viejos (`auditoriaAccionFiltro` con "Sesión", "Compras"…) que ya no se usan | Limpiar el `.dc.html` |

---

## 8. Panel "Tipos de datos" del prototipo: correcciones

El prototipo tiene un panel "Datos de la sección abierta" (Dato · Tipo · Oblig.). Estas filas no coinciden
con el backend:

| Sección del panel | Fila | Dice | Debería decir |
|---|---|---|---|
| Mi perfil | Documento | `enum + int` | `enum + String`, **no editable** |
| Mi perfil | Nombre y apellido | Oblig. "Sí" | Solo lectura (lo carga el restaurante) |
| Editar cliente (Administrador) | Número de documento | `int` | `String` |
| Editar cliente (Administrador) | Puntos | `int`, Sí | Sacar la fila (los puntos se ajustan aparte) |
| Editar cliente (Administrador) | — | — | Agregar "Motivo del cambio · String · Sí" |
| Registrar cliente (modal) | Número de documento | `int` | `String` |
| Registrar cliente (modal) | — | — | Agregar "Fecha de nacimiento · Date · No" |
| Puntos (configuración) | Valor de bonificación | `int` | `decimal` (porcentaje con 2 decimales) / `int` (fijo) |
| Puntos (configuración) | — | — | Agregar "Umbral Plata · int · Sí" y "Umbral Oro · int · Sí" |
| Clientes (Administrador) | — | — | Agregar "Saldo · int · Sistema" y "Fecha de alta · Date · Sistema" |
| Auditoría | Todas | Date · Empleado · Acción · Filtro: acción… | Reemplazar por los campos del contrato 3.9.4 |
| Buscar clientes (Caja) | Monto total de compra, Observaciones, Motivo de anulación | Mezcla del flujo viejo | Separar: Buscar (tipo y número) · Consumo (monto, observaciones) · Anulación (motivo) |

---

## 9. Documentos que hay que actualizar

| Documento | Qué cambiar |
|---|---|
| Definición del Producto — Product Backlog | Agregar **US-59** (perfil, contraseña y cierre de sesión del Cliente) con **RF-065** (RF-064 ya es el registro). Revisar los actores de US-18, US-20, US-22 (también el Administrador) y US-23/US-26 (también el Administrador) |
| Definición del Producto — US-21 | Aclarar el cálculo con truncamiento y si las "observaciones" quedan |
| Definición del Producto — US-24 | Dice "ajustar los puntos otorgados **por una compra**". El prototipo ajusta el **saldo del cliente** con motivo. Reescribir |
| Definición del Producto — US-27 | Dice "nombre, puntaje mínimo y beneficios". Ahora son 3 niveles fijos, solo se configuran los umbrales y los beneficios están pendientes |
| Definición del Producto — Roles del Sistema | Agregar US-59 al Cliente. Sumar al Administrador las historias de consumo y puntos que también hace |
| Máquinas de estado | Consumo: `Registrado → Anulado` (final). Lote: si se anula su consumo, pasa a `Consumido` (decisión #11, sin estado nuevo) |
| Todos los documentos | Sacar la reactivación de clientes y empleados; dejar la de usuarios (lista en la [sección 4](#4-quitar-la-reactivación-de-clientes-y-empleados)) |
| Definición del Producto — US-17 | Agregar: el alta crea la cuenta del cliente con contraseña inicial = número de documento, y al ingresar se le pide cambiarla |
| `docs/` del repo | Unicidad entre activos para empleados y cuentas (actualizar ADR 006 o escribir un ADR 008) |

---

## 10. Casos de prueba de regresión

Cada caso: **Datos** → **Resultado esperado**. Correrlos con el backend real (`VITE_API_MOCKS=false`).

### 10.1 Autenticación y registro

| # | Caso | Datos | Esperado |
|---|---|---|---|
| A1 | Login correcto de cada rol | Cuentas del seed | `200`; pantalla según el rol |
| A2 | Login con contraseña incorrecta | | `401 INVALID_CREDENTIALS`, "Los datos de acceso son incorrectos." |
| A3 | Login de un empleado dado de baja | | `401` (mismo mensaje) |
| A4 | Login de un cliente dado de baja | | `401` (mismo mensaje) |
| A5 | Registrarme con datos válidos | DNI nuevo, email nuevo | `201`; después, el login funciona |
| A6 | Registrarme con un documento activo | DNI de Carolina | `409`, mensaje del documento |
| A7 | Registrarme con el email de un **empleado activo** | | `409`, mensaje del email |
| A8 | Registrarme con el email de un **cliente dado de baja** | | `201` (después de la migración de la [sección 3](#3-unicidad-de-email-entre-registros-activos-cambio-principal)) |
| A9 | Contraseña igual al email | | `400` |
| A10 | Contraseña de 64 caracteres con tildes (> 72 bytes) | | `400` |
| A11 | Cerrar sesión | | `204`; el refresh posterior da `401 INVALID_SESSION` |
| A12 | Access token vencido | Esperar 15 min | El frontend renueva y repite el pedido una vez |
| A13 | Login de un cliente cargado en caja | Mail + número de documento | `200` con `mustChangePassword: true`; se abre la ventana "Cambiá tu contraseña" |
| A14 | Cambiar la contraseña inicial por el mismo documento | | `400 PASSWORD_SAME_AS_DOCUMENT` |
| A15 | "Ahora no" en la ventana y volver a ingresar | | La ventana vuelve a aparecer |
| A16 | Cambiarla desde Mi perfil | | `204`; el próximo login trae `mustChangePassword: false` |
| A17 | Login de un cliente autorregistrado | | `mustChangePassword: false` |

### 10.2 Clientes

| # | Caso | Esperado |
|---|---|---|
| C1 | Alta con DNI de 6 dígitos | `400` "El DNI tiene que tener 7 u 8 números" |
| C2 | Alta con pasaporte `AB-123 456` | Se guarda `AB123456` |
| C3 | Alta con teléfono `12345` | `400` |
| C4 | Alta con fecha de nacimiento futura | `400` |
| C5 | Alta con el email de otro cliente **activo** | `409` |
| C6 | Alta con el documento de un cliente **dado de baja** | `201`; hay dos registros, uno activo |
| C7 | Buscar por documento a un cliente dado de baja | La pantalla dice "no existe" y ofrece registrarlo |
| C8 | Editar un cliente dado de baja | `409` |
| C9 | Dar de baja a un cliente | `204`; no puede iniciar sesión ni renovar (ya funciona); su cuenta queda `is_active = false` (falta) |
| C10 | Llamar a `PATCH /customers/:id/activate` | `404` (la ruta ya no existe) |
| C11 | Cambiar el email de un cliente con cuenta | Después inicia sesión con el email nuevo |
| C12 | Alta en caja | Se crean el cliente **y** la cuenta; si el email lo usa otra cuenta activa, `409` y no se crea nada |
| C13 | El Administrador corrige el documento de un cliente que no cambió la contraseña inicial | La contraseña inicial pasa a ser el documento nuevo |

### 10.3 Empleados y usuarios

| # | Caso | Esperado |
|---|---|---|
| E1 | Alta de empleado sin teléfono | `201`; `phone: null`; en la base `NULL` (no `''`) |
| E2 | Alta con el email de un empleado **activo** | `409` |
| E3 | Alta con el email de un empleado **dado de baja** | `201` |
| E4 | Editar con `email` en el body | `400 property email should not exist` |
| E5 | Bajar al único Administrador | `409 LAST_ADMIN` |
| E6 | Degradar al único Administrador a Cajero | `409 LAST_ADMIN` |
| E7 | Crear usuario escribiendo a mano `abcdefgh` (cumple la regla del backend) | `201`: la pantalla no la rechaza (D10) |
| E8 | `PATCH /usuarios/:id` con `role` | `400` (sacado del DTO) |
| E9 | Cambiar la contraseña de un empleado conectado | Se cierran sus sesiones (Sprint 3) |
| E10 | Dar de baja el usuario | No puede ingresar; sesiones revocadas |
| E11 | Cajero llama a `/api/empleados` | `403 FORBIDDEN` |
| E12 | Reactivar un usuario dado de baja | Vuelve a ingresar con su contraseña anterior; auditoría `USER_ACCOUNT_REACTIVATED` |
| E13 | Reactivar un usuario cuyo email ya usa otra cuenta activa | `409 EMAIL_IN_USE` |

### 10.4 Configuración de puntos

| # | Caso | Esperado |
|---|---|---|
| P1 | Equivalencia $1.000 = 10 pts | `200`; versión nueva; mensaje de guardado |
| P2 | Monto base 1.000.001 | `400` (si se alinea el límite) |
| P3 | Puntos 10.001 | `400` (ídem) |
| P4 | Vigencia vacía | Se guarda 12 |
| P5 | Vigencia 121 | `400` (ídem) |
| P6 | Bonificación 0,5 % | `400` |
| P7 | Bonificación fija 15,5 | `400` |
| P8 | Guardar sin cambios | Botón deshabilitado |
| P9 | Cajero llama a `/loyalty/configuration/current` | `403` |

---

## 11. Resumen de cambios a hacer

| Prioridad | Cambio | Capa |
|---|---|---|
| Alta | Unicidad de email **entre activos** en `employees` y `accounts`, y login por cuenta activa | Backend + migración |
| Alta | Publicar `customer.deactivated` y poner inactiva la cuenta del cliente (necesario para que pueda volver a registrarse) | Backend |
| Alta | Eliminar la reactivación de **clientes** (endpoint, botón, evento, documentos). La de usuarios se queda, con el control de email | Backend + frontend + prototipo + docs |
| Alta | Alta de cliente en caja con cuenta y contraseña inicial = documento; columna `must_change_password`; campo en login y refresh; ventana de cambio; cuentas para los clientes que ya existen (D9) | Backend + migración + frontend + prototipo |
| Alta | Recuperar "Editar datos" (y la baja) del Cajero o cambiar los actores de US-18 y US-20 (P1, P2) | Producto + prototipo |
| Media | `employees.phone` nullable | Migración |
| Media | Sacar `role` de `UpdateAccountDto` | Backend |
| Media | Unificar los límites de configuración de puntos (1.000.000 / 10.000 / 120) | Backend o textos |
| Media | Que ninguna pantalla exija más que la regla del backend (la política única queda a futuro) | Frontend + prototipo |
| Media | Teléfono 8–15 en Mi perfil; documento como texto y fecha de nacimiento en "Registrar cliente" del Administrador | Prototipo + frontend |
| Baja | Año ≥ 1900 en fecha de nacimiento | Backend |
| Baja | Mensajes de error en español en los módulos viejos | Backend |
| Baja | Corregir el panel "Tipos de datos" y los textos "Compra" / "DNI" | Prototipo |
| Baja | Actualizar la documentación (sección 9) | Docs |
