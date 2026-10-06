# Autenticación (`auth`): cómo funciona

Guía para entender el módulo `auth`: qué problema resuelve, qué piezas tiene,
en qué archivo está cada una y qué prueba cada test. Se va actualizando a
medida que el módulo avanza.

- **Estado:** están hechos el **dominio** y la **primera parte de la
  infraestructura** (configuración y los dos adaptadores de tokens). Todavía
  **no hay login**: no existe el módulo de Nest, ni endpoints, ni nada que
  escriba en la base. Ver "Qué falta" al final.
- **Rama:** `feature/auth-login`.
- **Documentos relacionados:** `docs/ARCHITECTURE.md` (reglas de la
  arquitectura) y `docs/transacciones-y-eventos.md` (transacciones y eventos).

---

## 1. Qué tiene que hacer `auth`

Tres historias del sprint:

| Ticket | Qué es |
|---|---|
| SCRUM-158 | Iniciar sesión (empleados: Cajero y Administrador) |
| SCRUM-159 | Iniciar sesión (clientes) |
| SCRUM-36 | Cerrar sesión |

Más una tarea transversal: que cada endpoint del sistema se pueda usar solo
con el rol que corresponde.

Todos los roles entran por **el mismo endpoint**, con **email y contraseña**.

### Quién hace qué

Las responsabilidades están repartidas entre dos módulos:

| Módulo | Es dueño de |
|---|---|
| `accounts` | La tabla `Account`, las contraseñas y su hash. Responde "¿estas credenciales son válidas?" |
| `auth` | Las sesiones, los tokens, el login, el refresh, el logout y los guards |

`auth` depende de `accounts`, nunca al revés. `auth` **nunca ve una
contraseña guardada ni un hash**: solo le pregunta a `accounts` y recibe un
"sí, es esta cuenta" o un "no".

---

## 2. La idea general: dos tokens

Cuando alguien inicia sesión, el servidor le entrega **dos** cosas:

| | Access token | Refresh token |
|---|---|---|
| Para qué sirve | Demostrar quién sos en cada pedido | Pedir un access token nuevo |
| Cuánto dura | Poco: 15 minutos | Lo que dure la sesión |
| Qué es | Un JWT firmado | Un texto aleatorio, sin significado |
| Se guarda en el servidor | No | Sí (solo su hash) |
| Dónde viaja | En cada pedido, en un encabezado | Solo al renovar o cerrar sesión, en una cookie |

**¿Por qué dos y no uno?** Porque cada uno resuelve una mitad del problema:

- El **access token** se puede verificar sin consultar la base: alcanza con
  comprobar la firma. Eso hace que cada pedido sea rápido. La contra es que,
  una vez emitido, no se puede "cancelar": vale hasta que vence. Por eso dura
  poco.
- El **refresh token** sí está registrado en la base, así que se puede
  revocar (al cerrar sesión, o si dan de baja al usuario). La contra es que
  usarlo cuesta una consulta. Por eso se usa solo cada tanto, para pedir un
  access token nuevo.

**Consecuencia aceptada:** si dan de baja a un usuario o le cambian el rol, su
access token ya emitido sigue valiendo hasta 15 minutos. Después de eso, al
intentar renovar, se le niega. Es una decisión consciente para no consultar la
base en cada pedido.

### El recorrido completo

```
1. LOGIN      email + contraseña  →  access token (15 min) + refresh token
2. USO        cada pedido lleva el access token
3. VENCE      a los 15 min el servidor responde "no autorizado"
4. REFRESH    el front manda el refresh token  →  access token nuevo
                                                  + refresh token NUEVO
5. LOGOUT     se revoca la sesión: el refresh token deja de servir
```

En el paso 4 el refresh token **se reemplaza por uno nuevo** cada vez que se
usa. Eso se llama **rotación**: un refresh token sirve una sola vez.

---

## 3. La sesión y sus vencimientos

Una **sesión** es el registro de "esta cuenta inició sesión". Es una fila en
la tabla `sessions`, y existe **una por login**, no una por token: cuando se
rota el refresh token, la misma sesión cambia de token.

Tiene **dos fechas de vencimiento**:

| Fecha | Qué controla | ¿Se mueve? |
|---|---|---|
| `expiresAt` | Inactividad: cuánto tiempo sin usar el sistema | Sí, se corre hacia adelante en cada renovación |
| `absoluteExpiresAt` | Tope máximo, aunque el usuario siga activo | No, se fija al iniciar |

