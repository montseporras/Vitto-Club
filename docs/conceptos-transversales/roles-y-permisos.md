# Roles y permisos

## Roles

| Rol | Valor | Dueño de la cuenta | Quién lo define |
|---|---|---|---|
| Administrador | `ADMIN` | Empleado | `Employee.role` (fuente de verdad); `Account.role` es una copia sincronizada por evento |
| Cajero | `CASHIER` | Empleado | Ídem |
| Cliente | `CUSTOMER` | Cliente | Siempre `CUSTOMER` en la cuenta |

Una cuenta tiene **un solo rol**. Todos los roles inician sesión con **email + contraseña**.

## Cómo se aplica

- Los guards `JwtAuthGuard` y `RolesGuard` están registrados como `APP_GUARD` en `AuthModule`, primero
  autenticación y después roles. Protegen toda la aplicación.
- Los decoradores `@Roles()`, `@Public()` y `@CurrentUser()` viven en `backend/src/shared/security/`;
  los guards, en `auth`. Así `accounts` no tiene que importar `auth`.
- **Un endpoint sin `@Roles()` ni `@Public()` queda cerrado para todos** (falla cerrado, no abierto).
- `@CurrentUser()` entrega `{ accountId, role, employeeId?, customerId? }`. El identificador estable es
  `accountId`; no trae nombre ni email.

## Matriz de permisos

Según el estado documentado en octubre de 2026 (`contexto-proximo-chat`) y confirmado en los controllers
leídos (`accounts`, `auth`, `loyalty`):

| Endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/api/auth/*`, `/api/health` | público | público | público |
| `/api/customers/*` | Sí | Sí | No |
| `/api/empleados/*` | Sí | No | No |
| `/api/usuarios/*` | Sí | No | No |
| `/api/loyalty/configuration/*` | Sí | No | No |

> `/api/loyalty/configuration/*` figura con `@Roles('ADMIN')` en los controllers del código. La matriz
> original (anterior a loyalty integrado) no la incluía. **Verificar** que los endpoints del frontend
> del cliente (puntos, recompensas) no estén pendientes de definición: no hay documentación de ellos.

## Efecto de una baja o un cambio de rol

El access token ya emitido sigue valiendo hasta 15 minutos. Es una limitación aceptada, para no
consultar la base en cada pedido. Ver [autenticación y sesiones](./autenticacion-y-sesiones.md).

## Referencias

- Test de la matriz: `backend/test/endpoint-permissions.e2e-spec.ts`. Ver [testing/auth](../testing/auth.md).
- Códigos de error: [errores y códigos](./errores-y-codigos.md).
