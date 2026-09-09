# Prisma en este proyecto

Documentación del setup de Prisma para `backend/`: qué se rompió, por qué, y cómo quedó
la configuración final funcionando.

## Qué pasó (historial del problema)

1. Al correr `npx prisma init`, esta versión del CLI (`prisma@8.0.0-rc.13`, la que
   `npm` entrega como `latest` mientras Prisma 8 está en release candidate) ya no
   scaffoldea `schema.prisma`. Ese comando ahora solo configura "agent skills".
2. Se probó `npx prisma orm init`, que sí generó un schema — pero para
   **"Prisma Next"**, un motor experimental completamente distinto
   (`@prisma/orm-postgres`, `@prisma/cli-engine`) con su propia sintaxis
   (`TimestamptzString`, `temporal.updatedAtString()`, sin bloques
   `datasource`/`generator`, cliente propio en `prisma/db.ts` con API
   `db.orm.public.User.where(...).first()`).
3. El resto del proyecto (`prisma/seed.ts`, `@prisma/client` en `package.json`)
   ya estaba escrito para el **Prisma clásico** (`PrismaClient`, `datasource db`,
   `prisma.modelo.metodo()`). Los dos sistemas conviviendo causaban los errores
   (`datasource` en rojo, `contract.json` inexistente, etc.).
4. Se decidió **abandonar "Prisma Next"** (todavía experimental) y volver a
   **Prisma estable (`7.10.0`)**, que es la última versión no-RC (`dist-tag prev`
   en npm) y coincide con la versión de `@prisma/client` que ya estaba en el
   proyecto.
5. Prisma 7 estable trajo su propio cambio importante: **ya no se permite
   `url = env("DATABASE_URL")` dentro del bloque `datasource`**. La URL de
   conexión para migraciones se mueve a `prisma.config.ts`, y el `PrismaClient`
   en tiempo de ejecución necesita un **driver adapter** explícito
   (`@prisma/adapter-pg`) en vez de leer la URL solo. Ver
   https://pris.ly/d/config-datasource y https://pris.ly/d/prisma7-client-config.

## Estado final

### Paquetes (`package.json`)

- `prisma@^7.10.0` (CLI, devDependency) — antes `^8.0.0-rc.13`.
- `@prisma/client@^7.10.0` (ya estaba).
- `@prisma/adapter-pg` + `pg` (dependencies) — driver adapter de Postgres,
  obligatorio en Prisma 7 para instanciar `PrismaClient`.
- `@types/pg` (devDependency).
- Se quitaron `@prisma/orm-postgres` y `@prisma/cli-engine` (Prisma Next, sin uso).
- `postinstall` pasó de `prisma skills sync` a `prisma generate` (regenera el
  cliente cada vez que se instalan dependencias).
- Se agregó el bloque `"prisma": { "seed": "ts-node prisma/seed.ts" }` para que
  `npx prisma db seed` sepa qué correr.

### `prisma.config.ts`

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
```

La URL de conexión que usan `migrate`/`db seed`/`studio` vive acá, no en el
schema.

### `prisma/schema.prisma`

Sintaxis clásica de Prisma (PSL). El bloque `datasource` ya no lleva `url`:

```prisma
datasource db {
  provider = "postgresql"
}
```

Modelos actuales: `Empleado` y `Cliente` (dominio del negocio, con baja lógica
vía `activo`/`fechaBaja`, `@updatedAt`, índices y `@@map` a `snake_case`).

### Cliente de Prisma en tiempo de ejecución

Como la URL ya no viaja con el `PrismaClient`, hay que pasarle un **adapter**
construido a partir de `DATABASE_URL`:

```ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});
```

Esto se aplicó en dos lugares:

- **`prisma/seed.ts`** — el script de seed standalone.
- **`src/prisma/prisma.service.ts`** — nuevo `PrismaService` para NestJS
  (extiende `PrismaClient`, implementa `OnModuleInit`/`OnModuleDestroy` para
  conectar/desconectar junto con el ciclo de vida de Nest).

### Integración con NestJS

Se crearon (no existían antes):

- `src/prisma/prisma.service.ts` — el cliente inyectable.
- `src/prisma/prisma.module.ts` — módulo `@Global()` que exporta `PrismaService`,
  para no tener que importarlo en cada módulo que lo necesite.
- Se agregó `PrismaModule` a los `imports` de `src/app.module.ts`.

Para usar Prisma en cualquier servicio/controller de Nest a partir de ahora:

```ts
constructor(private readonly prisma: PrismaService) {}
```

### Archivos eliminados (leftovers de "Prisma Next")

- `prisma/db.ts` — cliente del motor experimental, importaba `contract.json`/
  `contract.d.ts` que nunca llegaron a existir para el schema real.
- `prisma/schema.json`, `prisma/schema.d.ts` — artefactos generados por
  `prisma contract emit`, del modelo `User`/`Post` de ejemplo (obsoletos).
- `prisma-next.md` — guía de onboarding de Prisma Next, ya no aplica.

### Migraciones

Se generó y aplicó la migración inicial contra la base de Docker
(`vitto_db`, puerto `5433`):

```
prisma/migrations/20260908232732_init/migration.sql
```

Crea las tablas `empleados` y `clientes` con sus enums, índices y el unique
compuesto de `Cliente` (`documento_unico`).

### Seed

`prisma/seed.ts` insertaba empleados sin `email`, pero el modelo `Empleado`
lo exige (`email String @db.VarChar(150)`, sin `?`). Se agregó un email a cada
empleado de prueba para que el seed compile y corra.

## Comandos de uso diario

Con el contenedor de Postgres levantado (`docker compose up -d` desde la raíz
del repo) y parado en `backend/`:

```bash
npx prisma generate       # Regenera el cliente tras cambiar el schema
npx prisma migrate dev    # Crea y aplica una migración nueva en desarrollo
npx prisma db seed        # Corre prisma/seed.ts
npx prisma studio         # UI para explorar los datos
```

## A tener en cuenta a futuro

- **No correr `npx prisma orm init`** en este proyecto: es el instalador de
  "Prisma Next" y vuelve a mezclar los dos sistemas. Si en algún momento se
  quiere migrar de verdad a Prisma Next, hay que reescribir schema, config,
  cliente y todas las queries a la vez — no como un paso incremental.
- El CLI (`npx prisma --version`) va a seguir avisando que hay una versión
  mayor disponible (8.x). Es intencional quedarse en `7.10.0` hasta que Prisma
  Next salga de RC y el equipo decida migrar a propósito.
- Al agregar modelos nuevos: correr `npx prisma migrate dev --name <nombre>`
  para generar la migración, y `npx prisma generate` para que el tipado del
  cliente se actualice (el `postinstall` ya lo hace automáticamente después de
  `npm install`).
