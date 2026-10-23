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
- **Documentos relacionados:** `docs/architecture/arquitectura.md` (reglas de la
  arquitectura) y `docs/conceptos-transversales/transacciones-y-eventos.md` (transacciones y eventos).

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
`docs/conceptos-transversales/transacciones-y-eventos.md`).

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
`docs/conceptos-transversales/transacciones-y-eventos.md`).

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
Set-Cookie: refresh_token=...; Path=/api; Expires=...; HttpOnly; SameSite=Lax

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
| `Path=/api` | Viaja a la API, no al resto del sitio | Antes era `/api/auth`. PERFIL lo amplió porque `PATCH /api/mi-cuenta/password` necesita saber cuál es la sesión actual (la de esta cookie) para cerrar las otras y dejarla abierta. Al emitirla también se borra la cookie con el path viejo, para que no la tape |
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
`docs/architecture/arquitectura.md`).

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

---

## Historial de este documento

| Fecha | Cambio |
|---|---|
| 2026-10-05 | Versión inicial: dominio (sesión y puertos) y primera parte de la infraestructura (configuración, refresh token y JWT). 31 tests |
| 2026-10-05 | Infraestructura completa: repositorio de sesiones, `auth.module.ts` y registro en `AppModule`. 10 tests contra la base. La aplicación ya exige `JWT_SECRET` para arrancar |
| 2026-10-05 | Casos de uso: login, renovación y cierre de sesión, con códigos de error fijos y el email en la respuesta. Listener de `account.deactivated`. Verificador de credenciales provisorio. 22 tests unitarios y 3 contra la base. Se agregan las limitaciones conocidas y los pendientes con otras personas |
| 2026-10-05 | Capa HTTP: los tres endpoints, la cookie del refresh token, los dos guards, los decoradores en `src/shared/security/` y el filtro de errores. 14 tests unitarios y 16 por HTTP. Los guards quedan sin activar para toda la aplicación hasta la integración. Se detalla el paso E |
| 2026-10-05 | Roles declarados en `customers`, `employees` y `health`; filtros de error de `customers` y `employees` con 403 y `code`; e2e de la matriz de permisos (14 tests); contrato para el frontend en `docs/funcionalidades/autenticacion.md`. Se actualizan los pendientes con otras personas |
| 2026-10-06 | Nombre y apellido en la respuesta del login y la renovación (opcionales; hoy solo empleados), sin ir dentro del token. Decisiones del PO: el rol solo se cambia desde empleados; la lista de usuarios va en `GET /api/usuarios`. Se documenta el posible ciclo `accounts` ↔ `customers` y se actualiza `docs/funcionalidades/autenticacion.md` (nombre, y sección 11 con lo acordado y pendiente). 68 tests de `auth`, 55 e2e |
| 2026-10-06 | **Integración con `accounts` (paso E).** Hasher de bcryptjs en `accounts`, adaptador `AccountsCredentialsVerifier` en `auth` (reemplaza al provisorio), `AccountsModule` en `AppModule`, guards globales con `APP_GUARD`, `@Roles('ADMIN')` en `usuarios`, filtro de `accounts` con 403 y `code`. Límite de 72 bytes en la contraseña (bcrypt descarta el resto en silencio). Los empleados ya pueden iniciar sesión; probado con la aplicación levantada y el seed. Se decide la opción X para el registro de clientes. 457 tests unitarios y 73 e2e |
| 2026-10-20 | PERFIL (cambio de contraseña): la cookie del refresh token pasa a `Path=/api` (y se borra la de `/api/auth`) y `readCookie` se mueve a `src/shared/security/refresh-cookie.ts`. Nuevo `SessionRepository.revokeAllForAccountExcept`, `AuthService.revokeOtherSessionsOfAccount` y `AccountPasswordChangedListener` (evento `account.password-changed`): al cambiar la contraseña se cierran las otras sesiones y la actual sigue abierta. Detalle en `docs/sprint-3/CAMBIOS_PROPUESTOS_AL_CONTRATO_PERFIL.md` |
