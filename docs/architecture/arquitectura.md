# Arquitectura

Este documento deja por escrito una decisión de arquitectura que hoy **ya está
implementada en el código**, para que cualquiera que sume una feature nueva
sepa qué forma tiene que seguir y por qué.

## Decisión

- **Backend**: monolito modular con arquitectura hexagonal (puertos y adaptadores) por módulo.
- **Frontend**: monolito tradicional, organizado por feature, sin capas hexagonales.

Backend y frontend son deploys separados (un mismo repo, dos aplicaciones) y
no comparten el mismo estilo de arquitectura interna a propósito: la
complejidad de reglas de negocio (validaciones de dominio, invariantes,
persistencia) vive en el backend, así que ahí se justifica invertir en
puertos/adaptadores. El frontend es una SPA que consume una API ya validada,
así que agregarle las mismas capas sería sobre-ingeniería.

## Backend: monolito modular hexagonal

Es **un solo proceso Nest** (un solo deploy), dividido en **módulos por
contexto de negocio**. Cada módulo es independiente y, puertas adentro, sigue
puertos y adaptadores.

| Módulo | Sprint | Qué tiene |
|---|---|---|
| `employees` | 1 | ABMC de empleados (`/empleados`) |
| `customers` | 1 | Clientes (`/customers`), perfil del Cliente (`/customers/me`), ajuste de puntos (`/customers/:id/ajustes-de-puntos`) |
| `loyalty` | 2 | Configuración versionada del programa: equivalencia, vigencia, bonificación y niveles (`/loyalty/configuration/*`) |
| `accounts` | 2 | Cuentas y contraseñas (`/usuarios`, `/auth/register`, `/mi-cuenta/password`) |
| `auth` | 2 | Login, renovación y cierre de sesión; guards globales |
| `consumptions` | 3 | Consumos: vista previa, registro, anulación y consultas (`/consumos`, `/customers/:id/consumos`, `/customers/me/consumos`) |
| `points` | 3 | Lotes, movimientos, saldo, nivel, ajustes, vencimiento diario y `canjear` (`/customers/:id/movimientos`, `/customers/me/movimientos`, `/movimientos-de-puntos`) |
| `audit` | 3 | Registro y consulta de la auditoría (`/auditoria`) |
| `rewards` | 4 | Catálogo de recompensas, estados, disponibilidad y proceso diario de vencidas (`/recompensas`) |
| `redemptions` | 4 | Canjes: confirmar, usar, rechazar, cancelar, vencer y consultar (`/canjes`, `/customers/:id/canjes`, `/customers/me/canjes`), y el catálogo del Cliente (`/customers/me/recompensas`) |
| `prisma`, `health`, `shared` | — | Transversales, sin dominio (regla 4) |

### Dependencias entre módulos

Los imports entre módulos van **en un solo sentido**. Sale de los `imports` de cada `*.module.ts`
(09/11/2026):

```text
accounts     ──> employees, customers, audit
auth         ──> accounts
customers    ──> employees, points, audit
consumptions ──> customers, employees, loyalty, points, audit
points       ──> audit
rewards      ──> audit
redemptions  ──> rewards, points, employees, audit
loyalty      ──> audit
employees    ──> audit
audit        ──> (ninguno)
```

- `audit` no importa ningún módulo de negocio: por eso cualquiera lo puede importar sin armar un ciclo.
- `points` no importa `consumptions`, `customers`, `rewards` ni `redemptions`. Cuando necesita el nombre o
  el documento de un cliente (para la auditoría del vencimiento), los lee de la tabla `customers` en su
  repositorio, por Prisma, sin importar el módulo.
- `rewards` no importa `redemptions`. Para rechazar los canjes al desactivar o eliminar una recompensa,
  publica `reward.deactivated` / `reward.deleted` y `redemptions` escucha. Cuando necesita
  `confirmedCount`, lo lee de la tabla `redemptions` en su repositorio (US-34).
- `customers` usa `PointsService` para el saldo y el nivel del listado (decisión S3-18; cierra la D-14).
- `customers` no importa `accounts`: el alta, la baja, el cambio de email y el de documento llegan a
  `accounts` por eventos ([ADR 005](../decisions/005-registro-de-clientes-orquestado-por-accounts.md)).
- `consumptions` y `redemptions` importan `employees` solo para el nombre del empleado del token.
- `backend/src/architecture.spec.ts` verifica las reglas del Sprint 4 (CA-B4.7 y CA-B4.8): `points` no
  importa `rewards` ni `redemptions`, `rewards` no importa `redemptions`, y no existe ningún método de
  reintegro.

Si una historia necesita romper esa dirección, se frena y se pregunta.

### Estructura de un módulo

```
backend/src/<modulo>/
  domain/            # Entidad + reglas de negocio + puertos (abstract class)
    <entidad>.ts
    errors/
    port/
      <entidad>.repository.ts   # puerto: abstract class, sin implementación
  application/        # Casos de uso (services). Dependen solo del puerto.
    <modulo>.service.ts
  infrastructure/      # Adaptador de salida: implementa el puerto con Prisma
    <modulo>.repository.ts
  http/                # Adaptador de entrada: REST
    <modulo>.controller.ts
    dto/
    filters/
  <modulo>.module.ts   # Une todo: liga el puerto a su implementación (DI)
```

