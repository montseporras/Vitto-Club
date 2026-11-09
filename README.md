# Vitto Club

Sistema de fidelización de clientes de La Vitto. Monorepo con dos aplicaciones
que se despliegan por separado:

- **`backend/`**: API REST en NestJS + Prisma + PostgreSQL. Monolito modular
  con arquitectura hexagonal por módulo.
- **`frontend/`**: SPA en React + Vite + TypeScript + Tailwind, organizada por
  feature. Puede funcionar contra mocks (MSW) o contra el backend real.

## Estado del proyecto

Al 09/11/2026 (`develop`, fin del Sprint 4). El detalle, con lo que falta, está en
[`docs/seguimiento/estado-actual.md`](docs/seguimiento/estado-actual.md).

| Sprint | Qué se construyó (backend y frontend) | Referencia |
|---|---|---|
| 1 | ABMC de empleados y de clientes | [`docs/funcionalidades/`](docs/funcionalidades/) |
| 2 | Login, sesiones y guards; cuentas y usuarios de empleados; registro de clientes; configuración versionada de puntos | [`docs/funcionalidades/`](docs/funcionalidades/) |
| 3 | Consumos (registrar, anular, consultar), puntos (saldo, nivel, ajustes, movimientos, vencimiento diario), niveles, auditoría, Clientes del Administrador, vista del Cliente (inicio, historial, perfil) y cambios de contraseña | [`docs/sprint-3/API_CONTRACT_SPRINT_3.md`](docs/sprint-3/API_CONTRACT_SPRINT_3.md) |
| 4 | Recompensas (crear, editar, activar/desactivar, eliminar, disponibilidad automática, catálogo) y canjes (confirmar, usar, rechazar, cancelar, vencer, consultar) | [`docs/sprint-4/API_CONTRACT_SPRINT_4.md`](docs/sprint-4/API_CONTRACT_SPRINT_4.md) |
| 5 | Último sprint: misiones, fotos, notificaciones, estadísticas y lo que quede | (en preparación) |

Verificación del 09/11/2026: `backend/ npm test` → 111 suites, 1543 tests, pasan todos. Los e2e no se
corrieron en esta revisión.

## Documentación

Índice completo en [`docs/README.md`](docs/README.md).

| Documento | Contenido |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | Cómo levantar base de datos, backend y frontend en local, variables de entorno y problemas frecuentes |
| [`docs/CONTRIBUTING.MD`](./docs/CONTRIBUTING.MD) | Forma de trabajo: ramas, commits, Pull Requests y revisión |
| [`docs/architecture/arquitectura.md`](docs/architecture/arquitectura.md) | Arquitectura del backend (hexagonal por módulo) y del frontend |
| [`docs/architecture/estructura-frontend.md`](docs/architecture/estructura-frontend.md) | Estructura del frontend: capas, carpetas, pantallas y estilos |
| [`docs/funcionalidades/clientes.md`](docs/funcionalidades/clientes.md) | Contrato de la API de clientes |
| [`docs/funcionalidades/empleados.md`](docs/funcionalidades/empleados.md) | Contrato de la API de empleados |
| [`docs/funcionalidades/configuracion-de-puntos.md`](docs/funcionalidades/configuracion-de-puntos.md) | Contrato de la API de configuración de puntos |
| [`docs/sprint-3/`](docs/sprint-3/), [`docs/sprint-4/`](docs/sprint-4/) | Contratos de API, historias y cierres de cada sprint (fuentes de verdad) |
| [`docs/database/modelo-de-datos.md`](docs/database/modelo-de-datos.md) | Tablas, enums, relaciones y restricciones |
| [`docs/conceptos-transversales/roles-y-permisos.md`](docs/conceptos-transversales/roles-y-permisos.md) | Qué puede hacer cada rol, endpoint por endpoint |
| [`docs/seguimiento/decisiones-de-implementacion.md`](docs/seguimiento/decisiones-de-implementacion.md) | Decisiones que se tomaron al programar cada historia |
| [`docs/database/prisma.md`](docs/database/prisma.md) | Cómo quedó configurado Prisma y comandos de uso diario |
| [`CLAUDE.md`](CLAUDE.md) y [`como-usar-claude.md`](como-usar-claude.md) | Cómo se trabaja con Claude: reglas y cómo pedirle una historia |

## Estructura del repositorio