Los plazos dependen del rol:

| | Inactividad | Tope máximo |
|---|---|---|
| Cajero y Administrador | 30 minutos | 12 horas |
| Cliente | 7 días | 30 días |

La diferencia es por el riesgo: la caja es una computadora compartida; el
cliente usa su propio celular.

### Un ejemplo con horas

Ana (cajera) entra a las **12:00**.

| Hora | Qué pasa | `expiresAt` | Tope |
|---|---|---|---|
| 12:00 | Inicia sesión | 12:30 | 00:00 |
| 12:20 | Usa el sistema y se renueva | 12:50 | 00:00 |
| 12:45 | Se renueva otra vez | 13:15 | 00:00 |
| ... | Trabaja todo el día | ... | 00:00 |
| 23:45 | Se renueva. Le tocaría 00:15, pero el tope es 00:00 | **00:00** | 00:00 |
| 00:00 | La sesión vence, aunque esté activa | — | — |

Y el otro caso: si a las 12:20 Ana se va a almorzar y vuelve a las 13:00, la
sesión venció a las 12:50 por inactividad y tiene que volver a entrar.

---

## 4. Las capas y los archivos

El módulo sigue la arquitectura del proyecto. Hoy existen dos de las cuatro
capas:

```
backend/src/auth/
  domain/                         HECHO  reglas puras, sin librerías
    auth-role.ts
    authenticated-account.ts
    session.ts
    session.spec.ts
    errors/domain.error.ts
    port/
      session.repository.ts
      access-token-issuer.ts
      refresh-token-generator.ts
      credentials-verifier.ts
      session-policies.ts
      transaction-runner.ts
  infrastructure/                 EN CURSO  implementaciones reales
    auth.config.ts
    auth.config.spec.ts
    crypto-refresh-token-generator.ts
    crypto-refresh-token-generator.spec.ts
    jwt-access-token-issuer.ts
    jwt-access-token-issuer.spec.ts
  application/                    FALTA  casos de uso: login, refresh, logout
  http/                           FALTA  endpoints, cookie y guards
  auth.module.ts                  FALTA
```

Fuera del módulo:

| Archivo | Cambio |
|---|---|
| `backend/.env.example` | Seis variables nuevas de autenticación |
| `backend/package.json` | Dependencia `@nestjs/jwt` |

---

## 5. El dominio

El dominio es código puro: no importa Nest, ni Prisma, ni ningún otro módulo.
Por eso se puede testear en milisegundos y sin base de datos.

### 5.1 `auth-role.ts` — los roles

```ts
export const AUTH_ROLES = ['ADMIN', 'CASHIER', 'CUSTOMER'] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];
```

`auth` define sus propios roles en vez de importar los de `accounts` o
`employees`, porque la arquitectura prohíbe que un módulo importe el dominio
de otro.

### 5.2 `authenticated-account.ts` — quién es el usuario

```ts
export type AuthenticatedAccount = {
  accountId: number;
  role: AuthRole;
  employeeId?: number;
  customerId?: number;
};
```

Es la identidad del usuario que inició sesión. Es lo que viaja dentro del
access token y lo que van a recibir los demás módulos (por ejemplo auditoría,
para saber quién hizo cada operación).

Una cuenta de empleado trae `employeeId`; una de cliente, `customerId`.

### 5.3 `session.ts` — la sesión

Tiene cuatro operaciones. Las cuatro reciben **"ahora" por parámetro**: la
sesión nunca mira el reloj por su cuenta. Así un test puede decir "pasaron 11
horas" sin esperar 11 horas.

**Iniciar** (`start`), en el login:

```ts
const nowMs = data.now.getTime();
const absoluteExpiresAt = new Date(nowMs + absoluteMs);
const expiresAt = earliest(new Date(nowMs + inactivityMs), absoluteExpiresAt);
```

Calcula las dos fechas. `earliest` devuelve la más temprana de dos fechas: se
usa para que el vencimiento por inactividad nunca quede después del tope.

**¿Está vigente?** (`isUsable`):

```ts
isUsable(now: Date): boolean {
  const nowMs = now.getTime();
  return (
    this._revokedAt === null &&
    nowMs < this._expiresAt.getTime() &&
    nowMs < this._absoluteExpiresAt.getTime()
  );
}
```

