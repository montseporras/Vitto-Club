# Alta de cliente con cuenta y contraseña inicial (US-17-AJ)

> **Estado:** implementado en el backend, incluida la auditoría (CA-17AJ.8, vía US-57).
> **Fuente de verdad:** [`API_CONTRACT_SPRINT_3.md`](../sprint-3/API_CONTRACT_SPRINT_3.md), §3.11.3, §3.8.4, §3.9.3 y §5.
>
> Este documento es nuevo a propósito: reúne lo que cambia esta historia para no pisar a quien edite
> `autenticacion.md`, `clientes.md` o `transacciones-y-eventos.md` en paralelo. Cuando esas ramas se
> junten, conviene pasar lo que corresponda a cada archivo y borrar lo repetido de acá.

## 1. Qué cambió

Cuando el **Cajero** ("Nuevo cliente") o el **Administrador** ("+ Registrar cliente") dan de alta un
cliente con `POST /api/customers`, ahora se crea **también su cuenta de acceso**:

| Dato de la cuenta | Valor |
|---|---|
| Rol | `CUSTOMER` |
| Email | El del cliente, normalizado (minúsculas, sin espacios) |
| Contraseña inicial | El **número de documento normalizado** (el que devuelve la API: `38456123`; en un pasaporte, en mayúsculas: `AB123456`). Solo se guarda su hash |
| `mustChangePassword` | `true` |

El body y la respuesta no cambian: `201` con el `Customer`, **sin contraseña**.

El **autorregistro** (`POST /api/auth/register`) no cambia: el cliente elige su contraseña y la cuenta
nace con `mustChangePassword = false`.

## 2. Cómo funciona (sin romper la arquitectura)

`customers` no puede importar `accounts` (ver ADR 005), así que se comunican por un evento.

```text
POST /customers
  └─ CustomersService.createWithAccount            ← abre la transacción
       ├─ create(): valida y guarda el Customer
       └─ emitAsync('customer.created', { customerId, email, documentNumber })
            └─ accounts: CustomerEventsListener.onCustomerCreated
                 └─ CustomerAccountCreationService.handleCustomerCreated
                      ├─ ¿el email lo usa otra cuenta ACTIVA?  → 409 EMAIL_IN_USE
                      ├─ hash del documento (sin pasar por la política de contraseña)
                      └─ crea la cuenta con mustChangePassword = true
```

- Todo corre en **una sola transacción**: si el listener falla, se deshace también el cliente.
- El listener usa `suppressErrors: false`; sin eso un error no llegaría a quien publicó.
- `CustomersService.create()` **no** publica el evento. Solo lo hace `createWithAccount()`. Así el
  autorregistro, que también usa `create()`, no genera una segunda cuenta.
- El hash se calcula **dentro** de la transacción, porque `customers` no conoce el hasher. Con el costo
  de bcrypt por defecto (10) agrega unos 100 ms.

### Evento nuevo

| Evento | Lo emite | Lo escucha | Datos |
|---|---|---|---|
| `customer.created` | `customers` (`createWithAccount`) | `accounts` | `{ customerId, email, documentNumber }` |

`documentNumber` es la contraseña inicial: viaja en el evento (en memoria) pero no se guarda ni se audita.

## 3. La contraseña inicial no pasa por la política

La política (8 a 64 caracteres, etc.) se aplica **cuando el cliente la cambia**. Un DNI de 7 dígitos tiene
menos de 8 caracteres y es válido como contraseña inicial: la crea el sistema y es temporal.
Por eso el listener hashea el documento directamente y no usa `Password.create`.

## 4. Errores

| HTTP | `code` | Cuándo | Mensaje |
|---|---|---|---|
| 409 | `EMAIL_IN_USE` | El email lo usa otro cliente activo, un empleado, o otra cuenta activa | "Ya hay un cliente o una cuenta activa con ese mail." |
| 409 | — | El documento ya lo tiene un cliente activo | Sin cambios (en inglés, sin `code`) |
| 400 | — | Datos inválidos | Sin cambios |

