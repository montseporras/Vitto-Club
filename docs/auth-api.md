# API de Autenticación (auth) — guía para el frontend

Documento para quien integra el frontend con el backend de La Vitto. Describe cómo iniciar sesión,
mantener la sesión, cerrarla y cómo reaccionar a cada error.

> **Estado:** los tres endpoints están implementados y probados, pero el inicio de sesión real todavía
> no está habilitado: se habilita al integrar el módulo con las cuentas de usuario. Mientras tanto el
> login responde siempre 401. Los endpoints de clientes y empleados **todavía no exigen token**, pero
> lo van a exigir apenas se active esa integración: conviene dejar el frontend listo antes.

---

## 1. Conexión

| | |
|---|---|
| **URL base** | `/api` (relativa). En desarrollo la resuelve el proxy de Vite hacia `http://localhost:3000`; en producción, un rewrite de Vercel hacia el backend |
| **Formato** | JSON. En los `POST` con cuerpo, `Content-Type: application/json` |
| **Cookies** | `withCredentials: true` (ya está en `src/shared/api/http.ts`) |
| **Autenticación** | El access token va en el encabezado `Authorization: Bearer <token>`. El refresh token viaja en una cookie que el JavaScript no puede leer |

---

## 2. Tipos (TypeScript)

```ts
export type UserRole = 'ADMIN' | 'CASHIER' | 'CUSTOMER';

export interface AuthUser {
  accountId: number;
  role: UserRole;
  email: string;
  employeeId?: number; // presente para ADMIN y CASHIER
  customerId?: number; // presente para CUSTOMER
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export type ErrorCode = 'INVALID_CREDENTIALS' | 'INVALID_SESSION' | 'UNAUTHENTICATED' | 'FORBIDDEN';

export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  code?: ErrorCode; // solo en los errores de autenticación y autorización
}
```

---

## 3. Iniciar sesión

`POST /api/auth/login`. Es el mismo endpoint para Cajero, Administrador y Cliente.

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `email` | string | Sí | No vacío, máximo 150 caracteres. No se valida el formato. Mayúsculas y espacios en los extremos no importan |
| `password` | string | Sí | No vacía, máximo 64 caracteres |

```json
{ "email": "ana.gomez@vitto.club", "password": "..." }
```

### Respuesta `200 OK`

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": { "accountId": 1, "role": "ADMIN", "employeeId": 1, "email": "ana.gomez@vitto.club" }
}
```

Además deja la cookie `refresh_token` (el frontend no la ve ni la maneja).

### Errores

| Código HTTP | `code` | Cuándo |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Cualquier causa: email inexistente, contraseña incorrecta, cuenta dada de baja, persona sin cuenta. **El mensaje es siempre el mismo** a propósito: `"Los datos de acceso son incorrectos"` |
| 400 | — | Falta un campo, está vacío, es muy largo o se mandó un campo de más |

---

## 4. Renovar la sesión

`POST /api/auth/refresh`. Sin cuerpo: se identifica por la cookie, que el navegador manda sola.

### Respuesta `200 OK`

**Exactamente lo mismo que el login** (`AuthResponse`). Por eso sirve para reconstruir el estado al
recargar la página: trae el rol y los ids. Reemplaza la cookie por una nueva.

### Errores

| Código HTTP | `code` | Cuándo |
|---|---|---|
| 401 | `INVALID_SESSION` | Sin cookie, sesión vencida por inactividad o por duración máxima, sesión cerrada, cuenta dada de baja, o la cookie ya fue usada por otra pestaña. **Nunca dice cuál de esas fue** |

Un fallo **no borra** la cookie: con dos pestañas abiertas, la otra puede haber dejado una nueva.

---

## 5. Cerrar sesión

`POST /api/auth/logout`. Sin cuerpo.

Responde siempre **`204 No Content`**: con sesión, sin sesión, o con una sesión ya cerrada. Cierra solo la
sesión de este dispositivo; si el usuario tiene otra abierta en otro, sigue vigente.

---

## 6. Usar el access token

- Se manda en **cada pedido** a la API (menos a `/api/auth/*`): `Authorization: Bearer <accessToken>`.
- **Guardarlo en memoria**, no en `localStorage` ni `sessionStorage`. Al recargar la página se pierde y se
  recupera llamando a `refresh`.
- Dura **15 minutos**. Después, cualquier pedido protegido responde 401 `UNAUTHENTICATED`.

| Rol | Sin actividad | Duración máxima de la sesión |
|---|---|---|
| Cajero y Administrador | 30 minutos | 12 horas |
| Cliente | 7 días | 30 días |

Son valores configurables: en la demo se pueden bajar para mostrar los vencimientos.

---

## 7. Errores de autenticación y autorización

Cualquier endpoint protegido puede responder:

| Código HTTP | `code` | Significa | Qué hacer |
|---|---|---|---|
| 401 | `UNAUTHENTICATED` | Sin token, o vencido, o inválido | Renovar la sesión y repetir el pedido (ver sección 8) |
| 403 | `FORBIDDEN` | Hay sesión, pero el rol no tiene permiso | Mostrar "no tenés permiso". Renovar no sirve |

Decidir siempre por el campo **`code`**, nunca por el texto del `message`.

---

## 8. Reglas para el frontend

1. **Al cargar la aplicación**, llamar a `refresh`. Si responde 200 hay sesión: la respuesta trae el usuario y el
   rol para elegir la pantalla. Si responde 401, ir al login.
2. **Ante un 401 `UNAUTHENTICATED`** en cualquier pedido: llamar a `refresh` y repetir el pedido original **una sola vez**.
3. **Un solo `refresh` a la vez.** Si varios pedidos reciben 401 al mismo tiempo, hacer una llamada y que los
   demás esperen su resultado. Si cada uno renueva por su cuenta, el segundo falla porque el primero ya usó la cookie.
4. **Si `refresh` falla**, reintentarlo **una vez** antes de mandar al login (la otra pestaña pudo haber dejado la
   cookie nueva).
5. **Nunca renovar con un temporizador.** Renovar solo cuando un pedido real recibe 401. La sesión vence por
   inactividad: un temporizador la mantendría viva para siempre.
6. **Ante un 403**, no renovar ni reintentar.
7. **Al cerrar sesión**: llamar a `logout`, borrar el access token de memoria y el estado del usuario, e ir al login.
   Si la llamada falla, limpiar igual.
8. **Un cambio de rol o una baja tarda hasta 15 minutos en notarse**: el access token ya emitido sigue valiendo
   hasta que vence.

---

## 9. Qué puede hacer cada rol

| Grupo de endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/api/auth/*` | público | público | público |
| `/api/health` | público | público | público |
| `/api/customers/*` (todo, incluida baja, reactivación e historial) | Sí | Sí | No |
| `/api/empleados/*` | Sí | No | No |
| `/api/usuarios/*` (cuentas de empleados) | Sí | No | No |

---

## 10. Todavía no existe

- **Datos del propio usuario** (nombre, apellido): el login devuelve ids, rol y email, pero no el nombre. Si hace
  falta, se agregan `GET /api/customers/me` y `GET /api/empleados/me`. Avisar si el frontend lo necesita.
- **Cambio de contraseña por el propio usuario.**
- **Registro de clientes** por su cuenta: es otro bloque. Su endpoint va a ser público.