Ejemplo real de la inversión de dependencia, en `<modulo>.module.ts`:

```ts
providers: [
  CustomersService,
  { provide: CustomerRepository, useClass: CustomerPrismaRepository },
];
```

`CustomersService` (application) solo conoce `CustomerRepository`, que es una
`abstract class` (el puerto) definida en `domain/port/`. Nest resuelve en
runtime qué implementación (`infrastructure/`) inyectar. Así, el dominio no
depende de Prisma ni de HTTP.

El módulo `loyalty` aplica el mismo patrón a la configuración global de
puntos: `PointsEquivalence`, `PointsValidity` y `FirstConsumptionBonus` validan
las invariantes del dominio y el default de RF-010.
`LoyaltyConfigurationRepository` define el puerto y
`LoyaltyPrismaRepository` implementa la persistencia versionada del snapshot
completo, con una nueva versión por actualización y una transacción serializada
por advisory lock de PostgreSQL. Los endpoints seccionales existentes se
mantienen como patches compatibles y también crean versiones. Una migración
importa los valores singleton existentes en la versión inicial; un índice
único parcial garantiza como máximo una versión activa. El contrato REST y las
limitaciones respecto al snapshot futuro de movimientos están en
[`configuracion-de-puntos.md`](../funcionalidades/configuracion-de-puntos.md). Los
endpoints están cerrados con `@Roles('ADMIN')` y los guards globales de `auth`.

### Reglas para módulos nuevos

1. **Un módulo nuevo = las cuatro carpetas** (`domain`, `application`,
   `infrastructure`, `http`) + su `<modulo>.module.ts`. No saltear capas
   "porque es chico": la estructura es la que mantiene el dominio aislado de
   Prisma y de HTTP.
2. **Ningún módulo importa el `domain` de otro módulo.** Si un módulo necesita
   datos de otro, se expone a través del service exportado por su
   `*.module.ts` (nunca su repositorio ni sus entidades internas), se modela
   como un evento de dominio o, si solo hay que leer, se lee la tabla desde el
   propio repositorio (como `points` con `customers`). Nunca un `import`
   directo entre `domain/` de dos módulos. Las dependencias permitidas son las
   de la tabla de arriba.
3. Es una decisión consciente que cada módulo tenga su propia copia de
   utilidades de dominio pequeñas (por ejemplo, `domain/mail.ts` y
   `domain/errors/domain.error.ts` existen duplicados en `customers` y en
   `employees`). Es el costo de que los módulos no se conozcan entre sí. **No
   "arreglar" esto moviéndolo a un paquete compartido** sin discutirlo antes:
   eso reintroduce acoplamiento entre módulos de dominio.
4. Código realmente transversal y sin lógica de negocio (conexión a la base,
   health check) sí puede vivir fuera de un módulo de dominio — ver
   `backend/src/prisma/` y `backend/src/health/` como ejemplo. Eso no rompe la
   regla anterior porque no es dominio de ningún contexto de negocio.

### Operaciones que cruzan módulos

Dos mecanismos transversales, sin lógica de negocio (regla 4), para que una
operación que toca dos módulos sea atómica sin que esos módulos se conozcan
en los dos sentidos.

**Transacción ambiente** (`backend/src/prisma/prisma-transaction-runner.ts`).
Lo que se ejecuta dentro de `run(fn)` comparte una sola transacción de base de
datos, aunque pase por repositorios de módulos distintos:

- En `application/`, el caso de uso la abre a través de un puerto propio de su
  módulo (una `abstract class` con `run`), ligado a `PrismaTransactionRunner`
  en el `*.module.ts`. Nunca importa la librería ni Prisma.
- En `infrastructure/`, los repositorios que participan usan `client` de
  `PrismaTransactionRunner` en lugar de `PrismaService`.
- Lo lento (por ejemplo, hashear una contraseña) se hace antes de abrir la
  transacción.

**Eventos de dominio** (`backend/src/shared/events/domain-events.ts`). Es la
forma de que un módulo reaccione a lo que pasa en otro sin una dependencia
circular. `forwardRef` no se usa.

- Los nombres y los datos de los eventos se definen **solo** en ese archivo.
  Es un contrato compartido: quien publica y quien escucha importan de ahí,
  nunca del `domain/` del otro módulo. Los datos son primitivos.
- Se publica con `await eventEmitter.emitAsync(NOMBRE, datos)`, dentro de la
  transacción y después de escribir lo propio.
- Se escucha con `@OnEvent(NOMBRE, { suppressErrors: false })`. Sin esa opción
  la librería atrapa el error del listener y la operación sigue como si nada.
- No se activan las opciones `async` ni `nextTick` del emisor.

Con esas reglas el listener corre dentro de la transacción de quien publica:
si tira un error, se deshace todo. Ejemplo: degradar al último administrador
desde `PATCH /empleados/:id` falla entero, porque `accounts` escucha
`employee.role-changed`, detecta que no quedaría ningún administrador
disponible y tira.

