# Cambios hechos en `accounts` (módulo de Montse)

Documento para quien es dueño de `backend/src/accounts/` (el ABMC de cuentas de empleados, rama
`users`) y para cualquiera a quien le toque un archivo de los que se mencionan acá. Explica **qué se
cambió en esos archivos, por qué, qué no se tocó y qué hay que hacer para traer los cambios sin
conflictos**.

- **Rama donde están los cambios:** `feature/auth-login`.
- **Base:** la rama `users` tal como estaba en `5374b54` (05/10, 23:23).
- **Quién los hizo:** el bloque de autenticación (SCRUM-158, SCRUM-159 y SCRUM-36).
- **Estado de las pruebas:** 482 tests unitarios en verde, tipos y build sin errores. Los tests
  e2e nuevos de clientes **no se pudieron correr** (Docker apagado al escribirlos); ver sección 8.

---

## 1. Resumen en una pantalla

Para que el login funcione de punta a punta, `accounts` tuvo que aprender tres cosas que no tenía:

| # | Qué se agregó | Por qué |
|---|---|---|
| A | Un **hasher de contraseñas** real (bcryptjs) y un límite de **72 bytes** | `accounts` solo tenía el *puerto* `PasswordHasher`, sin implementación: nadie podía iniciar sesión |
| B | **Seguridad por rol** en el controller y el filtro de errores | Los guards ahora son globales; `/api/usuarios` es solo para el Administrador |
| C | **Login de clientes** (y el nombre y apellido en el resultado del login) | SCRUM-159: el cliente inicia sesión con email y contraseña, igual que un empleado |

**Lo que NO se tocó:** todo el ABMC de empleados. `register`, `updateRole`, `resetPassword`,
`deactivate`, `reactivate`, `findProfile*`, los listeners de `employee.deactivated` y
`employee.role-changed`, la regla del último administrador, los DTOs y el entity `Account`.

**Diseño elegido: aditivo.** Lo de empleados queda exactamente igual y se agrega una rama nueva para
clientes. Por eso los 11 tests de login de `verifyCredentials` y los de `findActiveById` que ya
tenías siguen valiendo tal cual (solo cambian 2 expectativas, por el nombre; ver 4.3).

---

## 2. Archivos de `accounts` que se modificaron

| Archivo | Líneas | Cambio | Sección |
|---|---|---|---|
| `accounts.module.ts` | +2 (el hasher ya venía en un commit anterior) | Registra el hasher y el listener de clientes; se actualizó el comentario de cabecera | 3.5, 4.5 |
| `application/accounts.service.ts` | +95 / -5 | `verifyCredentials` y `findActiveById` con rama de clientes y nombre; handler de cambio de email | 4.3 |
| `application/accounts.service.spec.ts` | +254 / -11 | Repositorios falsos ampliados, 2 expectativas con nombre, 20 tests nuevos | 5 |
| `domain/password.ts` | +10 | Límite de 72 bytes | 3.2 |
| `domain/password.spec.ts` | +11 | 2 tests del límite | 3.2 |
| `domain/port/account.repository.ts` | +22 | Tipo `CustomerLoginRecord` y 3 métodos nuevos | 4.1 |
| `http/accounts.controller.ts` | (commit anterior) | `@Roles('ADMIN')` | 3.4 |
| `http/filters/accounts-exception.filter.ts` | +4 | 403 y campo `code` | 3.3 |
| `infrastructure/accounts.repository.ts` | +36 | Implementa los 3 métodos nuevos | 4.2 |
| `infrastructure/accounts.repository.spec.ts` | +73 | 5 tests nuevos | 5 |

**Archivos nuevos** en `accounts`:

| Archivo | Qué es |
|---|---|
| `infrastructure/bcrypt-password-hasher.ts` (+ `.spec.ts`, 8 tests) | Implementa tu puerto `PasswordHasher` con bcryptjs |
| `application/customer-events.listener.ts` | Escucha `customer.email-changed` |

**Archivos de otros módulos** que se tocaron por esto (ver sección 6).

---

## 3. Primera tanda: integración con el login

### 3.1 El hasher: `infrastructure/bcrypt-password-hasher.ts` (nuevo)

Implementa `PasswordHasher` (`hash` y `verify`) con `bcryptjs`. Se registra en `accounts.module.ts`:

```ts
{ provide: PasswordHasher, useClass: BcryptPasswordHasher },
```

