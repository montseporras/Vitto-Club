# Auditoría de tests de autenticación

> Extraído de la sección 9 de `autenticacion.md` (ver [autenticación y sesiones](../conceptos-transversales/autenticacion-y-sesiones.md)).

### Unitarios

No usan base de datos ni levantan la aplicación.

```bash
cd backend
npm test -- src/auth
```

Resultado esperado: 8 archivos, 75 tests. Con todo el backend, 457 tests
unitarios (incluidos los de `accounts`, `employees` y `customers`).

Además de los de `auth`, esta integración agregó tests unitarios en `accounts`:

- `bcrypt-password-hasher.spec.ts` (8): hash que no contiene la contraseña,
  verificación correcta e incorrecta, distingue mayúsculas, la misma contraseña
  da hashes distintos, verifica hashes hechos por otra instancia (como los del
  seed), un hash inválido devuelve `false`, costo por defecto y costo inválido.
- `password.spec.ts` (+2): acepta 72 bytes aunque sean menos de 64 caracteres, y
  rechaza más de 72 bytes aunque no llegue a 64 caracteres.

### `accounts-credentials-verifier.spec.ts` — 7 tests

Prueban el traductor con un `AccountsService` de mentira:

| Test | Qué prueba |
|---|---|
| Empleado | `owner: { employeeId }` pasa a `employeeId` |
| Cliente | `owner: { customerId }` pasa a `customerId` y no aparece `employeeId` |
| Nombre y apellido | Si `accounts` los entrega pasan; si no, no aparecen |
| Sin resultado | `undefined` pasa a `null` |
| Sin tocar lo recibido | El email y la contraseña llegan a `accounts` tal como los tipeó el usuario, con espacios y mayúsculas |
| `findActiveById` | Traduce igual |
| Cuenta inexistente o inactiva | `undefined` pasa a `null` |

### `session.spec.ts` — 12 tests

Usa los plazos reales de los empleados (30 minutos y 12 horas), así que
leerlos es leer la regla.

| Grupo | Qué prueba |
|---|---|
| Iniciar | Nace vigente; el vencimiento por inactividad no supera el tope; rechaza datos inválidos |
| Vigencia | Vence justo al llegar a `expiresAt`; vence en el tope aunque `expiresAt` sea posterior; una revocada no está vigente |
| Renovar | Cambia el token y corre el vencimiento; cerca del tope no lo pasa; no mueve el tope; rechaza una vencida sin modificarla; rechaza una revocada |
| Revocar | Dos veces no es error y conserva la primera fecha |

Varios corresponden directo a criterios de aceptación: inactividad
(SCRUM-158, criterio 6), duración máxima (criterio 7) y logout repetido
(SCRUM-36, criterio 4).

### `auth.config.spec.ts` — 7 tests

| Test | Qué prueba |
|---|---|
| Valores por defecto | Solo con el secreto, usa los plazos acordados |
| Empleados | Cajero y Administrador comparten plazos |
| Variables | Toma los plazos del entorno (para la demo) |
| Sin secreto | No arranca |
| Secreto corto | No arranca |
| Plazo inválido | No arranca |
| Cookie segura | Exige HTTPS solo en producción |

### `crypto-refresh-token-generator.spec.ts` — 4 tests

| Test | Qué prueba |
|---|---|
| Formato | El token tiene 43 caracteres y el hash 64, que es lo que entra en la columna de la base |
| Coincidencia | El hash guardado es el mismo que se calcula al recibir el token |
| No se guarda el token | El hash es distinto del token |
| Unicidad | 50 tokens generados, 50 distintos |

### `jwt-access-token-issuer.spec.ts` — 9 tests

| Test | Qué prueba |
|---|---|
| Empleado | Lo que se emite se lee igual al verificar |
| Cliente | Lo mismo, con `customerId` |
| Contenido mínimo | El token no lleva nada más que la identidad y las fechas |
| Vencido | Se rechaza |
| Otro secreto | Se rechaza |
| Modificado | Alguien cambia "cajero" por "administrador" en el contenido: se rechaza |
| Texto cualquiera | Se rechaza |
| Rol desconocido | Bien firmado pero con un rol inventado: se rechaza |
| Sin cuenta | Bien firmado pero sin id de cuenta: se rechaza |

El test del token **modificado** es el que muestra para qué sirve la firma:

