# Cambios propuestos al contrato (surgidos al implementar PERFIL, backend)

> **Para qué es este archivo.** Al implementar "Mi perfil, contraseña y cerrar sesión del Cliente" (PERFIL)
> aparecieron puntos que el contrato (`API_CONTRACT_SPRINT_3.md`, §3.10 y §3.11) no define o define a
> medias, y uno que no se puede cumplir tal como está escrito. Se resolvieron con una decisión provisional
> para poder avanzar. **El contrato no se tocó**: lo cambia el equipo. Cada punto dice qué se hizo, dónde
> está en el código y qué habría que decidir.
>
> Escrito por Maga (con Claude) durante PERFIL, backend, en la rama `backend-maga`. Las decisiones marcadas
> "a pedido de Maga" las tomó Claude porque se le pidió que las definiera.
>
> **La sección 8 es para el frontend.**

## 1. La cookie `refresh_token` no llegaba a `PATCH /mi-cuenta/password` (§3.11.1, paso 5)

- **Qué dice el contrato:** al cambiar la contraseña "se cierran todas las otras sesiones. La actual (la de
  la cookie `refresh_token`) sigue abierta".
- **El problema:** la cookie se emitía con `Path=/api/auth`, así que el navegador solo la manda a
  `/api/auth/*`. A `/api/mi-cuenta/password` no llegaba, y el backend no tenía cómo saber cuál es la sesión
  actual (el access token no trae el id de la sesión).
- **Qué se hizo (a pedido de Maga, "opción A"):** la cookie ahora se emite con **`Path=/api`**. Sigue siendo
  `httpOnly` y `SameSite=Lax`. Además, al emitirla se borra la que pudiera tener el navegador con el path
  viejo (si no, la vieja, más específica, viajaría primero y tapa a la nueva).
- **Dónde:** `backend/src/shared/security/refresh-cookie.ts` (`REFRESH_COOKIE_PATH`,
  `LEGACY_REFRESH_COOKIE_PATH`; el archivo se movió desde `auth/http/`, porque `accounts` no puede importar
  de `auth`) y `backend/src/auth/http/auth.controller.ts`.
- **Efecto de seguridad:** la cookie viaja en todas las llamadas a la API, no solo en las de `auth`. Como
  es `httpOnly` y `SameSite=Lax`, y el resto de la API exige `Authorization: Bearer`, no se abre una puerta
  nueva; pero cambia lo que dice la documentación de sesiones.
- **A decidir / actualizar:**
  - §3.11.1 (paso 5) y la fila "Autenticación" de la §6 (línea del `Authorization: Bearer`): aclarar que la
    cookie va con `Path=/api`.
  - `docs/conceptos-transversales/autenticacion-y-sesiones.md` (la tabla de la cookie dice `Path=/api/auth`).
  - Si se prefiere otra solución (por ejemplo, un `sid` dentro del access token), hay que revertir esto.

## 2. Límite de intentos: dónde se guarda el contador (CA-PER.6, §3.10.4, §3.11.1)

- **Qué dice el contrato:** "Más de 5 contraseñas actuales incorrectas en 15 minutos" → `429
  TOO_MANY_ATTEMPTS`, con el contador compartido entre `PATCH /customers/me` y `PATCH /mi-cuenta/password`.
  No dice dónde se guarda ni qué cuenta como intento.
- **Qué se hizo (a pedido de Maga):**
  - **Contador en la memoria del proceso**, detrás de un puerto (`PasswordAttemptLimiter`). No hay tabla ni
    dependencia nueva. Se pierde si se reinicia el servidor y no sirve con varias instancias; para eso se
    escribe otro adaptador del puerto.
  - **Cuenta** solo la contraseña actual **incorrecta**. Un acierto no cuenta ni reinicia el contador.
  - **Ventana deslizante:** cada intento incorrecto cuenta durante los 15 minutos siguientes.
  - Con 5 incorrectos en la ventana, el **sexto pedido** responde `429`, aunque traiga la contraseña
    correcta. Se chequea **antes** de verificar la contraseña.
  - Es **por cuenta** (`accountId`), no por IP.
  - `PATCH /customers/me` cuenta solo cuando cambia el correo (es el único caso en que pide la contraseña).
