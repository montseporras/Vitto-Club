# Autenticación (`auth`): cómo funciona

Guía para entender el módulo `auth`: qué problema resuelve, qué piezas tiene,
en qué archivo está cada una y qué prueba cada test. Se va actualizando a
medida que el módulo avanza.

- **Estado:** el módulo `auth` está **completo e integrado con `accounts`**:
  dominio, infraestructura, casos de uso, capa HTTP y la conexión con las
  cuentas reales. Se probó con la aplicación levantada y el seed de desarrollo:
  el login del Administrador funciona con el hash que generó el seed.
  - **Los empleados (Administrador y Cajero) ya pueden iniciar sesión.**
  - **Los clientes todavía no**: `accounts` hoy solo resuelve cuentas de
    empleado. Depende del bloque de registro de clientes (ver 11).
  - **Los guards ya protegen toda la aplicación** (ver 8.6): un pedido sin token
    recibe 401, y cada endpoint exige el rol que declara.

  Ver "Qué falta" al final.
- **Importante:** desde que el módulo está registrado, **la aplicación no
  arranca sin `JWT_SECRET`** en el `.env` (ver 6.1).
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

El módulo sigue la arquitectura del proyecto, con sus cuatro capas:

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
  infrastructure/                 HECHO  implementaciones reales
    auth.config.ts
    auth.config.spec.ts
    crypto-refresh-token-generator.ts
    crypto-refresh-token-generator.spec.ts
    jwt-access-token-issuer.ts
    jwt-access-token-issuer.spec.ts
    sessions.repository.ts
    account-deactivated.listener.ts
    accounts-credentials-verifier.ts
    accounts-credentials-verifier.spec.ts
  application/                    HECHO  casos de uso
    auth.service.ts
    auth.service.spec.ts
  http/                           HECHO  adaptador de entrada: REST
    auth.controller.ts
    refresh-cookie.ts
    refresh-cookie.spec.ts
    dto/
      login.dto.ts
      auth-response.dto.ts
    filters/
      auth-exception.filter.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
      guards.spec.ts
  auth.module.ts                  HECHO  liga cada puerto con su implementación

backend/src/shared/security/      HECHO  lo que usan los controllers de cualquier módulo
  current-user-data.ts
  public.decorator.ts
  roles.decorator.ts
  current-user.decorator.ts
