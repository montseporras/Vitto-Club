# Contexto para continuar: bloque de Autenticación

Documento de traspaso. Resume dónde quedó el trabajo, qué falta, qué hay que
mandarle a cada persona y cómo venimos trabajando. Está pensado para pegarlo
(o hacerlo leer) al empezar un chat nuevo, y para que yo misma lo use de lista
de control.

- **Fecha de corte:** 2026-10-05, 23:20.
- **Rama de trabajo:** `feature/auth-login` (limpia, todo commiteado).
- **Estado verificado al corte:** 296 tests unitarios y 54 e2e en verde, build
  y lint sin errores.

> **Cómo usarlo en el próximo chat.** Decirle al asistente: *"Leé
> `docs/contexto-proximo-chat.md`, `docs/autenticacion.md` y
> `docs/transacciones-y-eventos.md` antes de hacer nada, y después revisá el
> estado real de las ramas con git, porque puede haber cambiado."*

---

## 1. El proyecto y mi parte

**Vitto Club**: plataforma de fidelización por puntos para La Vitto Comidas y
Café. Seminario Integrador, UTN FRC, Grupo 11. Scrum, sprints de 2 semanas,
gestión en Jira (`SCRUM-xxx`). El Sprint 2 arrancó el 28/09/2026.

**Stack:** NestJS + TypeScript (proyecto ESM puro), Prisma 7 + PostgreSQL
(Docker local, Neon en producción), Jest + Supertest. Deploy: backend en
Render, frontend (React + Vite) en Vercel. **No hay CI**: los tests corren solo
en local.

**Mi bloque (solo backend):**

| Ticket | Qué es |
|---|---|
| SCRUM-158 | Iniciar sesión (empleados) |
| SCRUM-159 | Iniciar sesión (clientes) |
| SCRUM-36 | Cerrar sesión |
| — | Seed del Administrador inicial |
| — | Proteger por rol los endpoints del Sprint 1 |

**Otras personas de las que dependo o que dependen de mí:**

| Quién | Qué hace |
|---|---|
| Quien hizo la rama `users` | Módulo `accounts`: ABMC de cuentas de empleados (SCRUM-21, 24, 27, 30). Es dueño de la tabla `Account` y de las contraseñas |
| Bloque de cuentas de clientes | Autorregistro del cliente (SCRUM-160) y sus cuentas. **Todavía no vi su rama** |
| Frontend | Pantalla de login y logout; consume mi API |
| Quien maneja Vercel / Render | Deploy |
| Auditoría (SCRUM-161) | Va a usar `@CurrentUser()` para saber quién hizo cada operación |

---

## 2. Cómo trabajo con el asistente

- **Idioma:** español rioplatense, informal, conciso y escaneable.
- **Los commits los hago yo.** El asistente nunca commitea ni pushea; al final
  me dice el nombre sugerido del commit.
- **Primero me cuenta, después hace.** El patrón que usamos: me explica el
  paso y me muestra el código → yo digo "hacelo" → lo hace **sin hacer nada de
  más** de lo que mostró → lo verifica corriendo los tests → me explica qué
  hizo.
- **Que no modifique nada si digo "solo decime".** Leer archivos sí puede.
- **Que explique todo lo que hace** y que **actualice los documentos**
  (`docs/autenticacion.md` y `docs/transacciones-y-eventos.md`) en cada paso,
  con una fila nueva en su tabla de historial.
- **Al final de cada paso:** qué quedó pendiente de hablar con otra persona.
- **Lo que es de otra rama o de otra persona no se toca:** me arma el mensaje
  para pasarle.
- Dos limitaciones de la terminal del asistente: `prisma migrate dev` no le
  corre (no es interactiva; usa `migrate deploy`), y `prisma migrate reset`
  exige mi consentimiento explícito.

---

## 3. Estado de las ramas

