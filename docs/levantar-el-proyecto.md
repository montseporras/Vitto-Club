# Levantar el proyecto en local (paso a paso)

Guía para correr **base de datos + backend + frontend** en tu máquina y probar el login de
punta a punta. Los comandos son para **PowerShell**, parada en la raíz del repo, salvo que se
indique otra carpeta.

> Si solo querés ver el frontend sin backend, andá directo a la sección [4.1](#41-solo-frontend-con-mocks).

---

## 0. Requisitos

- **Node.js 22 LTS o superior** (probado con Node 24).
- **Docker Desktop**, abierto y con el motor corriendo.
- **Puertos libres:** `3000` (backend), `5173` (frontend) y `5433` (base de datos). Ver
  [la sección 6](#6-problemas-frecuentes) si alguno está ocupado.

---

## 1. Base de datos (Docker)

```powershell
docker compose up -d db
```

Levanta PostgreSQL 16 en el contenedor `vitto_db`, publicado en el puerto **5433** del host.

| Dato | Valor |
|---|---|
| Usuario | `vitto` |
| Contraseña | `vitto_dev` |
| Base | `vitto_club` |
| Puerto | `5433` |

Para confirmar que está sana:

```powershell
docker ps --filter name=vitto_db --format "table {{.Names}}\t{{.Status}}"
```

Tiene que decir `(healthy)`.

---

## 2. Backend

### 2.1 Variables de entorno

```powershell
Copy-Item backend/.env.example backend/.env
```

Abrí `backend/.env` y completá **estas** (el resto ya trae valores que sirven):

| Variable | Qué poner |
|---|---|
| `JWT_SECRET` | Un secreto de **32 caracteres o más**. Para generar uno: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SEED_ADMIN_EMAIL` | El email del administrador inicial (el que vas a usar para entrar) |
| `SEED_ADMIN_PASSWORD` | Su contraseña (8 a 64 caracteres, máximo 72 bytes) |
| `SEED_ADMIN_FIRST_NAME`, `SEED_ADMIN_LAST_NAME`, `SEED_ADMIN_PHONE` | Datos del administrador |
| `SEED_DEMO_DATA` | `true` si querés cuentas de prueba (ver 2.3) |
| `SEED_DEMO_PASSWORD` | Contraseña común de las cuentas de prueba. Obligatoria si `SEED_DEMO_DATA=true` |

**El `.env` no se commitea nunca** (tiene secretos y ya está en `.gitignore`). Tampoco lo pegues en chats ni PRs.

Las otras variables (`DATABASE_URL`, `PORT`, `BCRYPT_COST`, `JWT_ACCESS_TTL_SECONDS` y las
`SESSION_*`) ya tienen un valor correcto en el `.env.example`. Las `SESSION_*` están en segundos;
para una demo conviene bajarlas (por ejemplo `JWT_ACCESS_TTL_SECONDS=60`) y ver cómo se
renueva la sesión.

### 2.2 Instalar, migrar y sembrar

```powershell
cd backend
npm install
npx prisma migrate deploy
npm run db:audit:migrate:develop
npx prisma db seed
```

- `migrate deploy` aplica las migraciones existentes. Es lo seguro para levantar el proyecto.
  (`migrate dev` es para **crear** una migración nueva cuando cambiás el `schema.prisma`).
- `db:audit:migrate:develop` crea la tabla de auditoría por separado y solo permite
  `APP_ENV=develop`; requiere `APP_ENV=develop` en `backend/.env` y `DATABASE_URL`
  apuntando a la base de desarrollo. No se incluye en las migraciones estándar.
- `db seed` crea el administrador inicial y, si `SEED_DEMO_DATA=true`, las cuentas de prueba.
  Se puede repetir sin duplicar datos.

### 2.3 Cuentas que crea el seed

| Cuenta | Email | Contraseña | Se crea |
|---|---|---|---|
| Administrador inicial | `SEED_ADMIN_EMAIL` | `SEED_ADMIN_PASSWORD` | Siempre |
| Administradora de prueba | `ana.gomez@vitto.club` | `SEED_DEMO_PASSWORD` | Con `SEED_DEMO_DATA=true` |
| Cajero de prueba | `bruno.perez@vitto.club` | `SEED_DEMO_PASSWORD` | Con `SEED_DEMO_DATA=true` |
| Cliente de prueba | `lucia@example.com` | `SEED_DEMO_PASSWORD` | Con `SEED_DEMO_DATA=true` |

Para ver qué cuentas hay en tu base:

```powershell
docker compose exec db psql -U vitto -d vitto_club -c "select email, role, is_active from accounts order by id;"
```

### 2.4 Arrancar

```powershell
npm run start:dev
```

Esperá a ver `Nest application successfully started` **sin** un error `EADDRINUSE` después.
Para comprobarlo: http://localhost:3000/api/health debe responder OK.

---

## 3. Frontend

En **otra terminal**:

```powershell
cd frontend
npm install
npm run dev
```

Tiene que decir `Local: http://localhost:5173/`. Si dice `5174`, el 5173 está ocupado
(ver [sección 6](#6-problemas-frecuentes)): el backend solo acepta pedidos del 5173.

> `npm install` suele modificar `frontend/package-lock.json` y
> `frontend/public/mockServiceWorker.js`. **No los commitees**: antes de hacer `git add`,
> revisá con `git status` y dejá afuera lo que no tocaste a propósito.

### 3.1 Mocks o backend real

El frontend puede funcionar de dos maneras. Se elige con `frontend/.env.local` (archivo
personal, ignorado por git; si no existe, creálo):

| Modo | `frontend/.env.local` | Qué usa |
|---|---|---|
| Mocks (por defecto) | sin archivo, o `VITE_API_MOCKS=true` | Datos simulados (MSW). **No hace falta el backend** |
| Backend real | `VITE_API_MOCKS=false` | El backend de la sección 2 |

Cada vez que cambies ese archivo: reiniciá `npm run dev` y recargá el navegador con
**Ctrl+Shift+R**.

Para la integración de la pantalla de auditoría (endpoint, permisos, filtros y respuesta),
ver [docs/auditoria-api.md](./auditoria-api.md).

No definas `VITE_API_URL`: por defecto es `/api` (relativa), y es lo que hace que la cookie de
la sesión funcione.

### 3.2 El proxy de Vite

Con el backend real, el frontend le habla a `/api/...` y **Vite lo reenvía** a
`http://localhost:3000`. Eso tiene que estar en `frontend/vite.config.ts`:

```ts
export default defineConfig({
  // ...
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
```

Si tu `vite.config.ts` no tiene el bloque `server`, el login contra el backend real no
funciona. Después de editarlo, reiniciá `npm run dev`.

---

## 4. Probar el login

### 4.1 Solo frontend, con mocks

Sin backend y sin `.env.local`: entrá a http://localhost:5173/login con una de estas cuentas de
prueba (la pantalla no las muestra: copiá y pegá el usuario y la contraseña).

| Rol | Usuario (mail) | Contraseña |
|---|---|---|
| Cliente | `lucia@example.com` | `vitto2026` |
| Cajero | `bruno.perez@vitto.club` | `vitto2026` |
| Administrador | `ana.gomez@vitto.club` | `vitto2026` |

Están definidas en `frontend/src/mocks/handlers/auth.handlers.ts` y solo existen con los mocks.

### 4.2 Frontend + backend reales

Con `VITE_API_MOCKS=false` en `frontend/.env.local`, las secciones 1 a 3 corriendo, y abrí
**http://localhost:5173/login**.

| Prueba | Resultado esperado |
|---|---|
| Entrar con la cuenta del administrador | Entra; el encabezado muestra "Nombre Apellido · Rol" |
| Entrar como Cajero y como Cliente (cuentas de prueba) | Cada uno va a la pantalla de su rol |
| Recargar la página (F5) con la sesión abierta | Sigue logueada (se renueva con la cookie) |
| Cerrar sesión | Vuelve al login |
| Contraseña incorrecta | Mensaje de error y el campo se limpia |
| Email que no existe | El **mismo** mensaje (no revela qué falló) |

Para confirmar que le pega al backend real: F12 → pestaña **Network** → el pedido `login`
debe salir como `localhost:5173/api/auth/login` con estado `200`.

---

## 5. Tests

Desde `backend`:

```powershell
npm test                 # unitarios, no necesitan base de datos
```

Los **e2e** necesitan Docker y una base de pruebas, que se crea **una sola vez**:

```powershell
docker exec vitto_db createdb -U vitto vitto_club_test
npm run test:e2e
```

`DATABASE_URL_TEST` ya viene en el `.env.example` y apunta a esa base. El nombre tiene que
llevar `test`: si no, los e2e se niegan a correr (para no borrar datos de desarrollo).

---

## 6. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| El front dice "No se pudo iniciar sesión" y el proxy muestra `socket hang up` o 502 | El backend no está corriendo, o **otro programa ocupa el puerto 3000** | Mirá la terminal del backend. Si dice `EADDRINUSE`, ver la fila siguiente |
| `EADDRINUSE: address already in use :::3000` (o el front se va al 5174) | Otro proceso o contenedor (por ejemplo de otro proyecto) usa el puerto | Ver quién lo usa: `docker ps` y `Get-NetTCPConnection -LocalPort 3000 -State Listen`. Frená el contenedor ajeno con `docker stop <nombre>` (apaga, no borra datos) |
| El front arrancó en `5174` | El `5173` está ocupado | Liberá el 5173 y reiniciá el front. El CORS del backend solo acepta `localhost:5173` |
| `"vite" no se reconoce como un comando` | Falta instalar | `npm install` dentro de `frontend` |
| Backend: `Can't reach database server` (P1001) | Docker apagado o la base no está levantada | Abrí Docker Desktop y `docker compose up -d db` |
| Backend: error por `JWT_SECRET` | Falta o es muy corto | 32 caracteres o más en `backend/.env` |
| Backend: tablas inexistentes | Base sin migrar | `npx prisma migrate deploy` en `backend` |
| Login con datos "de mocks" aunque levantaste el backend | `VITE_API_MOCKS` no es `false` | `frontend/.env.local` con `VITE_API_MOCKS=false`, reiniciar y Ctrl+Shift+R |
| Cambiaste un `.env` y no pasa nada | Las variables se leen al arrancar | Reiniciá el backend (o el front, si fue `.env.local`) |
| `Contraseña incorrecta` con la cuenta de demo | La base no tiene datos de demo | `SEED_DEMO_DATA=true`, `SEED_DEMO_PASSWORD=...` en `backend/.env` y `npx prisma db seed` |

### Empezar la base de cero

Borra **todos** los datos locales de Vitto Club. Solo desarrollo:

```powershell
docker compose down -v
docker compose up -d db
cd backend
npx prisma migrate deploy
npx prisma db seed
```

---

## 7. Más información

- Contrato HTTP del login: [`auth-api.md`](./auth-api.md)
- Cómo funciona la autenticación: [`autenticacion.md`](./autenticacion.md)
- Estructura del frontend: [`FRONTEND-STRUCTURE.md`](./FRONTEND-STRUCTURE.md)
- Forma de trabajo (ramas, commits, PRs): [`CONTRIBUTING.MD`](./CONTRIBUTING.MD)
- Prisma: [`../backend/PRISMA.md`](../backend/PRISMA.md)
