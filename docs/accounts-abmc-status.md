# ABMC de cuentas de empleados (`src/accounts`) — estado interno

Documento de seguimiento interno. Cubre **US-05 Registrar**, **US-06 Editar**, **US-07 Dar
de Baja** y **US-08 Consultar** usuario de empleado, más los dos puntos de integración con
auth (login y refresh). Las cuentas de `Customer` no están implementadas todavía — el
dominio ya las admite a nivel de tipo, pero no hay flujo real.

> **Estado general: completo de punta a punta (dominio, aplicación, infraestructura real
> contra Prisma, HTTP) y probado — pero deliberadamente no expuesto.** `AccountsModule`
> existe, con su controller y DTOs, pero **no está importado en `AppModule`**: no hay
> guards todavía, así que no hay ninguna ruta `/api/usuarios/*` alcanzable por un request
> real hoy. Eso es intencional, no un olvido.

---

## Historias

### US-05 — Registrar Usuario
`AccountsService.register()`: Employee existe (404) y activo (409), sin cuenta previa
(409), el email recibido coincide con `Employee.email` (400), único frente a `Customer`
(409, dirección `Customers → Employees`, ver más abajo), password 8-64 y distinta del
email (comparación byte a byte, sin normalizar la password), hash vía `PasswordHasher`
(puerto, sin implementación concreta). Persistencia real: `AccountPrismaRepository.save()`
lee `Employee.email`/`Employee.role` y los escribe en `Account.email`/`Account.role`.

### US-06 — Editar Usuario
- **Cambio de rol**: `updateRole()` delega en `EmployeesService.update()`. La sincronización
  de `Account.role` (copia derivada) y la protección del último ADMIN **ya no las hace
  `AccountsService` directamente** — las hace el listener del evento `employee.role-changed`
  (ver sección de eventos).
- **Reset de password**: `resetPassword()`, mismas reglas que el alta (8-64, distinta del
  email), vía `PasswordHasher`.
- Email no editable desde ningún lado de este módulo.

### US-07 — Dar de Baja Usuario
- **Vía HTTP directa** (`AccountsService.deactivate()`): baja lógica, protección del
  último ADMIN evaluada ahí mismo, publica `account.deactivated` (nadie en este
  repositorio lo escucha todavía — es para auth).
- **Vía baja de Employee**: `EmployeesService.deactivate()` publica `employee.deactivated`
  dentro de su propia transacción; el listener de `accounts` (`EmployeeEventsListener`)
  reacciona dando de baja la `Account` asociada. Si eso dejaría el sistema sin ningún ADMIN
  disponible, el listener tira y **toda la transacción se deshace** (el `Employee` tampoco
  queda inactivo). Implementado y probado con rollback real (ver `transacciones-y-eventos.md`).
- `SessionRevoker` **fue eliminado** (puerto + implementación Prisma + tests). Reemplazado
  por el evento `account.deactivated`: auth es responsable de escucharlo y revocar sesiones.

### US-08 — Consultar Usuario
`findProfileByEmployeeId`/`findProfileById`, devuelven `{accountId, employeeId, email,
role, active}`, nunca `passwordHash`. Endpoint HTTP: `GET /api/usuarios/empleado/:employeeId`.

---

## Login y refresh (para que auth los consuma)

Decisión vigente: **todos los roles autentican con email + password**, sin excepción.

- **`verifyCredentials(email, password): Promise<AuthAccountInfo | undefined>`** — normaliza
  el email (`trim().toLowerCase()`), busca por `Account.email`, descarta cuentas inactivas o
  sin match de password. Si el email no existe, **igual ejecuta `PasswordHasher.verify()`**
  contra un hash señuelo generado una sola vez internamente (texto aleatorio vía
  `node:crypto`, memoizado) — mitigación de timing, sin constante fija externa.
- **`findActiveById(accountId): Promise<AuthAccountInfo | undefined>`** — para refresh.
- Ambos devuelven `AuthAccountInfo { accountId, role, owner: AccountOwner, email }`, donde
  `AccountOwner = { employeeId } | { customerId }` (el tipo ya admite Customer; en la
  práctica hoy siempre resuelve `{employeeId}`). `email` sale directo de `Account.email`
  (ya normalizado, trim + lowercase, desde que se persistió) — no se vuelve a resolver
  Employee/Customer solo para esto. Pedido por auth: necesita devolver la misma forma en
  login y en refresh, y en refresh solo tiene `accountId`.
- `PasswordHasher` sigue siendo solo el puerto (`hash`/`verify`), sin bcrypt ni ningún
  algoritmo concreto — eso lo provee auth, registrándolo como provider en `AccountsModule`.

---

## Unicidad global de email

Dirección única y vigente: **`Customers → Employees`**. `CustomersService` valida contra
`EmployeesService.existsByEmail()` tanto al crear un cliente como al editarle el email.
`EmployeesService` **no** consulta a `Customers` (se eliminó esa dirección, con su
`forwardRef` correspondiente).

**Riesgo aceptado explícitamente**: si se crea un `Employee` con el email de un `Customer`
ya existente, `EmployeesService.create()` no lo detecta. El conflicto aparece recién al
intentar crear la `Account` de ese empleado, por `Account.email @unique` (constraint real
en Prisma desde la migración `account_email`).

---

## Integración entre módulos: eventos, no llamadas directas

`Employees` no importa ni conoce a `Accounts`, ni en código ni en imports — cero
`forwardRef` entre ambos. La integración es por los eventos de dominio definidos en
`src/shared/events/domain-events.ts` (contrato compartido, documentado a fondo en
`docs/transacciones-y-eventos.md`):

| Evento | Publica | Escucha | Efecto |
|---|---|---|---|
| `employee.deactivated` | `employees` | `accounts` | Da de baja la `Account` del empleado (con protección del último ADMIN) |
| `employee.role-changed` | `employees` | `accounts` | Sincroniza `Account.role`; protección del último ADMIN si degrada |
| `account.deactivated` | `accounts` | *(auth, pendiente)* | Revocar sesiones de esa cuenta |

Todo esto corre dentro de una transacción ambiente (`PrismaTransactionRunner`, puerto
`TransactionRunner` propio de cada módulo): si el listener tira, se deshacen **ambas**
escrituras (la del que publicó y la del que escuchó), no solo una.

`Accounts → Employees` y `Accounts → Customers` siguen siendo dependencias directas de
servicio (sin `forwardRef`, no hay ciclo), porque `AccountsService` necesita leer
`Employee.role`/`email`/`isActive` y chequear unicidad contra `Customer`.

---

## Qué falta — todo de auth, nada nuestro

- `PasswordHasher` concreto (bcrypt u otro) — puerto listo, sin implementación.
- El listener de `account.deactivated` que revoque sesiones reales.
- `JwtAuthGuard`, `RolesGuard`, decorador de rol.
- Registrar `AccountsModule` en `AppModule` — recién cuando exista lo anterior, porque sin
  guards esas rutas quedarían abiertas.
- Cuentas de `Customer` (hoy `AccountRepository`/`toDomain` solo resuelven `employeeId`).