```
Vitto-Club/
├─ docker-compose.yml   # PostgreSQL (+ pgAdmin opcional) para desarrollo local
├─ .gitignore           # Ignora node_modules, dist, .env, etc. a nivel repo
├─ docs/                # Documentación del proyecto (ver tabla de arriba)
├─ backend/             # API NestJS
│  ├─ src/
│  │  ├─ app.module.ts       # Módulo raíz: Config, Schedule, Prisma, Health y los módulos de negocio
│  │  ├─ main.ts             # Bootstrap: prefijo /api, ValidationPipe, CORS
│  │  ├─ employees/, customers/, accounts/, auth/, loyalty/   # Sprints 1 y 2
│  │  ├─ consumptions/, points/, audit/                       # Sprint 3
│  │  ├─ rewards/, redemptions/                               # Sprint 4
│  │  ├─ expire-points.ts, expire-rewards.ts, expire-redemptions.ts  # procesos a demanda
│  │  ├─ architecture.spec.ts # reglas de dependencias entre módulos (Sprint 4)
│  │  ├─ shared/             # contratos transversales: eventos, seguridad, hora de Argentina
│  │  ├─ prisma/             # PrismaService + PrismaTransactionRunner (transacción ambiente)
│  │  └─ health/             # GET /api/health -> hace SELECT 1 contra la DB
│  ├─ prisma/
│  │  ├─ schema.prisma        # Modelo de datos (ver docs/database/modelo-de-datos.md)
│  │  ├─ migrations/          # Migraciones SQL versionadas
│  │  └─ seed.ts              # Administrador inicial y, con SEED_DEMO_DATA, empleados y clientes de prueba
│  ├─ test/                  # Tests e2e
│  ├─ prisma.config.ts       # URL de conexión para migrate/seed/studio (Prisma 7)
│  ├─ .env.example           # Plantilla de variables de entorno
│  └─ CLAUDE.md              # Reglas del backend para Claude
└─ frontend/            # SPA React + Vite
   ├─ src/
   │  ├─ app/                # Arranque, router, layouts por rol
   │  ├─ features/           # Un módulo por Epic (caja, clientes, consumos, recompensas, canjes, ...)
   │  ├─ shared/             # Cliente HTTP, componentes de UI, utilidades
   │  ├─ domain/             # Vocabulario de negocio compartido
   │  ├─ mocks/              # Handlers de MSW (mismas rutas que el backend)
   │  └─ styles/             # Tokens de marca y recetas de estilo
   └─ .env.example           # Plantilla de .env.local (mocks o backend real)
```

El detalle de cada carpeta y las reglas para sumar módulos nuevos están en
[`docs/architecture/arquitectura.md`](docs/architecture/arquitectura.md) y
[`docs/architecture/estructura-frontend.md`](docs/architecture/estructura-frontend.md).

## Qué hace cada componente clave

- **`docker-compose.yml`** (raíz): levanta un contenedor PostgreSQL 16
  (`vitto_db`) publicado en el puerto **5433** del host (para no chocar con un
  Postgres local en 5432), con usuario `vitto`, password `vitto_dev` y base
  `vitto_club`. Incluye un healthcheck y, opcionalmente
  (`docker compose --profile tools up -d`), pgAdmin en `:5050`.
- **`ConfigModule.forRoot({ isGlobal: true })`**: carga variables de entorno
  desde `.env` y las hace disponibles en toda la app.
- **`PrismaModule` / `PrismaService`**: módulo global que expone un único
  `PrismaClient` (con `@prisma/adapter-pg`, requerido por Prisma 7) para
  inyectar en cualquier servicio/controlador vía
  `constructor(private readonly prisma: PrismaService) {}`.
- **`ValidationPipe` global** (`main.ts`): valida y transforma automáticamente
  los DTOs de entrada; rechaza con 400 cualquier campo no declarado.
- **CORS**: habilitado solo para `http://localhost:5173` (el puerto por
  defecto de Vite, donde corre el frontend).
- **Prefijo global `/api`**: todas las rutas quedan bajo `/api/...` (por
  ejemplo, el health check es `/api/health`, no `/health`).
- **`GET /api/health`**: hace un `SELECT 1` real contra la base para confirmar
  que la cadena NestJS → Prisma → PostgreSQL está viva.

## Historial

### Revisión de la infraestructura base (2026-09-08)

Se levantó el contenedor de Docker, se aplicaron las migraciones, se corrió el
seed y se probó `GET /api/health` end-to-end. Resultado: la infraestructura
funciona. Durante la revisión se corrigieron estos problemas:

1. **`backend/.env` desincronizado con `docker-compose.yml`.** Traía el
   placeholder genérico (`user:password@localhost:5432/mydb`) en vez de las
   credenciales reales del contenedor (puerto **5433**, usuario `vitto`,
   password `vitto_dev`, base `vitto_club`). Con ese valor, Nest y Prisma no
   podían conectar a la base levantada por Docker. Corregido.
2. **`backend/.env.example` con el mismo placeholder genérico**, sin relación
   con el `docker-compose.yml` real del repo. Se actualizó para que reflejar
   los valores reales, de forma que cualquiera que clone el repo pueda copiar
   `.env.example` a `.env` y conectar sin adivinar credenciales.
3. **Tests rotos (unitarios y e2e) por un error de TypeScript** (`TS5011: The
common source directory... 'rootDir' must be explicitly set`), causado por
   `declaration: true` en `tsconfig.json` sin un `rootDir` explícito cuando
   `src/` y `test/` conviven bajo el mismo tsconfig. Se agregó
   `"rootDir": "."` a `backend/tsconfig.json`, que es compatible con
   `tsconfig.build.json` (que ya sobreescribe `rootDir` a `./src`) y con
   `jest.config.ts` (que ya usa `rootDir: '.'`).