```ts
const token = await issuer.issue({ accountId: 7, role: 'CASHIER', employeeId: 3 });
const [header, , signature] = token.split('.');
const forgedPayload = Buffer.from(JSON.stringify({ sub: '7', role: 'ADMIN' })).toString('base64url');

expect(await issuer.verify(`${header}.${forgedPayload}.${signature}`)).toBeNull();
```

Toma el token de un cajero, le reemplaza el contenido por uno que dice
"administrador" y deja la firma original. El resultado es `null`: no se puede
ascender uno mismo editando el token.

### `auth.service.spec.ts` — 23 tests

Prueban los casos de uso con **puertos falsos**: un repositorio en memoria, un
verificador de credenciales con dos cuentas cargadas (Ana, cajera, y Lucía,
clienta) y un emisor de tokens simplificado. No hay base ni JWT real.

| Caso de uso | Qué prueba |
|---|---|
| Login (7) | Devuelve tokens, fecha tope e identidad con email y nombre (y el nombre no está en el token); si `accounts` no conoce el nombre (clientes) la respuesta no trae esos campos; guarda el hash y no el token; plazos de empleado; plazos de cliente; con contraseña incorrecta o email inexistente da el mismo error y no guarda sesión; una cuenta dada de baja recibe exactamente el mismo error |
| Renovación (12) | Devuelve lo mismo que el login; el token anterior deja de servir; no crea otra sesión; corre el vencimiento; usa el rol actual; falla sin token, con token desconocido, sesión vencida, pasada del tope, revocada, cuenta dada de baja y cuando otra pestaña ganó |
| Logout (3) | Revoca y después no se puede renovar; no da error sin token, con token desconocido ni repetido; cierra solo esa sesión |
| Revocar todas (1) | Cierra las sesiones de esa cuenta y no las de otra |

El repositorio falso no es un simple "devolvé siempre verdadero": se comporta
como el real (guarda copias, y la renovación exige el token anterior), para
que los tests no pasen por casualidad.

El test que comprueba que el error **no revela la causa**:

```ts
credentials.deactivate(ANA.accountId);

const error = await service.login('ana.gomez@vitto.club', 'secreta-de-ana').catch((e: unknown) => e);

expect((error as UnauthorizedException).getResponse()).toEqual({
  statusCode: 401,
  error: 'Unauthorized',
  message: 'Los datos de acceso son incorrectos',
  code: INVALID_CREDENTIALS,
});
```

Ana fue dada de baja y entra con su contraseña correcta. La respuesta es
idéntica, campo por campo, a la de una contraseña incorrecta.

### `guards.spec.ts` — 10 tests

Arma una clase de mentira con un método por cada combinación de marcas
(público, solo administrador, administrador o cajero, y sin declarar) y le
pasa a cada guard un pedido falso.

| Guard | Qué prueba |
|---|---|
| Autenticación (5) | Deja pasar un endpoint público sin token; con token válido pasa y guarda al usuario en el pedido; rechaza sin encabezado; rechaza un encabezado que no es `Bearer`; rechaza un token inválido o vencido |
| Autorización (5) | Deja pasar un endpoint público; deja pasar un rol permitido; rechaza un rol no permitido con `FORBIDDEN`; un endpoint sin declarar queda cerrado; rechaza si no hay usuario |

### `refresh-cookie.spec.ts` — 3 tests

| Test | Qué prueba |
|---|---|
| Entre varias | Encuentra la cookie pedida aunque vengan otras |
| Ausente | Devuelve vacío si no hay encabezado o no está esa cookie |
| Con signo igual | No corta un valor que contiene `=` |

### Contra la base

Levantan la aplicación completa y usan la base de tests (`vitto_club_test`).

```bash
cd backend
npm run test:e2e
```

Resultado esperado: 73 tests en total:

| Archivo | Tests |
|---|---|
| `app.e2e-spec.ts` (health) | 2 |
| `transactions.e2e-spec.ts` (transacciones y eventos) | 9 |
| `auth-sessions.e2e-spec.ts` | 13 |
| `auth-http.e2e-spec.ts` | 17 |
| `endpoint-permissions.e2e-spec.ts` | 19 |
| `accounts-abmc.e2e-spec.ts` (de la rama `users`) | 4 |
| `auth-integration.e2e-spec.ts` | 9 |

### `auth-sessions.e2e-spec.ts` — 13 tests

