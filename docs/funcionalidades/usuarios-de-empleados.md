# API de usuarios de empleados (`/api/usuarios`)

Cuentas de acceso de los empleados (módulo `accounts`). Cubre US-05 Registrar, US-06 Editar, US-07 Dar de
baja y US-08 Consultar.

> **Este documento es nuevo y reúne datos dispersos** en `pedido-backend-baja-usuario`,
> `accounts-abmc-status` y `cambios-en-accounts`. Las rutas están confirmadas contra
> `backend/src/accounts/http/accounts.controller.ts`. Los cuerpos exactos de request y response **no están
> documentados en un solo lugar**: mirar los DTOs del módulo hasta que se completen acá.

## Acceso

- **Solo `ADMIN`** (`@Roles('ADMIN')` a nivel de clase). Cajero y Cliente reciben 403; sin token, 401.
- Todas las rutas cuelgan de `/api`.

## Endpoints

| Método y ruta | Qué hace | Notas |
|---|---|---|
| `GET /usuarios` | Lista todas las cuentas de **empleados**, activas e inactivas | Ordenadas por `accountId` ascendente. No incluye cuentas de clientes. Responde `AccountResponseDto[]` (`[]` si no hay) |
| `POST /usuarios` | Registra la cuenta de un empleado | Reglas en [dominio](../domain/cuentas-y-empleados.md) |
| `PATCH /usuarios/:id` | Edita datos de acceso (reset de contraseña) | El **rol ya no se cambia acá**: es `PATCH /empleados/:id`. Verificar que `role` haya salido del DTO |
| `PATCH /usuarios/:id/deactivate` | Baja lógica de la cuenta | 409 si ya está inactiva o si es el último administrador (`LAST_ADMIN`) |
| `PATCH /usuarios/:id/reactivate` | Reactiva la cuenta, conserva la contraseña | 409 si ya está activa o si el empleado está inactivo |
| `GET /usuarios/empleado/:employeeId` | Consulta la cuenta de un empleado | Nunca devuelve `passwordHash` |

## Respuesta de cuenta

```json
{ "accountId": 1, "employeeId": 1, "email": "ana.gomez@vitto.club", "role": "ADMIN", "active": true }
```

## Cómo usarlo desde el frontend

- El estado del usuario **no** viaja dentro de `/api/empleados` (empleados no conoce a cuentas). El
  frontend pide `GET /api/usuarios` y cruza por `employeeId`.
- Decidir los mensajes por `code`, no por el texto. Para `LAST_ADMIN` el pedido original propone:
  *"No se puede dar de baja: es el único administrador que puede ingresar al sistema."*

## Pendiente de verificar

- Que `GET /usuarios` y `code: LAST_ADMIN` estén en el backend integrado. La ruta `GET /usuarios` sí
  existe en el controller; el `code` no se verificó.
- Contrato completo de `POST` y `PATCH` (campos, errores).

Origen del pedido: [baja de usuario SCRUM-27](../seguimiento/pedidos/baja-usuario-SCRUM-27.md).