4. **`backend/.gitattributes` obsoleto**: declaraba como `linguist-generated`
   archivos (`prisma/contract.json`, `prisma/schema.json`, etc.) de un intento
   abortado de migrar a "Prisma Next" (ver historial en `docs/database/prisma.md`).
   Esos archivos ya fueron eliminados; el `.gitattributes` no tenía función y
   se quitó.
5. **`backend/README.md`** contenía solo el boilerplate por defecto de
   `nest new` (sin mencionar Docker, Prisma ni el estado real del proyecto).
   Se actualizó para reflejar el setup real.

No se tocó nada de `PrismaService`, `PrismaModule`, `main.ts` ni
`docker-compose.yml`: esas piezas ya estaban bien resueltas (incluyendo la
decisión, documentada en `PRISMA.md`, de fijar Prisma en `7.10.0` en vez de
la RC de Prisma 8, y de usar `@prisma/adapter-pg` porque Prisma 7 ya no
admite `url` dentro del bloque `datasource`).

### Actualización 2026-09-20: modelos traducidos al inglés

Se renombraron los modelos de dominio y sus campos, de español a inglés:

- `Cliente` → `Customer` (tabla `clientes` → `customers`), con campos
  `nombre/apellido/telefono/tipoDocumento/numeroDocumento/fechaNacimiento` →
  `firstName/lastName/phone/documentType/documentNumber/dateOfBirth`.
- `Empleado` → `Employee` (tabla `empleados` → `employees`), con
  `nombre/apellido/telefono/rol` → `firstName/lastName/phone/role`.
- Enums: `TipoDocumento` → `DocumentType` (`PASAPORTE` → `PASSPORT`, `DNI` se
  mantiene) y `EmployeeRole` → `EmployeeRole` (`ADMINISTRADOR` → `ADMIN`,
  `CAJERO` → `CASHIER`).
- `prisma/seed.ts` se actualizó para usar los nombres nuevos.
- Se generó la migración `20260920211053_translate_models_to_english`, que
  dropea las tablas viejas y crea las nuevas (no fue un rename in-place por
  lo extenso del cambio de nombres — los datos que había eran solo del seed
  de prueba, sin impacto).

## Pendiente

- No hay CI configurado (no hay `.github/workflows` ni equivalente).

## Cómo levantar el proyecto (para un nuevo integrante del equipo)

Requisitos: Node.js 22 (ver `backend/.nvmrc`; con nvm alcanza con `nvm use`
parado en `backend/`), Docker Desktop, npm.

```bash
# 1. Clonar el repo
git clone <url-del-repo>
cd Vitto-Club

# 2. Levantar PostgreSQL con Docker
docker compose up -d db

# 3. Configurar el backend
cd backend
npm install
cp .env.example .env   # los valores por defecto ya coinciden con el docker-compose

# 4. Aplicar las migraciones y cargar datos de prueba
npx prisma migrate deploy
npx prisma db seed

# 5. Levantar la API en modo desarrollo
npm run start:dev
```

Verificación: `GET http://localhost:3000/api/health` debe responder
`{"status":"ok","db":"conectada","timestamp":"..."}`.

Comandos día a día de Prisma (generar cliente, nuevas migraciones, Studio):
ver [`docs/database/prisma.md`](docs/database/prisma.md).

### Frontend: mocks o backend real

El frontend (`frontend/`, React + Vite) puede funcionar de dos formas, según
la variable `VITE_API_MOCKS`:

- **Con mocks (por defecto)**: MSW simula la API con datos de prueba
  (`frontend/src/mocks`). No hace falta levantar el backend ni la base.
- **Conectado al backend real**: las llamadas van a
  `http://localhost:3000/api` (por ejemplo, empleados en `/api/empleados`).

Los mocks se mantienen en el repo aunque exista el backend, para poder
volver a usarlos cuando haga falta.

Para conectar el front al backend:

```bash
# 1. Tener el backend levantado (pasos 1 a 5 de arriba)

# 2. Instalar dependencias del frontend
cd frontend
npm install

# 3. Crear a mano el archivo frontend/.env.local (desde el editor) con esta línea:
#      VITE_API_MOCKS=false
#    Evitar `echo ... > .env.local` en PowerShell 5.1: guarda el archivo en
#    UTF-16 y Vite puede no leer la variable.

# 4. Levantar el frontend (si ya estaba corriendo, cortarlo y volver a levantarlo)
npm run dev
```

Después, en el navegador, recargar con **Ctrl+Shift+R** para que no quede
activo el service worker de los mocks.

`.env.local` está en el `.gitignore`: **cada integrante tiene que crear el
suyo**. Para volver a los mocks, cambiar la variable a `true` (o borrar el
archivo) y reiniciar `npm run dev`. Ver también
[`frontend/.env.example`](./frontend/.env.example).

Verificación: en `http://localhost:5173/admin`, abrir Configuración (⚙) →
**Empleados**. La tabla debe mostrar los empleados de la base y,
en la pestaña Network del navegador, tiene que aparecer
`GET http://localhost:3000/api/empleados` con respuesta 200.