| Rama | Estado | Qué tiene |
|---|---|---|
| `develop` | `2cb7817` | Modelo de datos (`Account`, `Session`), seed del admin, base de tests e2e, `Account.email`. **No** tiene transacciones, ni `accounts`, ni `auth` |
| `spike/transacciones` | subida, **sin mergear a `develop`** | Transacción ambiente + eventos de dominio. Terminada y probada |
| `users` (remota: `1933e89`) | subida, **sin mergear a `develop`** | Módulo `accounts`. Ya incluye `spike/transacciones`. Le faltan dos cosas (ver 7.1) |
| `feature/auth-login` | **solo en mi máquina, nunca se subió** | Todo `auth`. Sale de `spike/transacciones` |
| `feature/account-email` | mergeada a `develop` | Renombre `identifier` → `email` |

**Urgente:** `feature/auth-login` no existe en GitHub. Todo el trabajo de
`auth` está en un solo disco. Subirla:

```powershell
git push -u origin feature/auth-login
```

Mi rama local `users` está 22 commits atrás de la remota: para leerla usar
`origin/users`, no `users`.

La simulación de merge entre `feature/auth-login` y `origin/users` no dio
conflictos (al corte).

---

## 4. Lo que ya está hecho

### En `develop`

- **Migraciones:** email único en `employees`; tablas `accounts` y `sessions`
  con un `CHECK` de "un solo dueño, coherente con el rol"; columna
  `accounts.email` (antes `username`, después `identifier`).
- **Seed** (`backend/prisma/seed.ts`): crea el Administrador inicial desde
  variables de entorno, nunca pisa datos existentes, y con `SEED_DEMO_DATA=true`
  carga datos y cuentas de prueba (se niega si `NODE_ENV=production`).
- **Base de tests** `vitto_club_test`, separada y protegida: los e2e se niegan
  a correr si la URL no es local o el nombre no contiene `test`. Las
  migraciones se aplican solas.

### En `spike/transacciones`

- `PrismaTransactionRunner` (`backend/src/prisma/`): `run(fn)` abre una
  transacción que comparten los repositorios de cualquier módulo; `client` da
  el cliente actual.
- Contrato de eventos en `backend/src/shared/events/domain-events.ts`.
- 9 tests e2e. Explicado en `docs/transacciones-y-eventos.md`.

### En `feature/auth-login` (módulo `auth`, completo por dentro)

| Capa | Qué hay |
|---|---|
| `domain/` | Entidad `Session` con sus dos vencimientos; roles; puertos |
| `infrastructure/` | Configuración validada al arrancar, JWT, generador de refresh token, repositorio de sesiones, listener de `account.deactivated`, verificador de credenciales **provisorio** |
| `application/` | `AuthService`: login, renovación, logout, revocar sesiones de una cuenta |
| `http/` | `POST /api/auth/login`, `/refresh`, `/logout`; cookie; `JwtAuthGuard`; `RolesGuard`; filtro de errores |
| `src/shared/security/` | `@Public()`, `@Roles()`, `@CurrentUser()` y el tipo del usuario |

Además, fuera de `auth`:

- `@Roles('ADMIN')` en el controller de `employees`,
  `@Roles('ADMIN', 'CASHIER')` en el de `customers`, `@Public()` en `health`.
- Los filtros de error de `customers` y `employees` conocen el 403 y dejan
  pasar el campo `code`.
- E2E de la matriz de permisos (`endpoint-permissions.e2e-spec.ts`).
- Contrato para el frontend: `docs/auth-api.md`.

**Dos cosas que hoy NO funcionan, a propósito:**

1. **Nadie puede iniciar sesión.** El verificador de credenciales registrado
   es provisorio y rechaza todo. El login real responde siempre 401.
2. **Los guards no protegen nada.** Existen y están probados, pero no están
   registrados para toda la aplicación. `GET /api/empleados` sigue respondiendo
   200 sin token.

Las dos se resuelven juntas en el paso E. Si se activaran los guards antes de
tener login real, la API entera quedaría bloqueada.

---

## 5. Decisiones vigentes

Varias reemplazan decisiones anteriores. Estas son las que valen.

### Identidad y login

- **Todos los roles entran con email y contraseña.** El DNI del cliente queda
  solo para buscarlo en caja. (Se descartaron: username para empleados, DNI
  para clientes, la regla de formato de username y la limitación del
  pasaporte.)
- **Un solo endpoint** de login. El campo se llama `email`.
- **El login no valida formato de email ni largo mínimo de contraseña**: solo
  no vacío y largo máximo (150 y 64).