```

Fuera del módulo:

| Archivo | Cambio |
|---|---|
| `backend/src/app.module.ts` | Registra `AccountsModule` y `AuthModule` |
| `backend/src/accounts/infrastructure/bcrypt-password-hasher.ts` (y su spec) | El adaptador de bcryptjs: hashea y verifica contraseñas. Vive en `accounts` (ver 6.8) |
| `backend/src/accounts/accounts.module.ts` | Registra el hasher |
| `backend/src/accounts/domain/password.ts` (y su spec) | Límite de 72 bytes en la contraseña (ver 6.8) |
| `backend/src/accounts/http/accounts.controller.ts` | `@Roles('ADMIN')`: solo el Administrador gestiona cuentas |
| `backend/src/accounts/http/filters/accounts-exception.filter.ts` | Conoce el 403 y deja pasar el campo `code` |
| `backend/test/setup-e2e-env.ts` | Costo mínimo de bcrypt en los e2e |
| `backend/test/auth-sessions.e2e-spec.ts` | Tests del repositorio y del armado del módulo, contra la base |
| `backend/test/auth-http.e2e-spec.ts` | Tests de los endpoints, la cookie y los guards, por HTTP |
| `backend/test/auth-integration.e2e-spec.ts` | Login real de punta a punta, sin nada falso (ver 9) |
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
| `SessionRepository` | Guardar, buscar, renovar y revocar sesiones | `SessionPrismaRepository` |
| `AccessTokenIssuer` | Emitir y verificar el access token | `JwtAccessTokenIssuer` |
| `RefreshTokenGenerator` | Generar el refresh token y calcular su hash | `CryptoRefreshTokenGenerator` |
| `SessionPolicies` | Saber los plazos de sesión según el rol | `AuthConfig` |
| `CredentialsVerifier` | Preguntar si email y contraseña son válidos | `AccountsCredentialsVerifier`, que le pregunta a `accounts` |
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

### 6.5 `sessions.repository.ts` — guardar las sesiones

Traduce entre la entidad `Session` y la tabla `sessions`. Tiene cinco
operaciones; la que más importa es la que guarda una renovación:

```ts
async saveRotation(session: Session, previousTokenHash: string): Promise<boolean> {
  const result = await this.tx.client.session.updateMany({
    where: { id: requiredId(session), tokenHash: previousTokenHash, revokedAt: null },
    data: { tokenHash: session.getTokenHash(), expiresAt: session.getExpiresAt() },
  });
  return result.count === 1;
}
```

El `where` no pide solo "la sesión con este id": pide "la sesión con este id,
**que todavía tenga el token anterior y que no esté revocada**". Si dos
pedidos llegan a la vez con el mismo refresh token (dos pestañas abiertas):

1. Los dos leen la sesión con el token `A`.
2. El primero la actualiza: ahora tiene el token `B`.
3. El segundo intenta actualizar "la sesión que tenga el token `A`". Ya no hay
   ninguna: no modifica nada y recibe `false`.

Quien decide quién gana es la base de datos, así que es imposible que pasen
los dos. Lo mismo protege contra renovar una sesión que alguien revocó un
instante antes.

Otro detalle: usa `this.tx.client`, el cliente del adaptador de transacciones,
y no `PrismaService`. Por eso, si el caso de uso que lo llama abrió una
transacción y después falla, la sesión no queda guardada (ver
`docs/transacciones-y-eventos.md`).

### 6.6 `auth.module.ts` — el armado

Es la tabla de "cuando alguien pida este puerto, entregale esta
implementación":

```ts
providers: [
  AuthConfig,
  { provide: SessionPolicies, useExisting: AuthConfig },
  { provide: SessionRepository, useClass: SessionPrismaRepository },
  { provide: AccessTokenIssuer, useClass: JwtAccessTokenIssuer },
  { provide: RefreshTokenGenerator, useClass: CryptoRefreshTokenGenerator },
  { provide: TransactionRunner, useExisting: PrismaTransactionRunner },
  { provide: CredentialsVerifier, useClass: AccountsCredentialsVerifier },
  AuthService,
  AccountDeactivatedListener,
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
],
exports: [AuthService],
```

Dos líneas merecen explicación:

- **`CredentialsVerifier`** se resuelve con el adaptador que conecta con
  `accounts` (ver 6.8). Para eso `AuthModule` importa `AccountsModule`: `auth`
  depende de `accounts`, y `accounts` no importa nada de `auth`.
- **`APP_GUARD`** es la forma que tiene Nest de registrar un guard para **toda**
  la aplicación. Se declaran dos, y **el orden importa**: primero
  `JwtAuthGuard` (¿quién sos?) y después `RolesGuard` (¿podés hacerlo?). Ver 8.6.

También configura el JWT en un solo lugar:

```ts
secret: config.jwtSecret,
signOptions: { expiresIn: config.accessTokenTtlSeconds, algorithm: 'HS256' as const },
verifyOptions: { algorithms: ['HS256' as const] },
```

El algoritmo se declara **al firmar y al verificar**. Declararlo al verificar
evita aceptar un token armado con otro algoritmo, que es una forma conocida de
atacar implementaciones de JWT.

Como `AuthModule` está registrado en `AppModule`, `AuthConfig` se construye al
arrancar. Si falta `JWT_SECRET`, la aplicación corta ahí con este mensaje:

```
Error: JWT_SECRET is required and must have at least 32 characters (see .env.example)
```

### 6.7 `account-deactivated.listener.ts` — cuando dan de baja una cuenta

```ts
@OnEvent(ACCOUNT_DEACTIVATED, { suppressErrors: false })
async handle(event: AccountDeactivatedEvent): Promise<void> {
  await this.authService.revokeAllSessionsOfAccount(event.accountId);
}
```

Cuando `accounts` da de baja una cuenta publica el evento
`account.deactivated`. Este listener lo escucha y cierra todas las sesiones de
esa cuenta: desde ese momento ya no puede renovar. (El access token que tenga
emitido sigue valiendo hasta 15 minutos; ver la sección 2.)

Vive en `infrastructure/` y no en `application/` porque es un **adaptador de
entrada**: cumple el mismo papel que un controller, solo que lo dispara un
evento en lugar de un pedido HTTP. Así el caso de uso no conoce la librería de
eventos.

`suppressErrors: false` hace que, si revocar fallara, el error llegue a quien
dio de baja la cuenta y se deshaga toda la operación (ver
`docs/transacciones-y-eventos.md`).

### 6.8 La conexión con `accounts`

Son tres piezas, dos de las cuales viven en `accounts` (el módulo dueño de las
contraseñas) y una en `auth`.

#### El adaptador de `auth`: `accounts-credentials-verifier.ts`

```ts
@Injectable()
export class AccountsCredentialsVerifier implements CredentialsVerifier {
  constructor(private readonly accounts: AccountsService) {}

  async verify(email: string, password: string): Promise<VerifiedAccount | null> {
    return toVerifiedAccount(await this.accounts.verifyCredentials(email, password));
  }

  async findActiveById(accountId: number): Promise<VerifiedAccount | null> {
    return toVerifiedAccount(await this.accounts.findActiveById(accountId));
  }
}
```

Es un **traductor** entre dos formas de decir lo mismo. `accounts` responde
`{ accountId, role, owner: { employeeId }, email }` o `undefined`; el puerto de
`auth` espera `{ account: { accountId, role, employeeId }, email }` o `null`.
La función `toVerifiedAccount` hace esa traducción:

```ts
...('employeeId' in info.owner
  ? { employeeId: info.owner.employeeId }
  : { customerId: info.owner.customerId }),
```

`owner` puede ser de un empleado o de un cliente, y de ahí sale cuál de los dos
ids viaja en el access token. Si `accounts` entrega `firstName` y `lastName`,
pasan solos a la respuesta; si no, no aparecen.

**`auth` no ve ningún hash ni ninguna contraseña guardada.** Le pasa a
`accounts` lo que tipeó el usuario, tal cual, y recibe "es esta cuenta" o
"nadie". Tampoco normaliza el email: lo hace `accounts` (recorta espacios y
pasa a minúsculas).

#### El hasher: `bcrypt-password-hasher.ts` (en `accounts`)

```ts
async hash(plainPassword: string): Promise<string> {
  return await bcrypt.hash(plainPassword, this.cost);
}