Tres condiciones a la vez: que no esté revocada y que "ahora" sea anterior a
las dos fechas.

**Renovar** (`rotate`), en el refresh:

```ts
rotate(newTokenHash: string, now: Date, inactivityMs: number): void {
  if (!this.isUsable(now)) {
    throw new DomainError('Session is expired or revoked');
  }
  ...
  this._tokenHash = tokenHash;
  this._expiresAt = earliest(new Date(now.getTime() + inactivity), this._absoluteExpiresAt);
}
```

Si la sesión no está vigente, se niega. Si lo está, cambia el token y corre el
vencimiento por inactividad, **sin pasar nunca del tope**. Esa última línea es
la que hace cumplir las 12 horas.

**Revocar** (`revoke`), en el logout o en la baja de la cuenta:

```ts
revoke(now: Date): void {
  if (this._revokedAt !== null) return;
  this._revokedAt = new Date(now.getTime());
}
```

Si ya estaba revocada no hace nada y no da error. Por eso cerrar sesión dos
veces no falla (criterio 4 de SCRUM-36).

### 5.4 Los puertos

Un **puerto** es una lista de "necesito que alguien sepa hacer esto", sin
decir cómo. En código es una clase abstracta: tiene los nombres de los métodos
pero no el contenido.

| Puerto | Qué necesita `auth` | Quién lo implementa |
|---|---|---|
| `SessionRepository` | Guardar, buscar, renovar y revocar sesiones | Falta (repositorio con Prisma) |
| `AccessTokenIssuer` | Emitir y verificar el access token | `JwtAccessTokenIssuer` |
| `RefreshTokenGenerator` | Generar el refresh token y calcular su hash | `CryptoRefreshTokenGenerator` |
| `SessionPolicies` | Saber los plazos de sesión según el rol | `AuthConfig` |
| `CredentialsVerifier` | Preguntar si email y contraseña son válidos | Falta (adaptador hacia `accounts`) |
| `TransactionRunner` | Abrir una transacción | `PrismaTransactionRunner` |

**¿Para qué sirve esta separación?** El caso de uso del login va a usar estos
puertos y nada más. En los tests se le pasan versiones falsas, así que el
login se puede escribir y probar entero sin base de datos, sin JWT real y sin
esperar a que `accounts` esté terminado.

Un detalle del repositorio de sesiones:

```ts
abstract saveRotation(session: Session, previousTokenHash: string): Promise<boolean>;
```

Guarda la renovación **solo si la sesión todavía tiene el token anterior**, y
devuelve `false` si no. Resuelve el caso de dos pestañas abiertas que renuevan
al mismo tiempo con el mismo refresh token: la base deja pasar a una sola. Sin
esto, el mismo refresh token podría usarse dos veces.

---

## 6. La infraestructura

La infraestructura son las implementaciones reales de los puertos. Acá sí
aparecen librerías.

### 6.1 Las variables de entorno

En `backend/.env.example`:

| Variable | Qué es | Valor acordado |
|---|---|---|
| `JWT_SECRET` | La clave con la que se firman los access tokens | Mínimo 32 caracteres, secreto |
| `JWT_ACCESS_TTL_SECONDS` | Vida del access token | 900 (15 minutos) |
| `SESSION_EMPLOYEE_INACTIVITY_SECONDS` | Inactividad de empleados | 1800 (30 minutos) |
| `SESSION_EMPLOYEE_ABSOLUTE_SECONDS` | Tope de empleados | 43200 (12 horas) |
| `SESSION_CUSTOMER_INACTIVITY_SECONDS` | Inactividad de clientes | 604800 (7 días) |
| `SESSION_CUSTOMER_ABSOLUTE_SECONDS` | Tope de clientes | 2592000 (30 días) |

`JWT_SECRET` es lo más delicado del módulo: **quien conozca ese valor puede
fabricar tokens válidos de cualquier usuario**, incluido un administrador. Por
eso nunca se sube al repositorio: en `.env.example` está vacío, y el valor
real vive solo en el `.env` de cada uno (que git ignora) y en la configuración
del servidor de producción.

Para generar uno:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Los plazos están en variables para poder **bajarlos en la Sprint Review** y
mostrar los vencimientos sin esperar 30 minutos.

### 6.2 `auth.config.ts` — leer y validar la configuración