| Test | Qué prueba |
|---|---|
| Guardar y recuperar | Una sesión guardada se encuentra por el hash de su token, con sus dos fechas |
| Hash desconocido | Devuelve `null` |
| Renovación | El token anterior deja de servir y el nuevo sirve |
| Dos pestañas | Dos renovaciones con el mismo token: solo gana la primera |
| Revocada mientras tanto | No se puede renovar una sesión que otro revocó un instante antes |
| Revocación | Queda guardada y la sesión deja de estar vigente |
| Revocar todas | Revoca las vigentes de una cuenta, no toca las de otra y conserva la fecha de las ya revocadas |
| Transacción | Una sesión guardada dentro de un caso de uso que falla no queda en la base |
| Baja de una cuenta | Al publicar `account.deactivated` se revocan las sesiones de esa cuenta y no las de otra |
| Baja que falla | Si la operación de quien publica el evento falla, las sesiones **no** quedan revocadas: el listener corre dentro de la transacción |
| Emisor de tokens | Funciona con el secreto y la duración reales de la configuración |
| Plazos | Salen de la configuración según el rol |
| Verificador real | Con una cuenta cuyo hash no es válido, ninguna contraseña inicia sesión |

El de las **dos pestañas** muestra la protección de `saveRotation`:

```ts
const tabA = (await sessions.findByTokenHash('hash-1'))!;
const tabB = (await sessions.findByTokenHash('hash-1'))!;

tabA.rotate('hash-a', after(20 * MINUTE), INACTIVITY);
tabB.rotate('hash-b', after(20 * MINUTE), INACTIVITY);
const first = await sessions.saveRotation(tabA, 'hash-1');
const second = await sessions.saveRotation(tabB, 'hash-1');

expect(first).toBe(true);
expect(second).toBe(false);
```

Las dos pestañas leen la misma sesión y las dos intentan renovarla. La primera
lo logra; la segunda recibe `false` y su token nuevo nunca llega a existir.

### `auth-http.e2e-spec.ts` — 17 tests

Hacen pedidos HTTP reales contra la aplicación, como los haría el frontend.
Dos particularidades del armado:

- **Reemplazan el verificador de credenciales** por uno falso con dos cuentas
  (un cajero y una administradora): así se prueba la capa HTTP sin depender de
  `accounts`. El login real con contraseñas de verdad se prueba en
  `auth-integration.e2e-spec.ts`.
- **Agregan un controller de prueba** con un endpoint por cada combinación de
  marcas (público, solo administrador, administrador o cajero, y sin declarar).
  Los guards ya son globales, así que no hace falta activarlos en el test.

| Grupo | Qué prueba |
|---|---|
| Login (5) | Responde el access token y la identidad con el nombre; el nombre viaja en la respuesta pero **no dentro del access token** (se decodifica el JWT real y se comprueba que solo tiene `sub`, `role`, `employeeId`, `iat` y `exp`); el refresh token viaja solo en la cookie, con `HttpOnly`, `Path=/api/auth` y `SameSite=Lax`, y no aparece en el cuerpo; con credenciales incorrectas responde 401 con el código y sin cookie; con campos vacíos o de más responde 400 |
| Renovación (3) | Con la cookie responde lo mismo que el login y cambia la cookie; la cookie anterior deja de servir y el error **no borra** la cookie; sin cookie responde 401 |
| Logout (2) | Responde 204, borra la cookie y la sesión ya no se puede renovar; sin cookie también responde 204 |
| Guards (7) | Sin token, 401; token inválido, 401; con el access token del login se entra y `@CurrentUser()` entrega la identidad; un cajero en un endpoint de administrador, 403; un administrador entra; un endpoint público responde sin token; un endpoint sin declarar queda cerrado aunque haya sesión |

El que recorre **el flujo completo** de un usuario real:

```ts
const token = await tokenOf('bruno@test.com', 'clave-de-bruno');

const res = await request(app.getHttpServer())
  .get('/api/guard-probe/admin')
  .set('Authorization', `Bearer ${token}`)
  .expect(403);

expect(res.body.code).toBe('FORBIDDEN');
```

Bruno, cajero, inicia sesión de verdad, recibe un access token real y lo usa
contra un endpoint solo para administradores. El guard de autenticación lo
reconoce (por eso no es 401) y el de autorización lo frena (403).

### `endpoint-permissions.e2e-spec.ts` — 19 tests

Prueba la **matriz de permisos** con los controllers reales de `customers`,
`employees` y `usuarios`, con credenciales falsas y los guards globales reales
(igual que `auth-http.e2e-spec.ts`).