- **Vive en `accounts` y no en `auth`.** Si estuviera en `auth`, `accounts` tendría que importar
  `auth` para obtenerlo, y `auth` ya importa `accounts` para el login: sería un ciclo.
- **Costo:** `BCRYPT_COST` (4 a 15, 10 por defecto). Se valida al arrancar. En los e2e se fija en 4.
- **Compatible con el seed:** el seed genera sus hashes con la misma librería, así que el login
  verifica las contraseñas del seed sin cambios. Hay un test que lo comprueba.
- Un hash guardado que no tiene forma de bcrypt devuelve `false`; no tira error.
- **Cambiar de algoritmo** (por ejemplo argon2) es escribir otro adaptador del puerto y cambiar
  *una línea* del módulo.

### 3.2 Límite de 72 bytes: `domain/password.ts`

Se agregó, además de tus 8 a 64 caracteres:

```ts
const MAX_PASSWORD_BYTES = 72;
// ...
if (Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES) {
  throw new DomainError(`Password cannot exceed ${MAX_PASSWORD_BYTES} bytes (accented characters count as 2)`, 'password');
}
```

**Por qué:** bcrypt solo mira los primeros 72 **bytes** de la contraseña y descarta el resto *sin
avisar*. Una letra con tilde ocupa 2 bytes, así que 64 letras con tilde son 128 bytes. Se probó:
esa contraseña verifica igual que sus **primeras 36 letras**; dos contraseñas distintas serían la
misma. Tu límite de 64 caracteres no alcanzaba para evitarlo. Con solo ASCII no cambia nada.

### 3.3 Filtro de errores: `http/filters/accounts-exception.filter.ts`

Cuatro cambios de una línea cada uno:

1. `403: 'Forbidden'` en `STATUS_NAMES`.
2. `let code: string | undefined;`
3. `code = typeof bodyObj.code === 'string' ? bodyObj.code : undefined;`
4. `...(code ? { code } : {}),` en la respuesta.

**Por qué:** los guards pueden devolver 401 y 403 en cualquier módulo, y cada módulo tiene su propio
filtro. Sin esto, un 403 en `/api/usuarios` saldría con `"error": "Error"` y **tu futuro
`LAST_ADMIN` no llegaría al frontend**.

### 3.4 Controller: `http/accounts.controller.ts`

Se agregó `@Roles('ADMIN')` a nivel de clase (import desde `shared/security/roles.decorator`) y se
reemplazó el comentario que decía que el módulo no estaba alcanzable. **Solo el Administrador
gestiona las cuentas**, y cualquier endpoint nuevo que le agregues ya queda protegido.

### 3.5 Módulo: `accounts.module.ts`

Registra el hasher (3.1) y el listener de clientes (4.4), y se actualizó el comentario de cabecera,
que decía que `PasswordHasher` no tenía implementación y que el módulo no estaba en `AppModule`.

---

## 4. Segunda tanda: login de clientes (SCRUM-159)

### 4.1 Puerto: `domain/port/account.repository.ts`

Un tipo nuevo y tres métodos nuevos. **No se tocó ningún método existente.**

```ts
export type CustomerLoginRecord = {
  accountId: number;
  customerId: number;
  email: string;
  passwordHash: string;
  active: boolean;
};

abstract findCustomerLoginByEmail(email: string): Promise<CustomerLoginRecord | null>;
abstract findCustomerLoginById(accountId: number): Promise<CustomerLoginRecord | null>;
abstract updateEmailByCustomerId(customerId: number, email: string): Promise<void>;
```

**Por qué una "cuenta de cliente" aparte y no la entidad `Account`:** `Account` modela solo
empleados (su dato obligatorio es `employeeId`). Hacerla servir para los dos tipos habría movido
todo el ABMC. En cambio, para el login alcanza con un registro simple.

### 4.2 Repositorio: `infrastructure/accounts.repository.ts`

Implementa los tres métodos con Prisma:

- `findCustomerLoginByEmail` y `findCustomerLoginById` buscan **sin** el filtro `employeeId: { not: null }`
  y devuelven `null` si la fila no es de un cliente (`customerId` nulo).
- `updateEmailByCustomerId` usa `updateMany` (no `update`): si el cliente no tiene cuenta, no hay
  nada que actualizar y no es un error.

Tus métodos existentes (`findByEmail`, `findById`, etc.) **siguen filtrando solo empleados**.

### 4.3 Service: `application/accounts.service.ts`

**`verifyCredentials`:**