Un listener también puede **devolver un valor** a quien publica: `emitAsync`
devuelve un arreglo con lo que devolvió cada listener. Lo usan la baja de un
cliente y la desactivación o eliminación de una recompensa para saber cuántos
canjes rechazó `redemptions` (`{ rejectedRedemptions }`). El detalle está en
[transacciones y eventos](../conceptos-transversales/transacciones-y-eventos.md#73-el-contrato-domain-eventsts).

**Procesos automáticos.** Tres crons con `@nestjs/schedule` (`ScheduleModule`
en `AppModule`): vencimiento de puntos (`points`, 00:05), recompensas vencidas
(`rewards`, 00:05 y al iniciar) y canjes vencidos (`redemptions`, cada 5
minutos y al iniciar). Cada uno se apaga con su variable de entorno y se corre
a demanda con un script de `backend/src/expire-*.ts`. Ver [SETUP](../SETUP.md).

### Lo único que los módulos comparten: `src/shared/`

La regla 2 dice que un módulo usa de otro solo el service que ese otro
exporta. Hay **tres excepciones**, y las tres viven en `backend/src/shared/`
para que no sean el `domain/` de nadie:

| Carpeta | Qué contiene | Quién lo usa |
|---|---|---|
| `shared/events/` | Los nombres y los datos de los eventos de dominio | El módulo que publica y el que escucha |
| `shared/security/` | Los decoradores `@Roles()`, `@Public()` y `@CurrentUser()`, el tipo del usuario autenticado y las opciones de la cookie `refresh_token` | Los controllers de cualquier módulo |
| `shared/time/` | `toArgentinaDateString`: la función única de "hoy en Argentina" (UTC−03:00). BASE-4 la movió desde `points/domain` | `points`, `rewards`, `redemptions` |

Las tres cumplen lo mismo que pide la regla 4: son transversales y no tienen
lógica de negocio. Son **contratos**: declaran nombres, datos y marcas, no
deciden nada.

- Los **guards** (`JwtAuthGuard`, `RolesGuard`), que sí tienen lógica, se
  quedan en `auth`. Los decoradores solo dejan una marca en el endpoint; quien
  la lee y decide es el guard.
- Por eso los decoradores no viven en `auth`: `auth` depende de `accounts`
  para el login, y si el controller de `accounts` importara `@Roles()` desde
  `auth`, los dos módulos se necesitarían mutuamente.

Lo que **no** va en `shared/`: entidades, reglas de negocio, services ni
repositorios. Si algo de eso parece necesitar compartirse, es una señal de que
hay que exponerlo por el service del módulo dueño o modelarlo como un evento.

## Frontend: monolito tradicional

Una sola SPA (React + Vite), organizada por feature, sin capas
domain/application/infrastructure ni puertos/adaptadores:

```
frontend/src/features/<feature>/
  api/         # llamadas HTTP (axios) + hooks de React Query
  components/  # componentes de esa feature
  pages/       # pantallas
  schemas/     # validación de formularios (zod)
  types/       # tipos calcados del contrato de la API
  lib/         # utilidades propias de la feature (opcional)
  index.ts     # lo único que otra feature puede importar
```

Además de `features/`, `frontend/src/domain/` tiene los valores y etiquetas
compartidos del contrato (`roles.ts`, `documents.ts`, `levels.ts`,
`statuses.ts`, `redemption-statuses.ts`, `expiration.ts`). No es una capa de
dominio: son tipos y textos, sin reglas de negocio. El detalle de carpetas y
componentes está en [estructura del frontend](./estructura-frontend.md).

Los componentes consumen la API directamente a través de los hooks de
`api/` (ver `frontend/src/features/cashier/`). No hay una capa de dominio propia
del frontend ni abstracciones de puerto: la validación de negocio "real" vive
en el backend, y el frontend solo la duplica de forma liviana en los
`schemas/` de Zod para dar feedback inmediato en el formulario.

### Reglas para features nuevas

1. Una feature nueva es una carpeta bajo `features/`, con las subcarpetas de
   arriba que necesite (no todas son obligatorias si la feature no las usa).
2. No introducir capas hexagonales en el frontend (no crear `domain/`,
   `application/`, `infrastructure/` ahí). Si una feature empieza a necesitar
   eso, es una señal de que esa lógica debería vivir en el backend.
3. Los `types/` del frontend son un espejo de los DTOs de respuesta del
   backend correspondiente (ver cómo `frontend/src/features/cashier/types/customer.ts`
   calca a `CustomerResponseDto`) — al cambiar un DTO del backend, hay que
   actualizar el tipo espejado en el frontend.

## Por qué documentarlo

Esta arquitectura ya existe en el código de todos los módulos, pero
no se puede derivar mirando uno solo: hace falta verlos juntos para
confirmar que el aislamiento (regla 2) es intencional y no casualidad. Este
documento es la referencia para no romperla sin querer al revisar código o al
sumar gente nueva al equipo.