async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
  return await bcrypt.compare(plainPassword, passwordHash);
}
```

Implementa el puerto `PasswordHasher` de `accounts` con la librería
`bcryptjs`. Vive en `accounts` y **no en `auth`** por una razón de dependencias:
si estuviera en `auth`, `accounts` tendría que importar `auth` para obtenerlo, y
`auth` ya importa `accounts` para el login. Sería un ciclo.

- **bcrypt** es un algoritmo hecho para guardar contraseñas: es **lento a
  propósito**, así que probar millones de contraseñas contra un hash robado
  cuesta mucho. Cada hash lleva su propia "sal" (un valor aleatorio), por eso la
  misma contraseña da hashes distintos y no se pueden comparar a simple vista.
- **El costo** (`BCRYPT_COST`, de 4 a 15, por defecto 10) es cuántas veces se
  repite el trabajo. Cada punto más duplica el tiempo. En los tests se baja a 4.
  Se valida al arrancar: un valor inválido corta la aplicación.
- **`bcryptjs` y no `bcrypt`**: es JavaScript puro, no compila nada nativo, así
  que instala igual en Windows, en GitHub Actions y en Render.
- Un hash guardado que no tiene forma de bcrypt (dato corrupto) **devuelve
  `false`**, no un error.
- Para cambiar de algoritmo (por ejemplo argon2) se escribe otro adaptador del
  mismo puerto y se cambia **una línea** en `accounts.module.ts`.

El seed genera los hashes con la misma librería, así que **el login verifica las
contraseñas del seed sin ningún cambio**. Hay un test que lo comprueba.

#### El límite de 72 bytes: `password.ts` (en `accounts`)

```ts
if (Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES) {
  throw new DomainError(
    `Password cannot exceed ${MAX_PASSWORD_BYTES} bytes (accented characters count as 2)`,
    'password',
  );
}
```

Esto salió de una prueba y no estaba previsto: **bcrypt solo mira los primeros
72 bytes de la contraseña y descarta el resto sin avisar.** Una letra con tilde
ocupa 2 bytes, así que 64 letras con tilde son 128 bytes. Se probó: esa
contraseña verifica igual que sus **primeras 36 letras**. Dos contraseñas
distintas serían la misma.

El límite de 64 caracteres no alcanzaba para evitarlo, así que se agregó el
límite en bytes. Se aplica al crear una cuenta y al cambiar la contraseña. Para
el frontend: una contraseña de solo ASCII puede tener hasta 64 caracteres; con
tildes o eñes, menos.

---

## 7. Los casos de uso

Están en `application/auth.service.ts`. Usan solo los puertos: no saben nada
de Prisma, de JWT ni de HTTP.

### 7.1 Qué devuelven el login y la renovación

Los dos devuelven **exactamente lo mismo**:

```ts
export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUser;   // accountId, role, employeeId o customerId, y email
};
```

Que sean iguales es una necesidad del frontend: al recargar la página pierde
el access token (lo tiene en memoria), llama a la renovación y con esa
respuesta tiene que poder reconstruir todo: quién es el usuario y qué pantalla
mostrarle. Los dos casos de uso arman la respuesta con la misma función
(`toResult`), así que no pueden divergir.

- `refreshTokenExpiresAt` es el tope máximo de la sesión. Lo usa la capa HTTP
  para la duración de la cookie.
- El **email** va en la respuesta pero **no dentro del access token**, porque
  puede cambiar. `auth` no lo conoce por sí mismo: se lo da `accounts`.
- **Nombre y apellido** (`firstName`, `lastName`): el frontend los muestra en
  el encabezado ("Nombre Apellido · Rol"). `accounts` los entrega junto con el
  resto, tomándolos del empleado que ya carga para leer el rol, así que no
  cuesta una consulta más. Igual que el email, van en la respuesta y **no
  dentro del access token**: pueden cambiar. Son **opcionales** en el tipo:
  para clientes `accounts` todavía no los conoce y la respuesta no los trae
  (ver la limitación de abajo).

  ```ts
  user: {
    ...verified.account,
    email: verified.email,
    ...(verified.firstName !== undefined ? { firstName: verified.firstName } : {}),
    ...(verified.lastName !== undefined ? { lastName: verified.lastName } : {}),
  },
  ```

  El `...(condición ? {...} : {})` agrega el campo solo si existe: si no, el
  cliente recibiría `firstName: undefined`, y la respuesta tendría una clave
  que no debería estar.

  **Por qué para clientes no vienen:** el nombre del cliente vive en
  `customers`. Si `accounts` lo leyera, dependería de `customers`, y
  `customers` va a necesitar a `accounts` para crear la cuenta en el registro:
  un ciclo. Se resuelve con `GET /api/customers/me` cuando la pantalla del
  cliente lo requiera (ver deuda técnica).

### 7.2 Iniciar sesión

```ts
async login(email: string, password: string): Promise<AuthResult> {
  const verified = await this.credentials.verify(email, password);
  if (!verified) {
    throw invalidCredentials();
  }

  const policy = this.policies.forRole(verified.account.role);

  const refresh = this.refreshTokens.generate();
  const session = await this.sessions.save(
    Session.start({
      accountId: verified.account.accountId,
      tokenHash: refresh.hash,
      now: new Date(),
      inactivityMs: policy.inactivityMs,
      absoluteMs: policy.absoluteMs,
    }),
  );

  return await this.toResult(verified, refresh.token, session);
}
```

1. Le pregunta a `accounts` si las credenciales son válidas. `auth` le pasa el
   email tal como lo tipeó el usuario; normalizarlo es tarea de `accounts`.
2. Si la respuesta es "no", tira el error genérico y **no guarda nada**.
3. Pide los plazos del rol.
4. Genera el refresh token y guarda la sesión con su **hash**.
5. Emite el access token y arma la respuesta.

Es el mismo flujo para los tres roles: no hay una rama para empleados y otra
para clientes.

### 7.3 Renovar

```ts
const previousHash = this.refreshTokens.hash(refreshToken);
const session = await this.sessions.findByTokenHash(previousHash);
const now = new Date();
if (!session || !session.isUsable(now)) {
  throw invalidSession();
}

