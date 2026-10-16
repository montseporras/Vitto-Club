# Pedido al backend — Baja de usuario (SCRUM-27)

> Contexto: el front de SCRUM-27 (rama `feature/SCRUM-27-baja-usuario`, apilada sobre
> SCRUM-21 y SCRUM-24) ya da de baja y reactiva el usuario de un empleado desde el
> modal "Empleados", contra `PATCH /api/usuarios/:id/deactivate` y
> `PATCH /api/usuarios/:id/reactivate`, que ya están en `develop` y **no cambian**.
>
> Faltan dos cosas para conectarlo al back real: un listado de usuarios, para saber
> qué empleado tiene usuario y si está activo, y un `code` estable en el 409 del último
> administrador. Las dos ya figuraban como pendientes en `docs/seguimiento/historico/cambios-en-accounts.md`
> (sección 9). Todo lo que no se menciona **no cambia**.

## Qué se decidió

- El estado del usuario **no** viaja dentro de la respuesta de `/api/empleados`.
  Empleados no conoce a cuentas (regla de `employees.service.ts`), así que el front
  pide `GET /api/usuarios` y lo cruza con los empleados por `employeeId`.
- La baja es lógica y reversible: el usuario no puede ingresar y se cierran sus
  sesiones; el empleado sigue activo. La reactivación conserva la contraseña.
- No se puede dejar el sistema sin un administrador disponible (empleado activo, rol
  `ADMIN` y usuario activo). El front decide el mensaje por `code`, nunca por el texto.
- No hay cambios de BD.

## 1. `GET /api/usuarios` — listar los usuarios de empleados

Solo `ADMIN`, como el resto de `AccountsController` (el `@Roles('ADMIN')` de la clase
ya lo cubre). Sin parámetros.

Qué hace:
1. Devuelve **todas** las cuentas de empleados, activas y dadas de baja.
2. No incluye las cuentas de clientes (`customerId` no nulo): `AccountResponseDto`
   tiene `employeeId: number` y el listado es para la sección "Empleados".
3. Ordenado por `accountId` ascendente.

Respuesta: `200` con `AccountResponseDto[]`, el mismo DTO de los demás endpoints de
`/api/usuarios`. Si no hay cuentas, `[]`.

```json
[
  { "accountId": 1, "employeeId": 1, "email": "ana.gomez@vitto.club", "role": "ADMIN", "active": true },
  { "accountId": 2, "employeeId": 5, "email": "lucia.fernandez@vitto.club", "role": "CASHIER", "active": false }
]
```

Errores: solo los de los guards globales (`401` sin sesión, `403` si no es `ADMIN`).

> Ojo con el orden de las rutas: `GET /usuarios` y `GET /usuarios/empleado/:employeeId`
> conviven sin conflicto, pero conviene declarar el nuevo antes en el controller.

## 2. `code: 'LAST_ADMIN'` en el 409 del último administrador

Hoy los dos chequeos de `AccountsService` tiran
`new ConflictException('This operation would leave the system without an available administrator')`,
sin `code`:

- `assertNotLastAvailableAdmin` → `PATCH /api/usuarios/:id/deactivate`.
- `assertOtherAdminRemainsAvailable` → los listeners de `employee.deactivated` y
  `employee.role-changed`, o sea `DELETE /api/empleados/:id` y el cambio de rol
  (`PATCH /api/empleados/:id`, y `PATCH /api/usuarios/:id` con `role` mientras exista).

Pedido: que los dos tiren el error con `code`:

```ts
throw new ConflictException({
  message: 'This operation would leave the system without an available administrator',
  code: 'LAST_ADMIN',
});
```

`AccountsExceptionFilter` y `EmployeesExceptionFilter` ya dejan pasar `code`, así que la
respuesta queda:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "This operation would leave the system without an available administrator",
  "path": "/api/usuarios/1/deactivate",
  "timestamp": "2026-10-13T15:00:00.000Z",
  "code": "LAST_ADMIN"
}
```

Los demás 409 de la baja (`Account with ID … is already inactive`) y de la reactivación
(`… is already active`, `Employee with ID … is inactive and cannot have its account
reactivated`) quedan como están, sin `code`.

## Resumen de códigos nuevos

| Código | Status | El front hace |
|---|---|---|
| `LAST_ADMIN` | 409 | Muestra "No se puede dar de baja: es el único administrador que puede ingresar al sistema." en la baja de usuario y en la baja de empleado. |

## Cómo probarlo desde el front

Con `VITE_API_MOCKS=false` en `frontend/.env.local` le pega al back real. Mientras tanto
se simula en `frontend/src/mocks/handlers/employees.handlers.ts`: `GET /usuarios`
devuelve las cuentas del mock (Lucía Fernández, id 5, tiene el usuario dado de baja) y
la baja del usuario de Ana Gómez, la única administradora, responde el 409 con
`code: 'LAST_ADMIN'`.