Lee las variables **una sola vez, al arrancar**, y las valida:

```ts
const secret = config.get<string>('JWT_SECRET');
if (!secret || secret.length < MIN_SECRET_LENGTH) {
  throw new Error(
    `JWT_SECRET is required and must have at least ${MIN_SECRET_LENGTH} characters (see .env.example)`,
  );
}
```

Si falta el secreto, es muy corto, o un plazo no es un número válido, **la
aplicación no levanta**. Es a propósito: es mejor enterarse al arrancar que
descubrirlo cuando alguien intenta iniciar sesión, o peor, quedar firmando
tokens con una clave débil.

Además implementa el puerto `SessionPolicies`:

```ts
forRole(role: AuthRole): SessionPolicy {
  return role === 'CUSTOMER' ? this.customerPolicy : this.employeePolicy;
}
```

Las variables están en segundos (más fáciles de leer y escribir) y acá se
convierten a milisegundos, que es lo que usa la entidad `Session`.

### 6.3 `crypto-refresh-token-generator.ts` — el refresh token

```ts
generate(): GeneratedRefreshToken {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, hash: this.hash(token) };
}

hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

- **`generate`**: pide 32 bytes aleatorios al sistema operativo y los escribe
  como texto. El resultado son 43 caracteres imposibles de adivinar. Devuelve
  dos cosas: el `token` (que se le manda al usuario) y su `hash` (que se
  guarda en la base).
- **`hash`**: calcula el hash de un token recibido. Se usa cuando llega un
  refresh: se calcula el hash de lo que mandó el usuario y se busca esa
  sesión.

**¿Por qué se guarda el hash y no el token?** Un hash es una transformación de
una sola vía: del token se obtiene el hash, pero del hash no se puede volver
al token. Si alguien lograra leer la tabla `sessions`, vería solo hashes y no
podría usarlos para hacerse pasar por nadie.

**¿Por qué SHA-256 y no bcrypt, como las contraseñas?** bcrypt es lento a
propósito, para proteger contraseñas que la gente elige y que suelen ser
adivinables. Un refresh token son 256 bits aleatorios: no se puede adivinar,
así que no necesita esa protección. Y un hash rápido y fijo permite buscar la
sesión directo por índice.

**No usa ninguna librería externa**: `crypto` viene con Node.

### 6.4 `jwt-access-token-issuer.ts` — el access token

Un **JWT** es un texto con tres partes separadas por puntos:

```
encabezado . contenido . firma
```

- El **contenido** dice quién es el usuario. **No está cifrado**: cualquiera
  que tenga el token puede leerlo. Por eso nunca lleva nada secreto.
- La **firma** se calcula con el contenido y `JWT_SECRET`. Si alguien cambia
  una letra del contenido, la firma deja de coincidir y el token se rechaza.

O sea: un JWT no esconde la información, **garantiza que no fue alterada**.

**Emitir:**

```ts
async issue(account: AuthenticatedAccount): Promise<string> {
  return await this.jwt.signAsync({
    sub: String(account.accountId),
    role: account.role,
    ...(account.employeeId !== undefined ? { employeeId: account.employeeId } : {}),
    ...(account.customerId !== undefined ? { customerId: account.customerId } : {}),
  });
}
```

El contenido lleva lo mínimo:

| Campo | Qué es |
|---|---|
| `sub` | El id de la cuenta. `sub` es el nombre estándar para "de quién es este token" |
| `role` | El rol |
| `employeeId` o `customerId` | El dueño de la cuenta |
| `iat`, `exp` | Cuándo se emitió y cuándo vence. Los agrega la librería |

No lleva el email ni el nombre: pueden cambiar, y el token quedaría con datos
viejos.

**Verificar:**

```ts
async verify(token: string): Promise<AuthenticatedAccount | null> {
  try {
    const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token);
    return toAccount(payload);
  } catch {
    return null;
  }
}
```

Si la firma no coincide, el token venció o el texto ni siquiera es un JWT, la
librería tira un error. Acá se atrapa y se devuelve `null`: para el resto del
sistema hay un solo resultado posible, "no válido", sin importar el motivo.

Después de verificar la firma hay un segundo control, `toAccount`, que revisa
que el contenido tenga la forma esperada (un id de cuenta válido y un rol
conocido). Un token bien firmado pero con un rol inventado tampoco se acepta.

---

## 7. Los tests

Son todos unitarios: no usan base de datos ni levantan la aplicación.

```bash
cd backend
npm test -- src/auth
```

Resultado esperado: 4 archivos, 31 tests.

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

### `auth.config.spec.ts` — 6 tests

| Test | Qué prueba |
|---|---|
| Valores por defecto | Solo con el secreto, usa los plazos acordados |
| Empleados | Cajero y Administrador comparten plazos |
| Variables | Toma los plazos del entorno (para la demo) |
| Sin secreto | No arranca |
| Secreto corto | No arranca |
| Plazo inválido | No arranca |

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

---

## 8. Decisiones tomadas

| Decisión | Motivo |
|---|---|
| Un solo endpoint de login para todos los roles | El frontend tiene una sola pantalla |
| Todos entran con email | Simplifica: un solo tipo de identificador |
| Mismo mensaje ante cualquier fallo de login | No revelar si el email existe, si la contraseña está mal o si la cuenta está dada de baja |
| Access token de 15 minutos | Balance entre no consultar la base en cada pedido y que una baja tarde poco en aplicarse |
| Refresh token rotado en cada uso | Un token robado sirve una sola vez |
| Una fila por sesión, no por token | Más simple; no hace falta guardar los tokens viejos |
| En la base se guarda el hash del refresh token | Leer la tabla no alcanza para robar sesiones |
| Plazos distintos para empleados y clientes | La caja es una computadora compartida; el celular del cliente no |
| Varias sesiones simultáneas por cuenta | Dos cajas, o celular y computadora |
| El logout cierra solo la sesión actual | Consecuencia de lo anterior |

### Fuera de este sprint (deuda técnica)

- **Límite de intentos de login.** Además, con el rewrite de Vercel todas las
  peticiones llegan con la misma IP, y un límite por IP mal configurado
  bloquearía a todos.
- **Detección de reuso del refresh token** (revocar toda la sesión si llega un
  token ya usado). Con dos pestañas abiertas daría falsos positivos.
- **Cambio de contraseña por el propio usuario.**
- **Verificación del email al registrarse.**
- **Limpieza de sesiones vencidas** de la tabla.

---

## 9. Qué falta

| Paso | Qué es | Depende de |
|---|---|---|
| B2 | Repositorio de sesiones con Prisma, `auth.module.ts` y sus tests contra la base | — |
| C | Casos de uso: login, refresh, logout, y el listener que revoca sesiones cuando dan de baja una cuenta | B2 |
| D | Endpoints, cookie del refresh token, guards y decoradores (`@Roles`, `@Public`, `@CurrentUser`) | C |
| E | Integración con `accounts`: hasher de contraseñas, conectar el login con la verificación de credenciales, proteger todos los endpoints | D y la rama `users` |
| F | Tests de punta a punta, contrato para el frontend y documentación | E |

Hasta el paso D el login se prueba con una verificación de credenciales
falsa. Recién en el E entra el usuario real de la base.

---

## 10. Glosario

| Término | Significado |
|---|---|
| Autenticación | Comprobar quién es el usuario (login) |
| Autorización | Decidir qué puede hacer ese usuario (roles) |
| Sesión | El registro de que una cuenta inició sesión |
| Access token | Credencial de vida corta que acompaña cada pedido |
| Refresh token | Credencial que sirve para pedir un access token nuevo |
| JWT | Formato de token con contenido legible y una firma que impide alterarlo |
| Firma | Cálculo hecho con el contenido y una clave secreta; prueba que el token no fue modificado |
| Hash | Transformación de una sola vía: no se puede volver al valor original |
| Rotación | Reemplazar el refresh token por uno nuevo cada vez que se usa |
| Revocar | Invalidar una sesión antes de que venza |
| Vencimiento por inactividad | La sesión muere si no se usa por cierto tiempo |
| Vencimiento absoluto | La sesión muere después de cierto tiempo, se use o no |
| Puerto | Clase abstracta que dice qué se necesita, sin decir cómo se hace |
| Adaptador | La implementación concreta de un puerto |
| Guard | Pieza de Nest que decide si un pedido puede pasar a un endpoint |

---

## Historial de este documento

| Fecha | Cambio |
|---|---|
| 2026-10-05 | Versión inicial: dominio (sesión y puertos) y primera parte de la infraestructura (configuración, refresh token y JWT). 31 tests |