const verified = await this.credentials.findActiveById(session.getAccountId());
if (!verified) {
  throw invalidSession();
}

const policy = this.policies.forRole(verified.account.role);
const next = this.refreshTokens.generate();
session.rotate(next.hash, now, policy.inactivityMs);

const rotated = await this.sessions.saveRotation(session, previousHash);
if (!rotated) {
  throw invalidSession();
}
```

Cuatro controles, y cualquiera que falle responde lo mismo:

| Control | Qué caso cubre |
|---|---|
| La sesión existe | Token inventado, o ya rotado |
| La sesión está vigente | Venció por inactividad, pasó el tope, o fue revocada |
| La cuenta sigue activa | Dieron de baja al usuario |
| `saveRotation` devolvió `true` | Otra pestaña renovó primero con el mismo token |

De la consulta a `accounts` sale además el **rol actual**. Por eso, si a un
cajero lo ascienden a administrador, en su próxima renovación (15 minutos como
máximo) el access token ya sale con el rol nuevo, sin volver a iniciar sesión.

### 7.4 Cerrar sesión

```ts
async logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;

  const session = await this.sessions.findByTokenHash(this.refreshTokens.hash(refreshToken));
  if (!session) return;

  session.revoke(new Date());
  await this.sessions.saveRevocation(session);
}
```

**Nunca falla.** Sin token, con un token desconocido o con la sesión ya
cerrada, termina igual. Cierra solo esa sesión: si el usuario tiene otra
abierta en otro dispositivo, sigue vigente.

### 7.5 Los errores

```ts
function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Los datos de acceso son incorrectos',
    code: INVALID_CREDENTIALS,
  });
}
```

| Código | Cuándo | Mensaje |
|---|---|---|
| `INVALID_CREDENTIALS` | Cualquier fallo de login | Los datos de acceso son incorrectos |
| `INVALID_SESSION` | Cualquier fallo de renovación | La sesión no es válida |

- El **código** es fijo y es lo que tiene que mirar el frontend. El texto
  puede cambiar sin romper nada.
- Hay **un solo error por operación**, a propósito. El login no dice si el
  email no existe, si la contraseña está mal o si la cuenta está dada de baja.
  La renovación no dice si la sesión venció, fue revocada o la cuenta ya no
  está activa.
- El mensaje del login está en español porque es el único que el frontend
  muestra tal cual. El resto de los errores del backend están en inglés; esa
  mezcla queda como tema a resolver con el equipo.

---

## 8. La capa HTTP

Es la puerta de entrada: recibe los pedidos, llama a los casos de uso y arma
las respuestas. No tiene reglas de negocio.

### 8.1 Los tres endpoints

Todos bajo `/api/auth`, todos `POST`, todos **públicos**: al login se llega
sin sesión, y la renovación y el cierre se identifican por la cookie, no por
el access token (que justamente puede estar vencido).

| Endpoint | Recibe | Responde |
|---|---|---|
| `POST /api/auth/login` | `{ email, password }` en el cuerpo | 200 con `{ accessToken, user }`, y deja la cookie |
| `POST /api/auth/refresh` | Solo la cookie | 200 con `{ accessToken, user }`, y **reemplaza** la cookie |
| `POST /api/auth/logout` | Solo la cookie | 204 sin contenido, y borra la cookie |

**Login correcto:**

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "ana.gomez@vitto.club", "password": "..." }
```

```http
HTTP/1.1 200 OK
Set-Cookie: refresh_token=...; Path=/api/auth; Expires=...; HttpOnly; SameSite=Lax

{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "accountId": 1,
    "role": "ADMIN",
    "employeeId": 1,
    "email": "ana.gomez@vitto.club"
  }
}
```

Para un cliente, `user` trae `customerId` en lugar de `employeeId`.

**Login incorrecto** (cualquiera sea la causa):

```http
HTTP/1.1 401 Unauthorized

{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Los datos de acceso son incorrectos",
  "path": "/api/auth/login",
  "timestamp": "2026-10-06T01:50:01.054Z",
  "code": "INVALID_CREDENTIALS"
}
```