- **Dónde:** `backend/src/accounts/domain/port/password-attempt-limiter.ts`,
  `backend/src/accounts/infrastructure/in-memory-password-attempt-limiter.ts` (con su spec).
- **A decidir:** agregar estas aclaraciones a §3.10.4 y §3.11.1; y si más adelante se quiere que sobreviva a
  reinicios, guardarlo en una tabla (cambia §3.12).

## 3. Orden de las validaciones en `PATCH /mi-cuenta/password` (§3.11.1)

- **Qué dice el contrato:** "1. Verifica `currentPassword` contra el hash. 2. Valida `newPassword`." No dice
  qué error gana si fallan las dos cosas.
- **Qué se hizo (a pedido de Maga):** ese orden. Con la actual incorrecta **y** la nueva inválida responde
  `400 CURRENT_PASSWORD_INCORRECT`. Por eso la política de la nueva **no** está en el DTO (el
  `ValidationPipe` correría antes que el servicio y la tapa): el DTO solo valida tipos, que
  `currentPassword` no sea vacía y su máximo de 64.
- **Dónde:** `backend/src/accounts/application/password-change.service.ts`,
  `backend/src/accounts/domain/password-policy.ts` (reglas en el orden de la tabla de §3.11),
  `backend/src/accounts/http/dto/change-password.dto.ts`.
- **A decidir:** dejarlo escrito en §3.11.1.

## 4. Mensajes que el contrato no da (o da solo para la pantalla)

| Caso | Qué se devuelve | Dónde |
|---|---|---|
| `PATCH /customers/me` con un body sin ningún dato (ni correo, ni teléfono, ni fecha) | `400`, sin `code`, mensaje `At least one field must be provided` (el mismo que ya usa `PATCH /customers/:id`, que está en inglés) | `CustomersService.updateOwnProfile` |
| `PATCH /customers/me` con el correo cambiado y sin `currentPassword` | `400` **sin `code`**, "Ingresá tu contraseña actual para cambiar el correo" (así lo pide la tabla de §3.10.4) | ídem |
| Fecha de nacimiento anterior a 1900 | `400` "Esa fecha no existe" (el contrato da el año mínimo pero no el mensaje) | `customers/domain/profile-birth-date.ts` |
| Teléfono inválido | `400` "El teléfono tiene que tener entre 8 y 15 números" (mismo texto de la tabla de §3.10.4) | `CustomersService.updateOwnProfile` |
| `currentPassword` de más de 64 caracteres (en los dos endpoints) | `400` "La contraseña actual es incorrecta", sin `code`: con más de 64 no puede ser la correcta | los dos DTO |
| `currentPassword` vacía o ausente en `PATCH /mi-cuenta/password`; `newPassword` ausente | `400` "Este campo es obligatorio" | `change-password.dto.ts` |
| Cuenta que ya no existe o está inactiva, con un token todavía válido | `401 UNAUTHENTICATED` | `password-change.service.ts` |
| `409 EMAIL_IN_USE` en `PATCH /customers/me` | Mensaje "Ese correo ya está registrado" (texto de §3.10.4). Ojo: el alta de cliente usa otro texto, "Ya hay un cliente o una cuenta activa con ese mail." (US-17-AJ) | `email-in-use.error.ts` de `customers` y de `accounts` |
| El nombre de estado `429` en el cuerpo del error | `"error": "Too Many Requests"` | los filtros de `accounts` y `customers` |

- **A decidir:** si estos textos y el `400` sin `code` quedan así, y si se unifican los dos textos de
  `EMAIL_IN_USE`.

## 5. Cómo se comunican `customers` y `accounts` (ADR 005)

`customers` no puede importar `accounts`, y para cambiar el correo hace falta verificar la contraseña, que es
de `accounts`. Se resolvió con eventos (aprobado por Maga). Hay dos eventos nuevos, en
`backend/src/shared/events/domain-events.ts`:

| Evento | Lo publica | Lo escucha | Para qué |
|---|---|---|---|
| `customer.email-change-requested` | `customers` (antes de escribir nada) | `accounts` | Verificar la contraseña actual (con el límite de intentos) y que ninguna otra cuenta activa use el correo. Si falla, tira el error del contrato y no se guarda nada |
| `account.password-changed` | `accounts` | `auth` | Cerrar las otras sesiones de la cuenta, dejando la de la cookie |

Con eso, "no se guarda nada si la contraseña es incorrecta" (CA-PER.5) se cumple porque la verificación va
**antes** de escribir, dentro de la misma transacción.

- **A decidir:** nombrarlos en el contrato (§8.4) y en `docs/conceptos-transversales/transacciones-y-eventos.md`.

## 6. Diferencias con lo que dice el contrato que NO se resolvieron (no son de PERFIL)

- **Unicidad del correo con empleados inactivos.** El contrato (§3.10.4) pide que el correo esté en uso
  por un empleado **activo**. `EmployeesService.existsByEmail` no distingue activos de inactivos, así que
  un cliente que quiera usar el correo de un empleado dado de baja recibe `409 EMAIL_IN_USE`. Es CORR
  (unicidad de email entre activos). No se tocó.
- **`AccountsService.handleCustomerEmailChanged`** (el que copia el correo nuevo en la cuenta, ya existente
  y compartido con CLI-ADM) buscaba la cuenta por email sin mirar si estaba activa: un cliente no podía usar
  el correo de una cuenta dada de baja, contra el contrato. **Se modificó a pedido de Maga** para que solo
  cuenten las cuentas activas (2 condiciones en `accounts.service.ts`); también corrige el mismo caso en el
  cambio de correo del Administrador. Sigue tirando un `409` **sin `code`** si el correo lo usa otra cuenta
  activa (en PERFIL no se llega a ese punto, porque antes responde `409 EMAIL_IN_USE` con `code`). Para
  CORR/CLI-ADM: agregar el `code` y un test de ese caso del Administrador.
- **Auditoría del cambio de contraseña de un empleado.** §3.11.1 dice que, si la cuenta es de un empleado,
  se audita `USER_ACCOUNT_UPDATED` con el propio empleado como actor, "cuando exista la pantalla". El
  endpoint acepta cualquier rol, pero esa auditoría **no se hizo**: es de EMP-PASS. Cambiar la contraseña
  de un cliente no se audita (CA-PER.13), y está verificado.
- **Número de la historia (P1) y ventana postergable (P2):** siguen sin decisión. Se asumió la ventana
  postergable, que es lo que dice el contrato; no existe el `403 PASSWORD_CHANGE_REQUIRED`.

## 7. Documentos del repo que quedaron desactualizados

- `docs/conceptos-transversales/autenticacion-y-sesiones.md` — actualizado en este mismo cambio (cookie,
  `revokeAllForAccountExcept`, listener nuevo).
- `docs/conceptos-transversales/transacciones-y-eventos.md` — actualizado (dos eventos nuevos).
- `docs/conceptos-transversales/errores-y-codigos.md` — los códigos `CURRENT_PASSWORD_INCORRECT`,
  `PASSWORD_SAME_AS_CURRENT`, `PASSWORD_SAME_AS_DOCUMENT` y `TOO_MANY_ATTEMPTS` son nuevos y **no** se
  agregaron (el contrato §5 ya los lista).
- `docs/funcionalidades/clientes.md` — no tiene `GET/PATCH /customers/me` ni `/mi-cuenta/password`.

---

## 8. Para el frontend (`features/my-account`)

Esto es lo que el frontend tiene que saber de PERFIL que no está explícito en el contrato, o que cambió.
Todo lo demás (campos, textos, pantallas) sigue como dicen la §3.10, la §3.11 y la historia.

### 8.1 `withCredentials: true` es obligatorio en `PATCH /mi-cuenta/password`

El backend identifica la sesión actual por la cookie `refresh_token`. **Si el pedido no manda la cookie, se
cierran todas las sesiones, incluida la actual**, y el cliente queda deslogueado al cambiar la contraseña.
La cookie ahora se emite con `Path=/api`, así que viaja sola a ese endpoint (antes solo iba a `/api/auth/*`).
No hay que hacer nada más que dejar `withCredentials: true` en el cliente HTTP, que ya está para el refresh.
En desarrollo, si después de actualizar el backend falla un refresh, borrar las cookies del sitio una vez.

