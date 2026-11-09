# Roles y permisos

## Roles

| Rol | Valor | Dueño de la cuenta | Quién lo define |
|---|---|---|---|
| Administrador | `ADMIN` | Empleado | `Employee.role` (fuente de verdad); `Account.role` es una copia sincronizada por evento |
| Cajero | `CASHIER` | Empleado | Ídem |
| Cliente | `CUSTOMER` | Cliente | Siempre `CUSTOMER` en la cuenta |

Una cuenta tiene **un solo rol**. Todos los roles inician sesión con **email + contraseña**.

En el frontend los roles se tipan con `Role` de `frontend/src/domain/roles.ts` y las etiquetas salen de
`ROLES`. Nunca se escribe "Cajero" o "Administrador" a mano.

## Cómo se aplica

- Los guards `JwtAuthGuard` y `RolesGuard` están registrados como `APP_GUARD` en `AuthModule`, primero
  autenticación y después roles. Protegen toda la aplicación.
- Los decoradores `@Roles()`, `@Public()` y `@CurrentUser()` viven en `backend/src/shared/security/`;
  los guards, en `auth`. Así `accounts` no tiene que importar `auth`.
- **Un endpoint sin `@Roles()` ni `@Public()` queda cerrado para todos** (falla cerrado, no abierto).
- Un `@Roles` en el método **pisa** el de la clase. Así se cierran a solo Administrador `GET /consumos`,
  `GET /consumos/:code`, `GET /canjes` y `POST /customers/:id/ajustes-de-puntos`, y se abre al Cajero
  `GET /recompensas/disponibles`.
- `@CurrentUser()` entrega `{ accountId, role, employeeId?, customerId? }`. El identificador estable es
  `accountId`; no trae nombre ni email. El usuario **nunca** sale del body.
- Las reglas por rol se validan en el backend, no solo escondiendo botones: el Cajero ve consumos y
  movimientos de un cliente solo de las últimas 24 h, y solo anula sus propios consumos dentro de las 24 h.
- **Orden de las rutas:** las de `/customers/me…` se declaran antes que las de `/customers/:id…`, y
  `/recompensas/disponibles` antes que `/recompensas/:id`. Si no, Nest toma la palabra como un id.
- Los `403` **no se auditan** (decisión D-04 del 25/10).

## Matriz de permisos

Sale de los `@Roles` de los controllers de `develop` (09/11/2026). Las rutas cuelgan de `/api`.

| Endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/health` | público | público | público |
| `/mi-cuenta/password` | Sí | Sí | Sí |
| `/empleados/*` | Sí | No | No |
| `/usuarios/*` (incluye `…/reactivate` y `empleado/:employeeId`) | Sí | No | No |
| `/loyalty/configuration/*` (equivalencia, vigencia, bonificación, niveles, `current`) | Sí | No | No |
| `GET /customers`, `GET /customers/by-document`, `GET /customers/:id`, `GET /customers/:id/status-history`, `POST /customers` | Sí | Sí | No |
| `PATCH /customers/:id`, `PATCH /customers/:id/deactivate` | Sí | No (D-02) | No |
| `GET /customers/:id/puntos` | Sí | Sí | No |
| `GET /customers/:id/consumos`, `GET /customers/:id/movimientos` | Sí | Sí (últimas 24 h) | No |
| `POST /customers/:id/ajustes-de-puntos` | Sí | No | No |
| `GET /customers/me`, `PATCH /customers/me`, `GET /customers/me/puntos`, `/consumos`, `/movimientos` | No | No | Sí |
| `GET /consumos/preview`, `POST /consumos`, `PATCH /consumos/:code/anular` | Sí | Sí (anula solo los propios, < 24 h) | No |
| `GET /consumos`, `GET /consumos/:code` | Sí | No | No |
| `GET /movimientos-de-puntos` | Sí | No | No |
| `GET /auditoria`, `GET /auditoria/actores` | Sí | No | No |
| `GET /recompensas`, `GET /recompensas/:id`, `POST /recompensas`, `PATCH /recompensas/:id`, `…/activar`, `…/desactivar`, `…/eliminar` | Sí | No | No |
| `GET /recompensas/disponibles` | Sí | Sí | No |
| `GET /customers/me/recompensas`, `GET`/`POST /customers/me/canjes`, `PATCH /customers/me/canjes/:code/cancelar` | No | No | Sí |
| `GET /customers/:id/canjes`, `POST /customers/:id/canjes` | Sí | Sí | No |
| `GET /canjes` | Sí | No | No |
| `PATCH /canjes/:code/usar`, `PATCH /canjes/:code/rechazar` | Sí | Sí | No |
| `GET /canjes/:code` (Canjes por código, US-41) | Sí | Sí | No |


## Efecto de una baja o un cambio de rol

El access token ya emitido sigue valiendo hasta 15 minutos. Es una limitación aceptada, para no
consultar la base en cada pedido. Ver [autenticación y sesiones](./autenticacion-y-sesiones.md).

## Qué ve cada rol en el frontend

| Rol | Entra a | Menú |
|---|---|---|
| Cliente | `/mi-cuenta` | Barra inferior: Inicio, Historial, Misiones ("Próx."), Canjes. "Mi perfil" desde el ícono superior |
| Cajero | `/caja` (redirige a `/caja/cliente`) | Buscar cliente, Nuevo cliente (`/caja/alta-cliente`), Canjes por código (`/caja/canje`) |
| Administrador | `/admin` (redirige a `/admin/clientes`) | 7 opciones desde el 25/10: Recompensas, Canjes, Misiones ("Próx."), Clientes, Estadísticas y reportes ("Próx."), Auditoría y Consumos. "Buscar cliente" y "Movimientos de puntos" salieron del menú; sus rutas viejas (`/admin/buscar-cliente`, `/admin/movimientos`) solo redirigen. Configuración (modal): Empleados, Puntos y Notificaciones ("Próx.") |

## Referencias

- Test de la matriz: `backend/test/endpoint-permissions.e2e-spec.ts`. Ver [testing/auth](../testing/auth.md).
- Códigos de error: [errores y códigos](./errores-y-codigos.md).
- Contratos: `docs/sprint-3/API_CONTRACT_SPRINT_3.md` §4 y `docs/sprint-4/API_CONTRACT_SPRINT_4.md` §4.