Es la respuesta real de la aplicación ante una contraseña incorrecta, un email
inexistente o una cuenta dada de baja: las tres dan exactamente lo mismo.

**Qué valida el login** (`dto/login.dto.ts`):

```ts
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  password!: string;
}
```

Solo que los dos campos sean texto, no estén vacíos y no superen un largo
máximo. **A propósito no valida** que el email tenga formato de email ni que
la contraseña tenga un largo mínimo: un error de formato le diría a quien
está probando credenciales qué forma tienen las válidas. Si falta un campo o
viene uno de más, responde 400 y ni siquiera intenta autenticar.

### 8.2 La cookie del refresh token

El refresh token **nunca aparece en el cuerpo de una respuesta**. Viaja solo
en una cookie, con estas características (`auth.controller.ts`):

```ts
private cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: this.config.cookieSecure,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
  };
}
```

| Atributo | Qué hace | Para qué |
|---|---|---|
| `HttpOnly` | El JavaScript de la página no puede leer la cookie | Si un script malicioso se cuela en el frontend, no puede robar el refresh token |
| `Secure` | Solo viaja por HTTPS | Nadie la ve en tránsito. Se activa solo en producción, porque en desarrollo se usa HTTP |
| `SameSite=Lax` | No viaja en pedidos `POST` originados en otro sitio | Otro sitio web no puede hacer que el navegador renueve o cierre la sesión en nombre del usuario |
| `Path=/api/auth` | Solo viaja a las rutas de `auth` | No se manda en cada pedido al resto de la API: menos exposición |
| `Expires` | Vence en el tope máximo de la sesión | El navegador la descarta sola cuando la sesión ya no puede servir |

El **access token**, en cambio, sí va en el cuerpo: el frontend lo guarda en
memoria (no en `localStorage`) y lo manda en cada pedido en el encabezado
`Authorization: Bearer <token>`.

**Por qué esta división:** el token de vida larga (el refresh) queda fuera del
alcance del JavaScript, y el que sí es accesible (el access) dura 15 minutos.

**Un detalle importante de la renovación:** si falla, **no se borra la
cookie**. Con dos pestañas abiertas puede pasar que las dos renueven a la vez
con la misma cookie: una gana y deja una cookie nueva; la otra falla. Si esa
respuesta de error borrara la cookie, se llevaría puesta la nueva que acaba de
dejar la primera. Por eso el frontend, ante un fallo de renovación, reintenta
una vez antes de mandar al login.

**La cookie se lee a mano** (`refresh-cookie.ts`), sin la librería
`cookie-parser`. Es una sola cookie, y evita una dependencia y un problema
real: `cookie-parser` se configura en `main.ts`, que los tests no ejecutan.

**Supuesto sobre el despliegue:** todo esto asume que el frontend y la API se
ven bajo el **mismo origen**. En producción están en dominios distintos
(Vercel y Render), así que hace falta un *rewrite* en Vercel que mande
`/api/*` a Render. Sin eso la cookie sería "de terceros", y Safari las bloquea.
En desarrollo, el frontend tiene que usar el proxy de Vite por el mismo
motivo. **Pendiente de confirmar** con quien maneja Vercel.

### 8.3 Los decoradores: `src/shared/security/`

Son las marcas que cualquier controller, de cualquier módulo, le pone a sus
endpoints. No deciden nada: solo dejan una etiqueta que después lee un guard.

| Decorador | Qué declara |
|---|---|
| `@Public()` | Este endpoint se puede usar sin iniciar sesión |
| `@Roles('ADMIN', 'CASHIER')` | Solo estos roles pueden usarlo |
| `@CurrentUser()` | "Dame al usuario que hace este pedido" |

Ejemplo de uso en un controller:

```ts
@Roles('ADMIN')
@Get('admin')
admin(@CurrentUser() user: CurrentUserData) {
  return user;
}
```

`user` trae `accountId`, `role` y `employeeId` o `customerId`. Es lo que va a
usar auditoría para saber quién hizo cada operación.

**Por qué viven en `shared/` y no en `auth`:** `auth` depende de `accounts`
para el login. Si el controller de `accounts` importara `@Roles()` desde
`auth`, los dos módulos se necesitarían mutuamente. Es una de las dos
excepciones a la regla de que un módulo solo usa de otro su service (ver
`docs/ARCHITECTURE.md`).

### 8.4 El guard de autenticación: `jwt-auth.guard.ts`

Un **guard** es una pieza de Nest que se ejecuta antes del controller y decide
si el pedido pasa. Este responde a la pregunta **"¿quién sos?"**.

```ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  if (isPublic) return true;

  const request = context.switchToHttp().getRequest<...>();

  const token = bearerToken(request.headers.authorization);
  const account = token ? await this.accessTokens.verify(token) : null;
  if (!account) {
    throw new UnauthorizedException({ ..., code: UNAUTHENTICATED });
  }

  request.user = account;
  return true;
}
```

