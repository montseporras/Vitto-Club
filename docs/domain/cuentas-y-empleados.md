# Dominio: empleados y cuentas de acceso

Reglas de negocio, sin HTTP. Para el contrato REST ver [empleados](../funcionalidades/empleados.md) y
[usuarios de empleados](../funcionalidades/usuarios-de-empleados.md).

> Fuente principal: `accounts-abmc-status.md` (hoy en `seguimiento/historico/`), cuyo encabezado está
> desactualizado (decía que el módulo no estaba expuesto). Las reglas de abajo son las que siguen
> vigentes en los demás documentos.

## Empleado

- Datos obligatorios: nombre, apellido, teléfono, email y rol (`ADMIN` o `CASHIER`).
- El **email es único** y **no se edita**.
- Baja lógica; se conserva el registro.
- **Un empleado tiene un solo rol**; `Employee.role` es la fuente de verdad.

## Cuenta (`Account`)

| Regla | Detalle |
|---|---|
| Un email, una cuenta | `Account.email` es único; una persona que sea empleada y clienta necesita un email distinto por rol |
| Alta de cuenta de empleado | El empleado existe (404) y está activo (409); no tiene cuenta previa (409); el email coincide con `Employee.email` (400); único frente a clientes (409) |
| Contraseña | 8 a 64 caracteres, máximo 72 bytes, distinta del email. Ver [ADR 007](../decisions/007-bcrypt-y-limite-de-72-bytes.md) |
| Email no editable | Desde ningún lado del módulo `accounts` |
| Reset de contraseña | Mismas reglas que el alta |
| Consulta | Devuelve `{ accountId, employeeId, email, role, active }`, nunca `passwordHash` |

## Baja y reactivación

- **Baja de cuenta** (`PATCH /usuarios/:id/deactivate`): lógica y reversible; el usuario no puede
  ingresar y se cierran sus sesiones; el empleado sigue activo. Publica `account.deactivated`.
- **Baja de empleado**: publica `employee.deactivated` dentro de su transacción; `accounts` da de baja la
  cuenta asociada. Si eso dejara al sistema sin administrador, **toda la transacción se deshace**.
- **Reactivación**: conserva la contraseña. Solo si el empleado está activo.

## Regla del último administrador

No se puede dejar el sistema sin un administrador disponible (empleado activo, rol `ADMIN` y cuenta
activa). Aplica a: baja de cuenta, baja de empleado y degradación de rol. El error es 409 con
`code: LAST_ADMIN` (ver [errores y códigos](../conceptos-transversales/errores-y-codigos.md)).

## Rol

Solo se cambia desde empleados (`PATCH /empleados/:id`). `accounts` sincroniza su copia por el evento
`employee.role-changed`. "Editar usuario" queda para datos de acceso (resetear contraseña). Decisión del
PO del 2026-10-06.

## Unicidad de email entre empleados y clientes

Se chequea en **un solo sentido**: `customers` consulta a `employees`. `employees` no consulta a
`customers`, para no crear una dependencia circular.

**Riesgo aceptado:** si se crea un empleado con el email de un cliente que ya existe, el conflicto aparece
recién al crearle la cuenta (por `Account.email` único). Como el email del empleado no se edita, hay que
darlo de baja y cargarlo de nuevo.

## Eventos

| Evento | Publica | Escucha | Efecto |
|---|---|---|---|
| `employee.deactivated` | `employees` | `accounts` | Da de baja la cuenta (con protección del último admin) |
| `employee.role-changed` | `employees` | `accounts` | Sincroniza `Account.role`; protección del último admin si degrada |
| `account.deactivated` | `accounts` | `auth` | Revoca las sesiones de esa cuenta |
| `customer.deactivated`, `customer.reactivated`, `customer.email-changed` | `customers` | `accounts` | Están en el contrato (`shared/events/domain-events.ts`). **No determinado** si `customers` ya los publica |

Detalle del mecanismo: [transacciones y eventos](../conceptos-transversales/transacciones-y-eventos.md).

## Dependencias entre módulos (sin `forwardRef`)

`auth → accounts → employees`, `accounts → customers`, `customers → employees`.