```ts
const account = await this.accountsRepository.findByEmail(normalizedEmail);

// No es una cuenta de empleado: puede ser de un cliente (o no existir)
if (!account) {
  return await this.verifyCustomerCredentials(normalizedEmail, password);
}
// ... el resto, igual que antes ...
```

Primero se busca una cuenta de empleado, como siempre. Si no hay, se busca una de cliente. La
mitigación de timing (el hash señuelo) también corre para clientes.

**`findActiveById`:** igual: si `findById` no encuentra una cuenta de empleado, prueba con una de
cliente.

**`AuthAccountInfo` cambió:**

```ts
export type LoginRole = AccountRole | 'CUSTOMER';

export type AuthAccountInfo = {
  accountId: number;
  role: LoginRole;          // antes: AccountRole
  owner: AccountOwner;
  email: string;
  firstName: string;        // nuevo
  lastName: string;         // nuevo
};
```

- `ACCOUNT_ROLES` **no se tocó**: sigue siendo `['ADMIN', 'CASHIER']`, que es lo que validan tus DTOs.
  `CUSTOMER` existe solo en el tipo del login (`LoginRole`).
- **`firstName` y `lastName` son nuevos y valen para empleados y clientes.** Se leen de `Employee`
  o `Customer` en cada login y renovación; no van dentro del token. **Esto resuelve el pendiente
  de "nombre y apellido en `AuthAccountInfo`"**: no hace falta que lo hagas.
- Por eso **cambian 2 expectativas** de tus tests (el primer `toEqual` de `verifyCredentials` y el
  primero de `findActiveById`), que ahora incluyen el nombre.

**Una decisión que conviene que conozcas:** el estado del cliente (activo o dado de baja) **se lee
de `Customer` en cada login y renovación; no se copia en la cuenta.**

```ts
const customer = await this.customersService.findById(record.customerId);
if (!customer.isActive()) return undefined;
```

Por eso dar de baja a un cliente corta su acceso al instante y reactivarlo lo devuelve, **sin
sincronizar nada ni escuchar eventos de baja o reactivación**. Es la misma idea que ya usás con el
rol de un empleado, que sale de `Employee`. Lo único que sí hay que sincronizar es el email.

**`handleCustomerEmailChanged`** (nuevo): si un cliente cambia su email, actualiza el de su cuenta.
Si el email nuevo ya lo usa **otra** cuenta (de un empleado o de otro cliente), tira `409` y, como
corre en la transacción de quien publicó, se deshace también el cambio en `Customer`.

### 4.4 Listener nuevo: `application/customer-events.listener.ts`

Copia la forma de tu `employee-events.listener.ts`: `@OnEvent(CUSTOMER_EMAIL_CHANGED, { suppressErrors: false })`.
`suppressErrors: false` es obligatorio: sin eso un error en el listener se traga y la operación sigue.

### 4.5 Qué falta para que esto se dispare

El listener escucha `customer.email-changed`, pero **`customers` todavía no lo publica**. Hasta que
lo haga (es parte de la rama de registro, SCRUM-160), el listener nunca se ejecuta. El resto del
login de clientes funciona sin eso.

---

## 5. Tests

| Archivo | Tests nuevos | Qué cubren |
|---|---|---|
| `accounts.service.spec.ts` | 20 | Login de clientes (rol, owner, nombre, mayúsculas, contraseña incorrecta, cliente dado de baja y reactivado, cuenta inactiva, timing), renovación, y el cambio de email (incluidos los 409) |
| `accounts.repository.spec.ts` | 5 | Los tres métodos nuevos |
| `password.spec.ts` | 2 | Límite de 72 bytes |
| `bcrypt-password-hasher.spec.ts` | 8 | El hasher |

Para que compilen **hubo que tocar tus repositorios falsos**:

- `FakeAccountRepository` (en `accounts.service.spec.ts`) tiene ahora los tres métodos nuevos y un
  mapa `customerLogins`.
- `FakeCustomerRepository` tiene un `findById` real con un mapa `items` (antes tiraba
  "not implemented").
- El `fakePrisma()` de `accounts.repository.spec.ts` tiene `updateMany`.

---

## 6. Archivos de otros módulos que se tocaron por esto