1. Si el endpoint está marcado `@Public()`, pasa sin mirar nada más.
2. Saca el token del encabezado `Authorization: Bearer <token>`.
3. Lo verifica con el mismo puerto que lo emitió.
4. Si no hay token, o es inválido, o venció: **401** con el código
   `UNAUTHENTICATED`. Ante eso el frontend renueva y reintenta.
5. Si es válido, **deja al usuario en el pedido** (`request.user`). De ahí lo
   toman `@CurrentUser()` y el guard de roles.

**No consulta la base de datos**: alcanza con verificar la firma. Por eso es
barato ejecutarlo en cada pedido, y por eso una baja tarda hasta 15 minutos en
aplicarse.

### 8.5 El guard de autorización: `roles.guard.ts`

Corre después del anterior y responde a **"¿podés hacer esto?"**.

```ts
const allowed = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, targets);
const user = context.switchToHttp().getRequest<{ user?: CurrentUserData }>().user;

if (!allowed || !user || !allowed.includes(user.role)) {
  throw new ForbiddenException({ ..., code: FORBIDDEN });
}
```

Lee los roles declarados con `@Roles()` y comprueba que el del usuario esté
entre ellos. Si no: **403** con el código `FORBIDDEN`.

**La regla más importante:** fijate la primera condición, `!allowed`. Un
endpoint que no tiene `@Roles()` ni `@Public()` **queda cerrado para todos**,
incluso para un administrador con sesión iniciada. Es a propósito: si alguien
agrega un endpoint y se olvida de declarar quién puede usarlo, falla cerrado y
se nota enseguida, en vez de quedar abierto sin que nadie lo advierta.

**401 y 403 no son lo mismo:**

| Código | Significa | Qué hace el frontend |
|---|---|---|
| 401 `UNAUTHENTICATED` | No sé quién sos (sin token, o vencido) | Renueva y reintenta; si no puede, manda al login |
| 403 `FORBIDDEN` | Sé quién sos, y no tenés permiso | Muestra "no tenés permiso"; renovar no sirve de nada |

### 8.6 Los guards protegen toda la aplicación

Los dos guards están registrados como `APP_GUARD` en `AuthModule`: **se aplican
a todos los endpoints de todos los módulos**, sin que cada controller tenga que
pedirlo. Antes de la integración no estaban activos a propósito (sin login real
nadie hubiera podido obtener un token y la API entera habría quedado
bloqueada); se activaron en el mismo paso en que el login pasó a ser real.

El resultado, probado contra la aplicación levantada:

| Pedido | Antes de la integración | Ahora |
|---|---|---|
| `GET /api/empleados` sin token | 200 | **401** `UNAUTHENTICATED` |
| `GET /api/empleados` con el token de un Cajero | 200 | **403** `FORBIDDEN` |
| `GET /api/customers` con el token de un Cajero | 200 | 200 |
| `GET /api/health` sin token | 200 | 200 (es público) |

Cada endpoint declara qué necesita con los decoradores de `src/shared/security/`:

| Controller | Marca |
|---|---|
| `health` | `@Public()` |
| `auth` | `@Public()` (los tres endpoints) |
| `customers` | `@Roles('ADMIN', 'CASHIER')` |
| `employees` | `@Roles('ADMIN')` |
| `usuarios` (cuentas) | `@Roles('ADMIN')` |

**Consecuencia para quien agregue un endpoint:** si no lo marca con `@Public()`
ni con `@Roles()`, responde 403 incluso con sesión. Es la regla "falla cerrado":
mejor que se note enseguida a que quede abierto sin querer.

### 8.7 El filtro de errores: `auth-exception.filter.ts`

Da a los errores de `auth` el mismo formato que usan los demás módulos
(`statusCode`, `error`, `message`, `path`, `timestamp`), y agrega el campo
`code` cuando el error lo trae.

Como los guards son globales, un 401 o un 403 puede aparecer en endpoints de
cualquier módulo, y cada módulo tiene su propio filtro de errores. Los de
`customers`, `employees` y `accounts` conocen el 403 y **dejan pasar el campo
`code`**; si no, el 403 saldría como `"error": "Error"` y sin código. El e2e de
permisos comprueba que eso se cumple en los tres.

---

## 9. Los tests

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