- **Un email, una cuenta.** Lo garantiza el `unique` de `Account.email`.
- **Mensaje único** ante cualquier fallo de login: *"Los datos de acceso son
  incorrectos"*, con el código `INVALID_CREDENTIALS`.
- **Contraseña:** 8 a 64 caracteres, sin reglas de composición, distinta del
  email (comparación literal, sin normalizar la contraseña).
- **Hash:** `bcryptjs`, costo por `BCRYPT_COST` (4 a 15, 10 por defecto).

### Sesión

- Access token JWT de **15 minutos**, en el cuerpo de la respuesta; el front lo
  guarda en memoria.
- Refresh token **aleatorio** (no es un JWT), en una cookie `HttpOnly`,
  `SameSite=Lax`, `Path=/api/auth`, `Secure` solo en producción. En la base se
  guarda su SHA-256.
- **Rotación** en cada uso. **Una fila por sesión**, no por token.
- Empleados: 30 minutos de inactividad, 12 horas como máximo. Clientes: 7 días
  y 30 días. Todo por variables de entorno.
- **Varias sesiones simultáneas** por cuenta. El logout cierra solo la actual.
- **El login y la renovación devuelven exactamente lo mismo**:
  `{ accessToken, user: { accountId, role, email, employeeId | customerId } }`.
- **Un fallo de renovación no borra la cookie** (caso de las dos pestañas).
- **Una baja o un cambio de rol tarda hasta 15 minutos en aplicarse**: el
  access token ya emitido sigue valiendo. Aceptado, para no consultar la base
  en cada pedido.

### Arquitectura

- **Sin `forwardRef`.** Las dependencias van en un solo sentido:
  `auth → accounts → employees`, `accounts → customers`,
  `customers → employees`.
- **`accounts`** es dueño de la tabla `Account` y de las contraseñas (el
  adaptador de bcryptjs vive ahí, aunque lo escriba yo). **`auth`** es dueño de
  sesiones, tokens, login y guards.
- **`Employee.role` es la fuente de verdad**; `Account.role` es una copia que
  se sincroniza por evento.
- **Lo que cruza módulos va por eventos de dominio dentro de la transacción
  ambiente.** Reglas: publicar con `await emitAsync`; escuchar con
  `suppressErrors: false`; no usar `async` ni `nextTick`; los repositorios usan
  `client`; un listener que rechaza tira `HttpException`.
- **`src/shared/`** tiene las dos únicas excepciones a "un módulo solo usa de
  otro su service": `shared/events/` y `shared/security/`.
- **Los decoradores viven en `shared/security/`, los guards en `auth`.**
- **Un endpoint sin `@Roles()` ni `@Public()` queda cerrado para todos.**
- **Email único entre empleados y clientes:** se chequea en un solo sentido
  (`customers` consulta a `employees`).

### Matriz de permisos

| Endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/api/auth/*`, `/api/health` | público | público | público |
| `/api/customers/*` (todo) | Sí | Sí | No |
| `/api/empleados/*` | Sí | No | No |
| `/api/usuarios/*` | Sí | No | No |

### Códigos de error

| HTTP | `code` | Cuándo |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Cualquier fallo de login |
| 401 | `INVALID_SESSION` | Cualquier fallo de renovación |
| 401 | `UNAUTHENTICATED` | Endpoint protegido sin token, o vencido |
| 403 | `FORBIDDEN` | Hay sesión, pero el rol no alcanza |

---

## 6. Lo que falta

### Paso E: integración con `accounts`

**Depende de:** que `users` esté en `develop` y yo la traiga a mi rama.

1. **Adaptador de bcryptjs** en
   `backend/src/accounts/infrastructure/` (por ejemplo
   `bcrypt-password-hasher.ts`), implementando el puerto `PasswordHasher` de
   `accounts` (`hash` y `verify`). Costo desde `BCRYPT_COST`. Registrarlo como
   provider en `AccountsModule`. No va en `auth`: si no, `accounts` importaría
   `auth`.
2. **Adaptador de credenciales** en `backend/src/auth/infrastructure/`, que
   implemente mi puerto `CredentialsVerifier` llamando a
   `AccountsService.verifyCredentials` y `AccountsService.findActiveById`.
   Traducciones que tiene que hacer:
   - `accounts` devuelve `undefined`; mi puerto espera `null`.
   - `accounts` devuelve `{ accountId, role, owner, email }`; mi puerto espera
     `{ account: { accountId, role, employeeId?, customerId? }, email }`.
   - `owner` es `{ employeeId }` o `{ customerId }`.
3. **`AuthModule` importa `AccountsModule`** y reemplaza el provider
   provisorio. Borrar `unavailable-credentials-verifier.ts`.
4. **Registrar `AccountsModule` en `AppModule`.**
5. **Activar los guards para toda la aplicación**: dos `APP_GUARD` en
   `AuthModule`, primero `JwtAuthGuard` y después `RolesGuard`.
6. **`@Roles('ADMIN')`** en el controller de `usuarios`.
7. **Filtro de errores de `accounts`**: agregar el 403 y dejar pasar `code`
   (lo revisé en `origin/users`: no lo hace).
8. **Tests e2e existentes:**
   - `auth-http.e2e-spec.ts` y `endpoint-permissions.e2e-spec.ts` activan los
     guards con `app.useGlobalGuards(...)`. Con los guards ya globales, sacar
     esa línea para no ejecutarlos dos veces.
   - `auth-sessions.e2e-spec.ts` tiene un test que espera que "nadie pueda
     iniciar sesión" con el verificador provisorio: hay que cambiarlo.
   - Agregar a `/api/usuarios` al e2e de permisos.
9. **E2E con usuarios reales**: login de un empleado con su contraseña
   hasheada de verdad, sin nada falso. En tests, bajar `BCRYPT_COST` a 4.
10. Actualizar `docs/autenticacion.md` y `docs/auth-api.md` (sacar el aviso de
    "todavía no habilitado").

**Lo que se va a poder probar a mano después del paso E:** con el seed de
demo, entrar como `ana.gomez@vitto.club` (administradora) y
`bruno.perez@vitto.club` (cajero). Las contraseñas son las de mi `.env`
(`SEED_ADMIN_PASSWORD` y `SEED_DEMO_PASSWORD`).

**Lo que NO va a andar todavía:** el login de clientes. `accounts` ignora las
cuentas de cliente (`findByEmail` las descarta y su `AccountRole` no tiene
`CUSTOMER`). Depende de la rama de cuentas de clientes. Mi lado ya lo soporta.

### Paso F: cierre

1. E2E de punta a punta por rol: login, uso, renovación, logout, acceso
   denegado, y baja de cuenta que cierra la sesión.
2. **CORS**: hoy el origen está fijo en `http://localhost:5173`
   (`backend/src/main.ts`). Pasarlo a variable de entorno. Si el rewrite de
   Vercel funciona, en producción no hace falta.
3. Documentación del proyecto a actualizar:
   - La justificación de JWT decía "sin mantener sesiones en el servidor": ya
     no es cierto (hay tabla `sessions`).
   - US-01: los empleados **sí** tienen email (obligatorio, único, no editable).
   - US-09 y US-05 a US-08 dicen "nombre de usuario": es **email**.
   - "Uno o más roles" por usuario: es **un solo rol** por cuenta.
4. Cargar los criterios de aceptación finales en Jira (sección 9).
5. Preparar la demo de la Sprint Review: bajar los plazos por variables de
   entorno para mostrar los vencimientos (por ejemplo
   `JWT_ACCESS_TTL_SECONDS=20`, `SESSION_EMPLOYEE_INACTIVITY_SECONDS=60`,
   `SESSION_EMPLOYEE_ABSOLUTE_SECONDS=180`).
6. Correr el seed del Administrador contra Neon (ver sección 8).
7. PR de `feature/auth-login` a `develop`.

### Si sobra tiempo (si no, pasa al Sprint 3)

- Sincronizaciones de clientes: publicar `customer.deactivated`,
  `customer.reactivated` y `customer.email-changed` desde `customers` y
  escucharlos en `accounts`. Los eventos ya están en el contrato. Para eso el
  repositorio de `customers` tiene que usar `client`, y su
  `prisma.$transaction([...])` hay que reescribirlo (el cliente de una
  transacción no tiene `$transaction`).
- `GET /api/customers/me` y `GET /api/empleados/me`, si el frontend necesita
  el nombre del usuario.

---

## 7. Pendientes con otras personas

### 7.1 Quien hizo `users`

Revisé su rama (`origin/users`, `1933e89`). **Ya tiene:** el `email` en
`verifyCredentials` y `findActiveById`, `owner` que admite cliente, el hash de
relleno contra ataques por tiempo, el email normalizado, `PasswordHasher` con
`hash` y `verify`, cero `forwardRef`, rol propio, eventos con
`suppressErrors: false`, repositorios con `client`, y eliminó `SessionRevoker`.

**Le falta** (confirmado al corte):

1. **Reactivar cuenta.** No existe. SCRUM-27 es reversible, solo si el empleado
   está activo.
2. **El e2e de aceptación** con sus módulos reales. En su rama no hay ningún
   e2e propio de `accounts`.
3. Su **filtro de errores** no conoce el 403 ni deja pasar `code` (esto puedo
   hacerlo yo en el paso E).
4. En `docs/accounts-abmc-status.md` dice que `AuthAccountInfo` no tiene
   `email`, pero el código sí.

Mensaje listo para mandar:

> Leí tu rama y está muy bien: está todo lo que habíamos hablado. Dos cosas
> antes de mergearla:
>
> 1. **Reactivar cuenta**: falta. SCRUM-27 es reversible, solo si el empleado
>    está activo.
> 2. **E2E de aceptación**, contra la base de tests y por HTTP, con tus módulos
>    reales (sin listener de prueba):
>    - degradar al único admin con `PATCH /api/empleados/:id` → 409, y
>      `Employee.role` y `Account.role` siguen en ADMIN;
>    - dar de baja al único admin con `DELETE /api/empleados/:id` → 409, y
>      empleado y cuenta siguen activos;
>    - degradar a un admin habiendo dos → 200, y los dos roles pasan a CASHIER;
>    - dar de baja a un empleado con cuenta → 200, y los dos quedan inactivos.
>
>    Armá el módulo de test importando `AccountsModule` con un `PasswordHasher`
>    falso, y creá las cuentas directo con Prisma.
>
> Un detalle: en `accounts-abmc-status.md` dice que `AuthAccountInfo` no tiene
> `email`, pero el código sí.
>
> Cuando eso esté, abrí el PR de `users` a `develop`. Yo antes subo
> `spike/transacciones` a `develop`, así tu PR queda solo con tus commits.

### 7.2 Frontend

Verifiqué su código: `VITE_API_URL` es una URL **absoluta**
(`http://localhost:3000/api`) y `vite.config.ts` **no tiene proxy**. Con eso la
cookie no se comporta igual que en producción.

Mensaje listo para mandar:

> Subí el contrato de autenticación en `docs/auth-api.md` (rama
> `feature/auth-login`). Para que la cookie del refresh token funcione igual en
> desarrollo y en producción hacen falta dos cambios de su lado:
>
> 1. `VITE_API_URL` pasa a ser **`/api`** (relativa), en `.env.example` y en el
>    valor por defecto de `src/shared/api/http.ts`.
> 2. Proxy de Vite en `vite.config.ts`, dentro de `defineConfig`:
>
> ```ts
> server: {
>   proxy: {
>     '/api': { target: 'http://localhost:3000', changeOrigin: true },
>   },
> },
> ```
>
> Revisen que los handlers de MSW sigan coincidiendo, porque usan `API_URL`.
>
> Las reglas importantes están en la sección 8 del documento:
> - renovar solo cuando un pedido real recibe 401, **nunca con un timer**;
> - un solo refresh a la vez;
> - si el refresh falla, reintentar una vez antes de mandar al login;
> - el access token se guarda en memoria, no en `localStorage`;
> - al cargar la app, llamar a refresh para saber si hay sesión;
> - decidir por el campo `code`, no por el texto del mensaje;
> - 401 `UNAUTHENTICATED` = renovar; 403 `FORBIDDEN` = sin permiso.
>
> Cuando activemos la integración, **todos** los endpoints de clientes y
> empleados van a exigir `Authorization: Bearer <token>`.
>
> Dos preguntas:
> 1. ¿Necesitan el nombre del usuario logueado? El login devuelve ids, rol y
>    email. Si hace falta, agrego `GET /api/customers/me` y
>    `GET /api/empleados/me`.
> 2. ¿Después de registrarse, el cliente queda logueado? Del lado del backend
>    el registro no devuelve tokens: si lo quieren, llaman a
>    `/api/auth/login` con lo que el cliente acaba de cargar.

### 7.3 Quien maneja Vercel (**es lo que más bloquea**)

La cookie asume que el frontend y la API se ven bajo el **mismo origen**. Sin
un rewrite, sería una cookie de terceros y Safari las bloquea.

`frontend/vercel.json` propuesto (**no existe hoy; lo escribí de memoria y no
está probado**):

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://TU-BACKEND.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- Reemplazar la URL por la real de Render.
- La segunda regla es el fallback de la SPA: sacarla si ya está resuelto. El
  orden importa: la de `/api` va primera.
- **Cómo probarlo:** después de iniciar sesión, en las herramientas del
  navegador (Application → Cookies) tiene que aparecer `refresh_token` bajo el
  dominio de Vercel, con `Path=/api/auth`, `HttpOnly` y `Secure`.

**Si el rewrite no se puede hacer**, hay que rediseñar cómo viaja el refresh
token (por el cuerpo, con los riesgos que eso tiene). Necesito saberlo antes de
la Review.

### 7.4 Quien maneja Render

Variables a cargar en producción:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` (sin esto la cookie no sale `Secure`) |
| `JWT_SECRET` | Uno **distinto del de desarrollo**, de 32 caracteres o más. Generarlo con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `BCRYPT_COST` | `10` |
| `JWT_ACCESS_TTL_SECONDS`, `SESSION_*` | Opcionales: tienen valor por defecto |

### 7.5 Bloque de cuentas de clientes

**Todavía no vi su rama.** Traerla (solo `git fetch`) para leerla antes de
cerrar. Lo que tiene que saber:

> - Los clientes se loguean con **email**, igual que los empleados.
> - El alta del cliente y la de su cuenta van en **una sola transacción**
>   (`PrismaTransactionRunner`): si falla la cuenta, no queda el cliente.
> - Su endpoint de registro lleva **`@Public()`** (de `src/shared/security/`).
>   Sin eso queda cerrado para todos.
> - El registro **no devuelve tokens**.
> - Los eventos `customer.deactivated`, `customer.reactivated` y
>   `customer.email-changed` ya están en
>   `src/shared/events/domain-events.ts`.
> - En `accounts`, `AccountRole` solo tiene ADMIN y CASHIER, y `findByEmail`
>   descarta las cuentas de cliente: hay que ampliarlos para que un cliente
>   pueda iniciar sesión.
> - Nadie fuera de `accounts` hashea contraseñas.
> - Reglas: `docs/ARCHITECTURE.md` y `docs/transacciones-y-eventos.md`.

### 7.6 Equipo

> - Cuando `feature/auth-login` llegue a `develop`, **la aplicación no arranca
>   sin `JWT_SECRET`** en el `.env`. El comando para generarlo está en
>   `backend/.env.example`.
> - Al actualizar: `npm install`, `npx prisma migrate dev`, y agregar al `.env`
>   las variables nuevas de `.env.example`.
> - Para los e2e: `docker exec vitto_db createdb -U vitto vitto_club_test` y
>   `DATABASE_URL_TEST` en el `.env`.
> - **No hay CI.** Los tests corren solo en local.
> - Los mensajes de error están mezclados: el del login en español, el resto en
>   inglés. A unificar.

### 7.7 Auditoría

Avisarle que el usuario autenticado se obtiene con `@CurrentUser()` (de
`src/shared/security/`), que entrega `{ accountId, role, employeeId?,
customerId? }`. El identificador estable es `accountId`. No trae nombre ni
email.

---

## 8. Orden de merges y despliegue

1. **Subir `feature/auth-login`** (`git push -u origin feature/auth-login`).
2. **`spike/transacciones` → `develop`.** Está terminada. No exige
   `JWT_SECRET`. El equipo tiene que correr `npm install`.
3. **`users` → `develop`**, cuando tenga la reactivación y el e2e.
4. **Traer `develop` a `feature/auth-login`** (`git merge develop`,
   `npm install`, tests).
5. **Paso E** en `feature/auth-login`.
6. **Paso F** y PR de `feature/auth-login` a `develop`.

Regla: mientras otra persona tenga mergeada una rama mía, no reescribirle el
historial (nada de `rebase`, `amend` ni `push --force`).

**Seed en producción (Neon), una sola vez y a mano:**

- Con `SEED_DEMO_DATA` apagado: crea solo el Administrador inicial.
- Las variables `SEED_ADMIN_*` se cargan en esa terminal, no en el repo.
- Antes de aplicar las migraciones en Neon, revisar si hay emails de empleados
  repetidos: la migración del email único borra los duplicados y se queda con
  el de id más bajo.
- Quien corra el seed conoce la contraseña del Administrador, y hoy no hay
  forma de que la cambie. Está anotado como deuda.
- **Falta definir quién tiene acceso para hacerlo.**

---

## 9. Criterios de aceptación (versión final, para Jira)

### Comunes a SCRUM-158 y SCRUM-159

- **Mensaje único de error.** Dado un intento de inicio de sesión que falla por
  cualquier causa, cuando el sistema responde, entonces muestra siempre el
  mismo mensaje genérico y no indica cuál fue la causa.
- **Campos obligatorios.** Dado el formulario de inicio de sesión, cuando el
  usuario envía el email o la contraseña vacíos, entonces el sistema indica que
  son obligatorios y no intenta autenticar.
- **Acceso según rol.** Dado un usuario con sesión iniciada, cuando intenta una
  operación que su rol no tiene habilitada, entonces el sistema la rechaza e
  informa que no tiene permiso.
- **Sin sesión.** Dado un usuario sin sesión o con la sesión vencida, cuando
  intenta una operación protegida, entonces el sistema la rechaza y le pide
  iniciar sesión.
- **Efecto de la baja o del cambio de rol.** Dado un usuario con sesión
  iniciada, cuando lo dan de baja o le cambian el rol, entonces el cambio se
  aplica en un máximo de 15 minutos.

### SCRUM-158: iniciar sesión (empleados)

1. **Ingreso correcto.** Dado un empleado activo con cuenta activa, cuando
   ingresa su email y su contraseña correctos, entonces accede con los permisos
   de su rol.
2. **Mayúsculas.** Dado un empleado con email `ana.gomez@vitto.club`, cuando
   ingresa `Ana.Gomez@Vitto.Club` con la contraseña correcta, entonces accede
   igual.
3. **Empleado sin cuenta.** Recibe el mensaje genérico.
4. **Cuenta o empleado dado de baja.** Con sus credenciales correctas, recibe
   el mensaje genérico y no accede.
5. **Cuenta reactivada.** Dado un empleado activo cuya cuenta fue reactivada
   por un Administrador, cuando ingresa sus credenciales, entonces accede.
6. **Inactividad.** Pasados 30 minutos sin usar el sistema, la sesión vence.
7. **Duración máxima.** A las 12 horas la sesión vence aunque haya estado
   activo.

### SCRUM-159: iniciar sesión (clientes)

1. **Ingreso correcto.** Dado un cliente activo con cuenta, cuando ingresa su
   email y su contraseña correctos, entonces accede como Cliente.
2. **Mayúsculas.** Con `Lucia@Example.com` en lugar de `lucia@example.com`,
   accede igual.
3. **Cliente dado de baja.** Recibe el mensaje genérico y no accede.
4. **Cliente reactivado.** Accede con la misma contraseña que tenía.
5. **Cliente sin cuenta.** Recibe el mensaje genérico.
6. **Cambio de email.** Accede con el email nuevo y no con el anterior.
7. **Email en uso.** Si se intenta cambiar el email de un cliente a uno que ya
   tiene cuenta, el sistema lo rechaza y no cambia nada.
8. **Inactividad.** Pasados 7 días sin usar el sistema, la sesión vence.
9. **Duración máxima.** A los 30 días debe iniciar sesión de nuevo.

### SCRUM-36: cerrar sesión

1. **Cierre.** El sistema lo lleva al inicio de sesión y deja de tener acceso
   desde ese dispositivo.
2. **No se puede renovar.** Una sesión cerrada no se renueva.
3. **Solo la sesión actual.** Con dos dispositivos, cerrar en uno deja la otra
   activa.
4. **Cierre repetido.** Con la sesión ya vencida o cerrada, no muestra error.

**Qué criterios todavía no se pueden demostrar:** todos los de SCRUM-159 (el
login de clientes depende de la rama de cuentas de clientes), y el 5 de
SCRUM-158 (depende de que `users` agregue la reactivación).

---

## 10. Limitaciones conocidas y deuda técnica

**Limitaciones (documentar en la entrega):**

- **Un email, una cuenta.** Una persona que sea empleada y clienta necesita un
  email distinto para cada rol.
- **Un empleado puede quedar sin poder tener cuenta.** Si un administrador
  carga un empleado con el email de un cliente que ya tiene cuenta, el
  conflicto aparece recién al crearle la cuenta. Como el email del empleado no
  se edita, hay que darlo de baja y cargarlo de nuevo.
- **Sin verificación de email:** alguien puede registrarse con un email ajeno.
- **Ventana de 15 minutos** tras una baja o un cambio de rol.

**Deuda (fuera de este sprint):**

- Límite de intentos de login. Ojo: con el rewrite de Vercel todas las
  peticiones llegan con la misma IP.
- Detección de reuso del refresh token.
- Cambio de contraseña por el propio usuario (llevarlo como historia nueva).
- Limpieza de sesiones vencidas de la tabla.
- CI que corra los tests.
- Unificar el idioma de los mensajes de error.
- En `backend/package.json` quedó un bloque `"prisma": { "seed": ... }`
  duplicado: el seed se configura en `prisma.config.ts`.
- `npm install` avisa de vulnerabilidades en dependencias (`npm audit`); no se
  revisaron.

---

## 11. Datos prácticos

**Verificar que todo anda** (desde `backend/`):

```powershell
npm test            # esperado al corte: 296
npm run test:e2e    # esperado al corte: 54
npm run build
```

**Los e2e, por archivo:** health (2), transacciones y eventos (9), sesiones de
auth (13), auth por HTTP (16), matriz de permisos (14).

**Leer una rama ajena sin cambiarse de rama ni mergear:**

```powershell
git fetch origin
git show origin/users:backend/src/accounts/application/accounts.service.ts
git merge-tree --write-tree --name-only feature/auth-login origin/users   # simula el merge
```

**Si al cambiar de rama fallan imports de `nestjs-cls` o `@nestjs/jwt`:**
correr `npm install`. `develop` todavía no tiene esas librerías y al pasar por
ahí se desinstalan.

**Variables de entorno** (todas en `backend/.env.example`): `DATABASE_URL`,
`DATABASE_URL_TEST`, `PORT`, `SEED_ADMIN_*` (5), `SEED_DEMO_DATA`,
`SEED_DEMO_PASSWORD`, `BCRYPT_COST`, `JWT_SECRET`, `JWT_ACCESS_TTL_SECONDS`,
`SESSION_EMPLOYEE_*` (2), `SESSION_CUSTOMER_*` (2). Mi `.env` las tiene todas.

**Cuentas de prueba del seed de demo:** `ana.gomez@vitto.club` (ADMIN),
`bruno.perez@vitto.club` (CASHIER), `lucia@example.com` (CUSTOMER). Carla
(empleada) y Martín (cliente) quedan sin cuenta a propósito.

---

## 12. Dónde está explicado cada tema

| Documento | Qué tiene |
|---|---|
| `docs/autenticacion.md` | Todo el módulo `auth` explicado paso a paso, con código y tests. **Se actualiza en cada paso** |
| `docs/auth-api.md` | El contrato para el frontend |
| `docs/transacciones-y-eventos.md` | Transacciones, commit, rollback y eventos. **Se actualiza cuando se toca el tema** |
| `docs/ARCHITECTURE.md` | Las reglas de arquitectura, incluidas las dos excepciones de `shared/` |
| `docs/spike-transacciones.md` | Informe de la prueba inicial de la librería de transacciones |
| `docs/accounts-abmc-status.md` | (En la rama `users`) Estado del módulo `accounts` |
| `docs/customers-api.md`, `docs/employees-api.md` | Contratos de esos módulos. Dicen "Autenticación: no hay todavía": actualizar después del paso E |
