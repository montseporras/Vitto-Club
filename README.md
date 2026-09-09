# Vitto Club

Sistema de fidelización de clientes. Este repositorio contiene, por ahora, el
backend (NestJS + Prisma + PostgreSQL). El frontend todavía no se agregó.

## Estado del proyecto

Infraestructura base (NestJS + Prisma + PostgreSQL vía Docker) revisada y
validada de punta a punta el 2026-09-08. Los modelos de dominio (`Empleado`,
`Cliente`) y las historias de usuario del Sprint 1 (ABMC) **todavía no están
implementados** — el alcance actual es solo la base técnica.

## Estructura del repositorio

```
Vitto-Club/
├─ docker-compose.yml   # PostgreSQL (+ pgAdmin opcional) para desarrollo local
├─ .gitignore           # Ignora node_modules, dist, .env, etc. a nivel repo
└─ backend/             # API NestJS
   ├─ src/
   │  ├─ app.module.ts       # Módulo raíz: ConfigModule, PrismaModule, HealthModule
   │  ├─ main.ts             # Bootstrap: prefijo /api, ValidationPipe, CORS
   │  ├─ prisma/
   │  │  ├─ prisma.service.ts  # Cliente Prisma inyectable (driver adapter pg)
   │  │  └─ prisma.module.ts   # Módulo @Global() que exporta PrismaService
   │  └─ health/
   │     └─ health.controller.ts # GET /api/health -> hace SELECT 1 contra la DB
   ├─ prisma/
   │  ├─ schema.prisma        # Modelos Empleado y Cliente
   │  ├─ migrations/          # Migraciones SQL versionadas
   │  └─ seed.ts               # Datos de prueba (3 empleados, 2 clientes)
   ├─ prisma.config.ts        # URL de conexión para migrate/seed/studio (Prisma 7)
   ├─ .env.example             # Plantilla de variables de entorno
   └─ PRISMA.md                 # Historial detallado de cómo quedó configurado Prisma
```

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
  defecto de Vite), pensado para el futuro frontend.
- **Prefijo global `/api`**: todas las rutas quedan bajo `/api/...` (por
  ejemplo, el health check es `/api/health`, no `/health`).
- **`GET /api/health`**: hace un `SELECT 1` real contra la base para confirmar
  que la cadena NestJS → Prisma → PostgreSQL está viva.

## Qué se revisó y qué se corrigió

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
   abortado de migrar a "Prisma Next" (ver historial en `backend/PRISMA.md`).
   Esos archivos ya fueron eliminados; el `.gitattributes` no tenía función y
   se quitó.
5. **`backend/README.md`** contenía solo el boilerplate por defecto de
   `nest new` (sin mencionar Docker, Prisma ni el estado real del proyecto).
   Se actualizó para reflejar el setup real.

No se tocó nada de `schema.prisma`, `PrismaService`, `PrismaModule`,
`main.ts` ni `docker-compose.yml`: esas piezas ya estaban bien resueltas
(incluyendo la decisión, documentada en `PRISMA.md`, de fijar Prisma en
`7.10.0` en vez de la RC de Prisma 8, y de usar `@prisma/adapter-pg` porque
Prisma 7 ya no admite `url` dentro del bloque `datasource`).

## Pendiente (fuera del alcance de esta revisión)

- **Jest + ESM**: correr `npm test` o `npm run test:e2e` todavía falla
  (`Must use import to load ES Module: .../@nestjs/testing/index.js`). El
  proyecto usa `"type": "module"` (ESM) pero la configuración de Jest/ts-jest
  compila los tests a CommonJS por defecto, y `@nestjs/testing` es un paquete
  ESM-only. Los dos tests existentes (`app.controller.spec.ts`,
  `app.e2e-spec.ts`) son el "Hello World" por defecto de Nest, sin relación
  con `Empleado`/`Cliente`, así que no bloquean el Sprint 1, pero conviene
  resolverlo (config de Jest en modo ESM: `NODE_OPTIONS=--experimental-vm-modules`,
  `extensionsToTreatAsEsm`, `ts-jest` con `useESM: true`, etc.) antes de
  escribir tests reales.
- No hay CI configurado (no hay `.github/workflows` ni equivalente).
- No hay frontend todavía en el repo.
- Los modelos `Empleado`/`Cliente` y las HU de ABMC del Sprint 1 quedan para
  la próxima etapa.

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
ver [`backend/PRISMA.md`](./backend/PRISMA.md).