## 10. Decisiones tomadas

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
| Los errores llevan un código fijo además del mensaje | El frontend decide por el código y no depende del texto |
| El login y la renovación devuelven lo mismo | Al recargar la página, el frontend reconstruye su estado solo con la renovación |
| El email va en la respuesta pero no en el access token | Puede cambiar, y el token quedaría con un dato viejo |
| Los decoradores de seguridad viven en `src/shared/security/` | Para que `accounts` no tenga que importar `auth` (ver `docs/ARCHITECTURE.md`) |
| El refresh token viaja en una cookie `HttpOnly`, nunca en el cuerpo | El JavaScript de la página no puede leerlo, así que un script malicioso tampoco |
| El access token va en el cuerpo y el frontend lo guarda en memoria | Es el que dura poco; no se guarda en `localStorage` |
| Un endpoint sin `@Roles()` ni `@Public()` queda cerrado para todos | Si alguien se olvida de declararlo, falla cerrado y no abierto |
| El login no valida formato de email ni largo mínimo de contraseña | Un error de formato revelaría qué forma tienen las credenciales válidas |
| Un fallo de renovación no borra la cookie | Con dos pestañas, borraría la cookie nueva que dejó la otra |
| La cookie se lee a mano, sin `cookie-parser` | Evita una dependencia y una configuración en `main.ts` que los tests no ejecutan |
| Los guards se activaron para toda la aplicación recién al integrar con `accounts` | Antes de eso nadie podía iniciar sesión: activarlos habría bloqueado toda la API |
| Los guards se registran con `APP_GUARD` en `AuthModule`, primero autenticación y después roles | Cubre todos los módulos sin que cada controller lo pida, y el orden garantiza que el usuario ya esté identificado cuando se mira su rol |
| El hasher de contraseñas (`bcryptjs`) vive en `accounts` | Si estuviera en `auth`, `accounts` tendría que importar `auth`, que ya importa `accounts`: ciclo |
| La contraseña se limita a 72 bytes además de 64 caracteres | bcrypt descarta en silencio lo que pase de 72 bytes; con tildes, 64 caracteres pueden ser 128 bytes |
| `auth` traduce lo que devuelve `accounts` con un adaptador propio | Cada módulo conserva su forma de los datos; el puerto de `auth` no cambia si `accounts` cambia |
| Nombre y apellido van en la respuesta del login y la renovación, no en el token | El frontend los muestra en el encabezado; pueden cambiar. Evita crear endpoints `/me` solo para eso |
| Para clientes el nombre no viene por ahora | Leerlo desde `accounts` crearía un ciclo con `customers`; se resuelve con `GET /customers/me` cuando haga falta |
| El rol de un empleado se cambia solo desde `PATCH /empleados/:id` | Decisión del PO (2026-10-06): `Employee.role` es la fuente de verdad. "Editar usuario" queda para los datos de acceso (resetear contraseña) |
| La lista de usuarios se pide con `GET /api/usuarios`, no dentro de la respuesta de empleado | `employees` no puede conocer a `accounts`: la dependencia va en un solo sentido |

### Fuera de este sprint (deuda técnica)

- **Límite de intentos de login.** Además, con el rewrite de Vercel todas las
  peticiones llegan con la misma IP, y un límite por IP mal configurado
  bloquearía a todos.
- **Detección de reuso del refresh token** (revocar toda la sesión si llega un
  token ya usado). Con dos pestañas abiertas daría falsos positivos.
- **Cambio de contraseña por el propio usuario.**
- **Verificación del email al registrarse.**
- **Limpieza de sesiones vencidas** de la tabla.
- **Nombre del Cliente en la sesión (`/me`).** Para empleados el nombre y el
  apellido ya vienen en el login y la renovación. Para clientes no: con la
  matriz de permisos el cliente no puede consultar sus propios datos
  (`GET /customers/:id` está cerrado para él). Si la pantalla del cliente lo
  necesita, hace falta `GET /customers/me`, resuelto con `@CurrentUser()`
  (que trae `customerId`). No crea ciclos ni copias de datos. Pendiente: la
  pantalla del cliente todavía no está definida.
- **Ciclo `accounts` ↔ `customers`: decidido cómo evitarlo.** `AccountsService`
  ya depende de `CustomersService` (para chequear que el email de un empleado
  no esté registrado como cliente). Si el registro de clientes llamara a
  `accounts` desde `customers`, quedaría un ciclo. **Decisión:** el registro lo
  orquesta `accounts` (método `registerCustomer`, que crea el cliente y su
  cuenta en una sola transacción) y `customers` nunca importa `accounts`: se
  entera por eventos. Falta que lo implemente quien tiene SCRUM-160.
- **Idioma de los mensajes de error.** El del login está en español; el resto
  del backend, en inglés. A unificar con el equipo.

### Limitaciones conocidas

- **Un email, una cuenta.** Una persona que sea empleada y clienta necesita un
  email distinto para cada rol.
- **Un empleado puede quedar sin poder tener cuenta.** `customers` verifica
  que un cliente no use el email de un empleado, pero no al revés: si un
  administrador carga un empleado con el email de un cliente que ya tiene
  cuenta, el conflicto aparece recién al crearle la cuenta. Como el email del
  empleado no se edita, hay que darlo de baja y cargarlo de nuevo.
- **Sin verificación de email.** Alguien puede registrarse con un email ajeno.

---

## 11. Qué falta

**El paso E (la integración con `accounts`) está hecho.** Quedó así:

1. Adaptador de bcryptjs para las contraseñas, dentro de `accounts` (6.8).
2. Adaptador que conecta `CredentialsVerifier` con `AccountsService` (6.8).
3. `AccountsModule` registrado en `AppModule`, e importado por `AuthModule`.
4. Los dos guards registrados para toda la aplicación (8.6).
5. `@Roles('ADMIN')` en el controller de `usuarios`, y el filtro de errores de
   `accounts` con el 403 y el campo `code`.
6. `PrismaSessionRevoker` ya no existe: lo reemplazó el listener de
   `account.deactivated` (la rama `users` lo había eliminado).
7. Los e2e existentes actualizados, y el nuevo `auth-integration.e2e-spec.ts`.

**Lo que falta:**