| Archivo | Cambio | Por qué |
|---|---|---|
| `employees/application/employees.service.spec.ts` | +9 / -1 | Tiene **su propio** `FakeAccountRepository`: al agregar métodos al puerto dejaba de compilar. Tres métodos de relleno y un import |
| `employees/http/employees.controller.ts` | +2 | `@Roles('ADMIN')` |
| `customers/http/customers.controller.ts` | +2 | `@Roles('ADMIN', 'CASHIER')` |
| `employees/http/filters/employees-exception.filter.ts` y `customers/.../customers-exception.filter.ts` | +4 cada uno | 403 y campo `code`, igual que en 3.3 |
| `app.module.ts` | +4 | Registra `AccountsModule` y `AuthModule` |

---

## 7. Cómo traer los cambios

Con tu rama limpia:

```powershell
git fetch origin
git merge origin/feature/auth-login
cd backend
npm install
npm test
```

**Dónde esperar conflictos:** si ya tocaste alguno de estos archivos, el conflicto va a estar en
ellos: `accounts.controller.ts`, `accounts-exception.filter.ts`, `accounts.service.ts`,
`accounts.service.spec.ts`, `account.repository.ts`, `accounts.repository.ts` y
`accounts.module.ts`. La regla para resolverlos es siempre la misma: **quedarse con las dos partes**,
la tuya y la de este documento.

Para ver los conflictos antes de mergear, sin modificar nada:

```powershell
git merge-tree --write-tree --name-only HEAD origin/feature/auth-login
```

**Recomendación:** si tenés cambios pendientes en esos archivos, avisá antes. Lo más simple es que
traigas esta rama **antes** de seguir con los pendientes de abajo.

---

## 8. Cómo probarlo

```powershell
cd backend
npm run build
npm test             # esperado: 482 en verde
npm run test:e2e     # necesita Docker (docker compose up -d db)
```

**Importante:** al escribir estos cambios, Docker estaba apagado, así que **los e2e de clientes
(`test/auth-integration.e2e-spec.ts`, bloque "login de clientes") no se corrieron**. Los unitarios,
los tipos y el build sí. Si falla algún e2e, es lo primero a revisar.

Prueba a mano con el seed de demo (la cuenta de Lucía ya existe): login con `lucia@example.com` y
`SEED_DEMO_PASSWORD`. Debe dar **200** con `role: CUSTOMER`, `customerId` y su nombre.

---

## 9. Lo que sigue pendiente de `accounts`

| Pendiente | Estado |
|---|---|
| ~~`firstName`/`lastName` en `AuthAccountInfo`~~ | **Hecho** con estos cambios |
| `code: 'LAST_ADMIN'` en los dos `ConflictException` del último administrador (`assertNotLastAvailableAdmin` y `assertOtherAdminRemainsAvailable`), con el formato `{ statusCode: 409, error: 'Conflict', message, code: 'LAST_ADMIN' }`. El filtro **ya lo deja pasar** | Tuyo |
| Sacar `role` de `PATCH /api/usuarios/:id` (decisión del PO: el rol se cambia solo desde empleados). Toca `update-account.dto.ts`, el controller y `updateRole` | Tuyo |
| `GET /api/usuarios` con `{ id, employeeId, active }` por cuenta | Tuyo |
| Corregir `docs/accounts-abmc-status.md`: `AuthAccountInfo` sí tiene `email` (y ahora nombre), y `PasswordHasher` ya tiene implementación | Tuyo |
| Abrir el PR de `users` a `develop` | Tuyo |
| **Registro de clientes** (`registerCustomer`): lo orquesta `accounts`, lo hace Jaz (SCRUM-160). Ver `docs/accounts-vs-rama-scrum-160.md` | De Jaz; coordinar con vos |

Los puntos de `LAST_ADMIN` y de sacar `role` caen justo en archivos tocados acá (el controller y el
filtro): conviene **traer esta rama primero**, para no resolver conflictos después.

---

## 10. Por qué se hizo así (resumen de decisiones)

| Decisión | Motivo |
|---|---|
| El hasher vive en `accounts` | Evita el ciclo `accounts` ↔ `auth` |
| Límite de 72 bytes | bcrypt descarta en silencio lo que pase de 72 bytes |
| Cambio aditivo para clientes | No mover el ABMC de empleados ni sus tests |
| `LoginRole` separado de `AccountRole` | `ACCOUNT_ROLES` valida los DTOs de empleados; `CUSTOMER` no debe ser un rol asignable ahí |
| El estado del cliente se lee de `Customer` | Una sola fuente de verdad; baja y reactivación no necesitan sincronización |
| Solo se sincroniza el email | Es la única copia de un dato de `Customer` que guarda la cuenta |
| El listener usa `suppressErrors: false` | Un conflicto de email tiene que deshacer también el cambio en `Customer` |