> **Decisión tomada a pedido de Magali:** el contrato da el código `EMAIL_IN_USE` pero no el texto del
> mensaje para este endpoint. Se usó el de la tabla, y se aplica a las tres causas. **Falta llevarlo al
> contrato.**

Los inactivos pueden repetir email: una cuenta inactiva con ese email **no** lo ocupa.

## 5. Login y refresh: campo nuevo

`POST /api/auth/login` y `POST /api/auth/refresh` agregan `user.mustChangePassword`:

| Quién | Valor |
|---|---|
| Cliente dado de alta por el Cajero o el Administrador, hasta que cambie la contraseña | `true` |
| Empleado | `false` |
| Cliente autorregistrado | `false` |

Viaja solo en el `user` de la respuesta, **no** va dentro del access token.

La ventana "Cambiá tu contraseña" y `PATCH /api/mi-cuenta/password` son de PERFIL, no de esta historia.
Por eso, hasta que exista ese endpoint, `mustChangePassword` no vuelve a `false`.

## 6. Clientes que ya existían sin cuenta (CA-17AJ.7)

Script de una sola vez: [`backend/prisma/create-missing-customer-accounts.ts`](../../backend/prisma/create-missing-customer-accounts.ts).

```bash
cd backend
npx ts-node prisma/create-missing-customer-accounts.ts --dry-run   # simulacro: no escribe nada
npx ts-node prisma/create-missing-customer-accounts.ts
```

- Procesa solo clientes **activos** que **no tienen cuenta**.
- Les crea la cuenta con el mismo criterio que el alta nueva.
- Si el email lo usa otra cuenta **activa**, no la crea y lo **lista por consola** para resolverlo a mano.
- Se puede correr más de una vez: un cliente con cuenta no se vuelve a procesar.
- Nunca imprime ni guarda el documento en claro.

No está agregado como script de `package.json` (es configuración compartida); se corre con `ts-node`.

## 7. Pendiente

| Qué | Por qué |
|---|---|
| **P2 · Ventana postergable** | Decidido por Magali: **postergable** ("Ahora no"). Falta anotarlo en `HISTORIAS_SPRINT_3.md` |
| **CA-17AJ.9 · Mensaje en pantalla** | Es del frontend |
| **Cuenta de un cliente dado de baja** | Con CLI-ADM la baja ya deja inactiva la cuenta (`customer.deactivated`), así que el email de un cliente dado de baja queda libre |

Resuelto desde la primera entrega:

- **CA-17AJ.8 · Auditoría:** `POST /customers` registra `CUSTOMER_CREATED` en la misma transacción
  (`AuditService.capture`, de US-57). El actor es el empleado; "Origen" sale de su rol (Caja si es
  Cajero, Administración si es Administrador). El detalle dice "Creada, contraseña inicial = número de
  documento" y nunca incluye la contraseña ni su hash. Si el alta falla (por ejemplo `EMAIL_IN_USE`) no
  queda ninguna fila de auditoría.
- **Tests e2e:** `backend/test/customer-account-creation.e2e-spec.ts` (22 casos, ejecutados contra la
  base de tests) y, aparte, el caso de auditoría de `backend/test/audit.e2e-spec.ts`.

## 8. Documentos que quedaron desactualizados

| Documento | Qué cambiar |
|---|---|
| `docs/conceptos-transversales/transacciones-y-eventos.md` | Agregar el evento `customer.created` a la tabla de eventos |
| `docs/funcionalidades/clientes.md` | El alta ahora crea la cuenta; el mensaje de email repetido y el `code` |
| `docs/funcionalidades/registro-de-clientes.md` | Aclarar que el alta por Cajero/Administrador es otro camino |
| `docs/funcionalidades/autenticacion.md` | `user.mustChangePassword` en login y refresh |
| `docs/conceptos-transversales/errores-y-codigos.md` | Código `EMAIL_IN_USE` |
| `docs/decisions/005-registro-de-clientes-orquestado-por-accounts.md` | Mencionar `customer.created` como el otro camino que crea cuentas de cliente |