| Paso | Qué es | Depende de |
|---|---|---|
| F | Cierre: contrato final para el frontend, criterios de aceptación en Jira, demo de la Review (bajar los plazos de sesión por variables de entorno), seed en Neon, CORS por variable de entorno, PR a `develop` | — |
| Clientes | Login de clientes: ampliar `accounts` para cuentas de cliente, y el registro (SCRUM-160) | Quien tiene SCRUM-160 |

### Pendiente con otras personas

| Con quién | Qué |
|---|---|
| Quien hizo `users` | ~~Reactivar cuenta~~: hecho (`reactivate`, con la regla de "solo si el empleado está activo") |
| Quien hizo `users` | `firstName` y `lastName` en `AuthAccountInfo` (en `verifyCredentials` y en `findActiveById`), tomados del empleado que ya carga |
| Quien hizo `users` | `code: 'LAST_ADMIN'` en los dos `ConflictException` del último administrador, y que su filtro de errores deje pasar `code` |
| Quien hizo `users` | Sacar `role` de `PATCH /api/usuarios/:id` (decisión del PO) y agregar `GET /api/usuarios` con `{ id, employeeId, active }` |
| Quien hizo `users` | ~~E2E de aceptación~~: hecho (`accounts-abmc.e2e-spec.ts`, los cuatro casos del último administrador) |
| Quien hizo `users` | Corregir en `docs/accounts-abmc-status.md` que `AuthAccountInfo` sí incluye `email`, y que `PasswordHasher` ya tiene implementación; abrir el PR de `users` a `develop`. **Aviso:** esta integración tocó cinco archivos suyos (`password.ts`, el filtro de errores, el controller, el módulo y sus specs) |
| Quien tiene SCRUM-160 | Registro de clientes con la opción X: lo orquesta `accounts` en una sola transacción, endpoint con `@Public()`, y ampliar `accounts` (rol `CUSTOMER`, `customerId`, `findByEmail`, `verifyCredentials`, `findActiveById`) para que un cliente pueda iniciar sesión |
| Frontend | `VITE_API_URL=/api`, proxy de Vite, y las reglas de la sección 8 de `docs/auth-api.md` |
| Frontend | Cerrar con ellos el contrato del nombre para clientes (hoy no viene; ver `/me` en deuda técnica) |
| Frontend | Subir el timeout de axios (hoy 8 s) por el arranque lento de Render |
| Quien maneja Vercel / Render | Confirmado por el frontend: el rewrite se puede hacer y el diseño de la cookie se mantiene. Falta crear los proyectos; con la URL de Render se agrega el `vercel.json` |
| Quien maneja Render | Cargar `NODE_ENV=production` (sin eso la cookie no sale `Secure`) y un `JWT_SECRET` propio de producción |
| Equipo | Avisar que la aplicación no arranca sin `JWT_SECRET` |
| Equipo | **Cuando esto llegue a `develop`, todos los endpoints exigen token** (antes respondían sin él). Sin el login funcionando en el frontend, las pantallas de clientes y empleados van a recibir 401 |
| Equipo | Unificar el idioma de los mensajes de error |

---

## 12. Glosario

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
| 2026-10-05 | Infraestructura completa: repositorio de sesiones, `auth.module.ts` y registro en `AppModule`. 10 tests contra la base. La aplicación ya exige `JWT_SECRET` para arrancar |
| 2026-10-05 | Casos de uso: login, renovación y cierre de sesión, con códigos de error fijos y el email en la respuesta. Listener de `account.deactivated`. Verificador de credenciales provisorio. 22 tests unitarios y 3 contra la base. Se agregan las limitaciones conocidas y los pendientes con otras personas |
| 2026-10-05 | Capa HTTP: los tres endpoints, la cookie del refresh token, los dos guards, los decoradores en `src/shared/security/` y el filtro de errores. 14 tests unitarios y 16 por HTTP. Los guards quedan sin activar para toda la aplicación hasta la integración. Se detalla el paso E |
| 2026-10-05 | Roles declarados en `customers`, `employees` y `health`; filtros de error de `customers` y `employees` con 403 y `code`; e2e de la matriz de permisos (14 tests); contrato para el frontend en `docs/auth-api.md`. Se actualizan los pendientes con otras personas |
| 2026-10-06 | Nombre y apellido en la respuesta del login y la renovación (opcionales; hoy solo empleados), sin ir dentro del token. Decisiones del PO: el rol solo se cambia desde empleados; la lista de usuarios va en `GET /api/usuarios`. Se documenta el posible ciclo `accounts` ↔ `customers` y se actualiza `docs/auth-api.md` (nombre, y sección 11 con lo acordado y pendiente). 68 tests de `auth`, 55 e2e |
| 2026-10-06 | **Integración con `accounts` (paso E).** Hasher de bcryptjs en `accounts`, adaptador `AccountsCredentialsVerifier` en `auth` (reemplaza al provisorio), `AccountsModule` en `AppModule`, guards globales con `APP_GUARD`, `@Roles('ADMIN')` en `usuarios`, filtro de `accounts` con 403 y `code`. Límite de 72 bytes en la contraseña (bcrypt descarta el resto en silencio). Los empleados ya pueden iniciar sesión; probado con la aplicación levantada y el seed. Se decide la opción X para el registro de clientes. 457 tests unitarios y 73 e2e |
