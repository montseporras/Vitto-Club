# `accounts` (rama `users`) vs. la rama de Jaz (SCRUM-160)

Documento para entender en qué se diferencian las dos piezas de trabajo, dónde se pisan y cómo se
conectan.

> **Aclaración sobre el nombre de la rama.** La rama `feature/SCRUM-160-customer-registration`
> **no existe** en el remoto. La que subió Jaz (autora de git: `jachu`) se llama
> **`feature/SCRUM-160-customer-uniqueness`**. Es la que se compara acá. El **registro de clientes**
> propiamente dicho (`registerCustomer`) **todavía no está escrito**: Jaz lo va a hacer cuando
> `feature/auth-login` esté en `develop`. En la sección 6 está qué falta.

---

## 1. Qué es cada una, en una línea

| | `accounts` (rama `users`) | Rama de Jaz (`…-customer-uniqueness`) |
|---|---|---|
| Autora | Montse | Jaz (`jachu`) |
| Qué construye | Un **módulo nuevo**: las cuentas de acceso (email + contraseña + rol) de los empleados | **Cambios en un módulo existente** (`customers`): reglas de unicidad de documento y email |
| Pregunta que responde | "¿Quién puede entrar al sistema y con qué rol?" | "¿Puede haber dos clientes con el mismo documento o email?" |
| Tamaño | 25 archivos nuevos o modificados | 11 archivos |
| Commits | Varios | 2 (`1b149dd`, `4160eca`) |
| Tests | 122 unitarios + 4 e2e | +8 unitarios |
| Migraciones | Tabla `accounts` | 2 (índices únicos parciales) |

Base común de las dos ramas: `2cb7817`.

---

## 2. Tabla comparativa

| Aspecto | `accounts` | Jaz |
|---|---|---|
| Módulo | `backend/src/accounts/` (nuevo, completo: dominio, aplicación, infraestructura, http) | `backend/src/customers/` (ya existía; se modifica) |
| Endpoints | `/api/usuarios` (ABMC de cuentas) | Ninguno nuevo: cambia el comportamiento de alta y edición de clientes |
| Tablas | Crea `accounts` | No crea tablas; cambia **índices** de `customers` |
| Eventos de dominio | **Escucha** `employee.deactivated` y `employee.role-changed` | No publica ni escucha nada todavía |
| Dependencias de otros módulos | Usa `employees` (y desde auth-login, `customers` para el login de clientes) | Solo `customers` |
| Transacciones | Usa la transacción ambiente y `TransactionRunner` | No; `customers` hoy usa `$transaction([...])` en `updateStatus` |
| Error de dominio nuevo | `LAST_ADMIN` (pendiente de agregar el `code`) | `CustomerAlreadyExistsError` |
| Quién lo consume | `auth` (login) | `accounts` (cuando orqueste el registro) |

---

## 3. Qué hace exactamente la rama de Jaz

Dos commits sucesivos que son **una sola idea corregida**:

1. **`1b149dd` — unicidad entre clientes activos.** Un documento (o email) podía repetirse mientras
   uno de los clientes estuviera dado de baja.
2. **`4160eca` — unicidad entre todos los clientes.** Corrección posterior, confirmada por el
   Product Owner el 07/10: el documento y el email son únicos **incluso si el cliente está inactivo**.
   Por eso hay dos migraciones: `…_customers_unique_among_active` y `…_customers_unique_email_all`.

Resultado final: un documento o email duplicado, sea el otro cliente activo o no, devuelve **409**
con el mensaje *"A customer with that document or email already exists"* (filtro de excepciones de
`customers`). El detalle está en `docs/customers-api.md`.

Archivos de Jaz: `schema.prisma`, las 2 migraciones, `customers.service.ts` (+spec),
`customer.repository.ts` (puerto), `customers.repository.ts`, `customer-already-exists.error.ts`,
`customers-exception.filter.ts` (+spec) y `docs/customers-api.md`.

---

## 4. Dónde se pisan: 5 archivos en común