### 8.2 `PATCH /mi-cuenta/password` → `204`, sin cuerpo

- Después de un `204`, **poner `mustChangePassword = false` en el estado local**: no hay otra respuesta que
  lo diga, y la ventana "Cambiá tu contraseña" no tiene que volver a abrirse hasta el próximo ingreso.
- Body: solo `currentPassword` y `newPassword`. **No mandar** `confirmPassword`: el backend responde `400`
  (`property confirmPassword should not exist`).

| Respuesta | Qué mostrar |
|---|---|
| `400` `code: CURRENT_PASSWORD_INCORRECT` | "La contraseña actual es incorrecta", bajo "Contraseña actual" |
| `400` `code: PASSWORD_SAME_AS_CURRENT` | "La nueva contraseña no puede ser igual a la actual", bajo "Nueva contraseña" |
| `400` `code: PASSWORD_SAME_AS_DOCUMENT` | "La contraseña no puede ser tu número de documento", bajo "Nueva contraseña" |
| `400` **sin `code`** | Es una regla de la política (largo, 72 bytes, igual al mail) o un campo vacío. El `message` ya viene con el texto del contrato: mostrarlo bajo "Nueva contraseña" |
| `429` `code: TOO_MANY_ATTEMPTS` | "Hiciste demasiados intentos. Probá de nuevo en unos minutos." |
| `401` | Es el flujo normal del interceptor (renovar y reintentar una vez). **La contraseña mal es `400`, nunca `401`** |

Decidir siempre por `code`, no por el texto. `message` puede ser `string` o `string[]` (cuando lo rechaza el
`ValidationPipe`).

### 8.3 `GET /customers/me` y `PATCH /customers/me`

- Los dos devuelven la misma forma: `id, firstName, lastName, documentType, documentNumber, email, phone,
  dateOfBirth, createdAt`. **No trae** `active` ni `deactivatedAt` (a diferencia de `/customers/:id`).
- `dateOfBirth` viene como `YYYY-MM-DD`; `phone` y `dateOfBirth` pueden ser `null`.
- Para otro rol responde `403`.
- Mandar **solo lo que cambió**, con al menos un campo (si no, `400`). Para borrar el teléfono o la fecha,
  mandar `null`.
- `currentPassword` va **solo si cambió el correo**. Si el correo vuelve al valor original, no mandarlo (si
  se manda, se ignora).
- Después de un `200` que cambió el correo, **actualizar `user.email` en el estado de sesión** con el valor
  de la respuesta: el correo de acceso cambió y la sesión sigue abierta.

| Respuesta | Qué mostrar |
|---|---|
| `400` `code: CURRENT_PASSWORD_INCORRECT` | "La contraseña actual es incorrecta", bajo "Contraseña actual". **No se guardó nada**, ni el teléfono ni la fecha: no marcarlos como guardados |
| `400` sin `code`, correo cambiado sin contraseña | "Ingresá tu contraseña actual para cambiar el correo" (la pantalla no debería permitirlo) |
| `400` sin `code`, otros | El `message` trae el texto del contrato para cada campo (teléfono, correo, fecha) |
| `409` `code: EMAIL_IN_USE` | "Ese correo ya está registrado", bajo "Correo electrónico" |
| `429` `code: TOO_MANY_ATTEMPTS` | "Hiciste demasiados intentos. Probá de nuevo en unos minutos." |

El contador de intentos incorrectos es **uno solo** para el cambio de correo y el de contraseña: con 5
incorrectos entre los dos, el sexto pedido da `429` aunque la contraseña sea correcta, durante 15 minutos
desde cada intento. El mensaje de `429` se puede mostrar en el campo "Contraseña actual".

### 8.4 Cerrar sesión

No hay cambios: `POST /api/auth/logout` sigue igual. Ahora también borra la cookie con el path viejo
(`/api/auth`), si el navegador la tenía.

### 8.5 MSW

Los handlers tienen que reproducir los `code` de arriba y el `429` al sexto intento incorrecto, y que
`PATCH /customers/me` con un correo incorrecto **no cambie ningún dato** del mock.