Por cada endpoint comprueba dos cosas:

1. **Sin token responde 401** con el código `UNAUTHENTICATED`.
2. **Cada rol puede o no puede usarlo** según la matriz. El Cliente recibe 403
   en todo; el Cajero entra a `customers` y recibe 403 en `employees`; el
   Administrador entra a todo.

Además comprueba que el health check es público.

La tabla de endpoints que recorre:

| Grupo | Endpoints | Pueden usarlos |
|---|---|---|
| `customers` (8) | listar, buscar por documento, ver uno, historial, crear, editar, dar de baja, reactivar | Administrador y Cajero |
| `empleados` (5) | listar, ver uno, crear, editar, dar de baja | Administrador |
| `usuarios` (5) | consultar por empleado, registrar, editar, dar de baja, reactivar | Administrador |

Los ids de los pedidos no existen a propósito: si el guard deja pasar, el
endpoint responde 400 o 404, y eso alcanza para saber que el pedido llegó al
controller. El test no mira qué respondió el endpoint, solo que no fue 401 ni
403.

**Qué demuestra de los filtros de error.** El test se escribió antes de
arreglar los filtros de `customers` y `employees`, y fallaron 13 de los 14:
los filtros descartaban el campo `code` y mostraban el 403 como
`"error": "Error"`. Después de agregar el 403 a su tabla de nombres y dejar
pasar el `code`, pasaron los 14. Es la prueba de que el test mide lo que debe
y no pasa de casualidad. El grupo `usuarios` se sumó después, al integrar
`accounts`.

### `auth-integration.e2e-spec.ts` — 9 tests

Es **el test de la integración completa y no usa nada falso**: la aplicación
entera (`AppModule`), el verificador real, `bcryptjs` real, los guards globales
y la base de tests. Las cuentas se crean con un hash de `bcryptjs` hecho
directamente en el test (igual que el seed), lo que prueba que el adaptador de
`accounts` verifica hashes hechos por otra instancia.

| Grupo | Qué prueba |
|---|---|
| Iniciar sesión (3) | Un empleado entra con su contraseña real y recibe su identidad; el email no distingue mayúsculas ni espacios en los extremos; contraseña incorrecta, email inexistente y cuenta dada de baja responden **exactamente lo mismo** |
| Permisos por rol (1) | Sin token, 401; el Administrador entra a empleados y usuarios; el Cajero entra a clientes y recibe 403 en empleados y usuarios |
| Cuentas creadas desde la aplicación (2) | El Administrador crea la cuenta de un empleado y ese empleado inicia sesión (recorre registrar, hashear, guardar, verificar y entrar); una contraseña de más de 72 bytes se rechaza con 400 |
| Sesiones (3) | Un cajero ascendido ve su rol nuevo al renovar, sin volver a iniciar sesión; **dar de baja la cuenta cierra las sesiones abiertas** de ese usuario; dar de baja al empleado también cierra su sesión |

Los dos últimos recorren la cadena entre tres módulos:

```
admin da de baja la cuenta (accounts) → publica account.deactivated
  → el listener de auth revoca las sesiones → el refresh del usuario falla con 401
```

y, para la baja del empleado:

```
admin da de baja al empleado (employees) → publica employee.deactivated
  → accounts da de baja la cuenta → publica account.deactivated
  → auth revoca las sesiones
```

Tres módulos que no se importan entre sí, coordinados por eventos dentro de una
sola transacción.

Resultado esperado de `npm run test:e2e`: 73 tests.

### Prueba contra la aplicación levantada

Además de los tests, se probó la aplicación real con la base de desarrollo y el
seed (hashes de `bcryptjs` con costo 10):

| Prueba | Resultado |
|---|---|
| `GET /api/health` | 200 |
| `GET /api/empleados` sin token | **401** `UNAUTHENTICATED` (antes de la integración respondía 200) |
| Login de la administradora del seed | 200, con la cookie `HttpOnly`, `Path=/api/auth` y una duración de 12 horas |
| Con su token: empleados, usuarios, clientes | 200, 200, 200 |
| Login del cajero de prueba | 200 |
| Con su token: empleados, usuarios, clientes | **403**, **403**, 200 |
| Login de la clienta de prueba | 401 (la cuenta de cliente todavía no se resuelve en `accounts`) |
| Login con contraseña incorrecta | 401 |

---