`accounts` (rama `users`) también toca `customers`: agrega la **validación de que el email de un
cliente no esté ya en una cuenta de empleado**. Los dos cambios caen en estos archivos:

| Archivo | Qué hizo Montse | Qué hizo Jaz | Cómo resolver |
|---|---|---|---|
| `customers.service.ts` | Chequea el email contra empleados | Chequea unicidad de documento y email entre clientes | **Quedarse con las dos validaciones**, una detrás de otra |
| `customers.service.spec.ts` | Tests de lo de Montse | Tests de lo de Jaz | Conservar ambos juegos de tests |
| `customer.repository.ts` (puerto) | Agrega `existsByEmail` | Agrega un método de existencia propio | Si hacen lo mismo, **unificarlos en uno solo** |
| `customers.repository.ts` | Implementa lo suyo | Implementa lo suyo | Igual: sin duplicar |
| `docs/customers-api.md` | Documenta el 409 por email de empleado | Documenta el 409 por duplicado | Juntar ambos párrafos |

**Cuándo aparece el conflicto:** al mergear una con la otra, o las dos a `develop`. Conviene que
el primero en entrar sea quien más cambios tenga (`users`), y que Jaz resuelva sobre eso.

Para verlo sin modificar nada:

```powershell
git merge-tree --write-tree --name-only origin/users origin/feature/SCRUM-160-customer-uniqueness
```

---

## 5. Cómo se conectan (el diseño del registro de clientes)

Decisión tomada (opción **X**): el registro lo **orquesta `accounts`**, no `customers`.

```
POST /api/auth/register  (público)
        │
        ▼
accounts.registerCustomer(...)       ← una sola transacción
   1. customersService.create(...)   ← usa las reglas de Jaz (409 si duplicado)
   2. crea la cuenta (email + hash)  ← unicidad de email en accounts
```

- **`customers` nunca importa `accounts`.** Evita el ciclo; `accounts` ya depende de `customers`.
- **Una transacción.** Si falla la cuenta, no queda el cliente; si falla el cliente, no hay cuenta.
- **Opción B:** el documento y el email son únicos entre *todos* los clientes, así que no existe el
  caso "cliente dado de baja que se registra de nuevo con los mismos datos": recibe 409. Es lo que
  hace la rama de Jaz, y por eso su trabajo es **prerrequisito** del registro.
- **Una cuenta por email.** `Account.email` es único: un email = una cuenta, sea de un empleado o de
  un cliente.
- **No devuelve tokens.** Después de registrarse, el cliente inicia sesión (flujo normal).
- Los datos que cambian en `customers` y se reflejan en la cuenta: **solo el email**, por el evento
  `customer.email-changed`.

---

## 6. Qué falta para el registro (y de quién es)

| Pendiente | Dueño |
|---|---|
| Partir de `origin/feature/auth-login` (no de `develop`) y abrir el PR contra esa rama | Jaz |
| `registerCustomer` en `accounts` + endpoint público `@Public()` + DTO + tests | Jaz (con aval de Montse por ser su módulo) |
| `customers.repository.ts`: usar `client` (transacción ambiente) en vez de `$transaction([...])` en `updateStatus` | Jaz |
| `customers` debe **publicar `customer.email-changed`** al cambiar el email. El listener de `accounts` ya está escrito (ver `docs/cambios-en-accounts.md`) | Jaz |
| Código de error para "cliente dado de baja intenta entrar" (`CUSTOMER_INACTIVE`) | Pendiente del Product Owner |
| Resolver los 5 conflictos de la sección 4 | Jaz |

---

## 7. Resumen para quedarse tranquila

- **No compiten:** `accounts` agrega *quién entra*; Jaz refina *qué clientes pueden existir*.
- El único choque real son **5 archivos de `customers`**, resolubles quedándose con las dos partes.
- El trabajo de Jaz es la base de la unicidad que el registro necesita; el registro en sí
  **todavía no existe en ninguna rama**.
- Lo que cambió el bloque de autenticación sobre `accounts` está en `docs/cambios-en-accounts.md`.
