# Spike: transacción ambiente con `@nestjs-cls/transactional`

- **Fecha:** 2026-10-05
- **Rama:** `spike/transacciones` (sale de `feature/login`)
- **Estado:** el spike pasó los tres criterios. Falta que el equipo decida si se adopta.

## Qué se quería saber

Hay operaciones que escriben en dos módulos y tienen que ser atómicas. El caso
que lo dispara es el registro de un cliente: se crea el `Customer` (módulo
`customers`) y su `Account` (módulo `auth`), y si falla la cuenta no puede
quedar el cliente creado. Lo mismo vale para la baja de un empleado o cliente
(desactivar la persona y su cuenta) y para el cambio de rol.

Hoy cada repositorio usa `PrismaService` directo, así que no hay forma de que
dos módulos compartan una transacción sin pasarse el cliente de Prisma por
parámetro, y eso filtraría Prisma a la capa `application/`.

La idea es una **transacción ambiente**: el caso de uso abre la transacción, y
los repositorios que se ejecutan adentro la usan sin recibir nada por
parámetro. El cliente de la transacción viaja en un `AsyncLocalStorage` de
Node.

La pregunta del spike: **¿la librería `@nestjs-cls/transactional` funciona con
nuestro stack (Nest 12, Prisma 7 con adapter de `pg`, proyecto ESM, Jest en
ESM), o hay que escribir el mecanismo a mano?**

## Criterios y resultado

| # | Criterio | Resultado |
|---|---|---|
| 1 | Instala sin `--force` ni `--legacy-peer-deps` | Pasa |
| 2 | La app compila y levanta con los imports ESM del proyecto | Pasa |
| 3 | El rollback funciona con el `PrismaService` actual | Pasa |

## Qué se hizo, paso a paso

### 1. Compatibilidad declarada

Antes de instalar se consultaron los `peerDependencies` con `npm view`:

| Paquete | Versión | Acepta |
|---|---|---|
| `nestjs-cls` | 7.0.1 | Nest `>= 10 < 13` |
| `@nestjs-cls/transactional` | 4.0.1 | Nest `>= 10 < 13` |
| `@nestjs-cls/transactional-adapter-prisma` | 2.0.1 | Prisma `> 4 < 9` |

El proyecto usa Nest 12 y Prisma 7.10: entran en los tres rangos.

### 2. Instalación

```bash
npm install nestjs-cls @nestjs-cls/transactional @nestjs-cls/transactional-adapter-prisma
```

Instaló sin flags y sin conflictos de dependencias. Los tres paquetes publican
build ESM y CommonJS (campo `exports` con `import` y `require`), así que el
proyecto ESM toma la versión ESM.

### 3. Registro en la aplicación

Único cambio en `src/`: en `backend/src/app.module.ts` se agregó `ClsModule`
con el plugin transaccional, apuntando al `PrismaService` que ya existe.

- `global: true`: disponible en todos los módulos sin importarlo en cada uno.
- `middleware: { mount: true }`: abre el contexto en cada request HTTP.
- `prismaInjectionToken: PrismaService`: la librería usa nuestro cliente tal
  cual está; no hubo que modificar `PrismaService` ni `PrismaModule`.

No se tocó ningún repositorio ni service existente.

### 4. Tests

Archivo nuevo: `backend/test/transactions.e2e-spec.ts`. Corre contra la base
de tests (`vitto_club_test`) y levanta el `AppModule` completo. Usa la API de
la librería directamente: `txHost.withTransaction(fn)` para abrir la
transacción y `txHost.tx` como cliente.

| Test | Qué demuestra |
|---|---|
| Commit | Dos escrituras dentro de la transacción quedan guardadas al terminar |
| Rollback | Una escritura seguida de un error no deja nada en la base |
| Anidado | Una transacción dentro de otra se suma a la de afuera; si la de afuera falla después, se deshace también lo de adentro |
| Aislamiento | Dos transacciones en paralelo no comparten cliente: una falla y la otra persiste completa |
| Sin transacción | Fuera de una transacción, `txHost.tx` es el cliente normal y escribe directo |
| Visibilidad | Lo escrito adentro no se ve por otra conexión hasta el commit |

El último test es la prueba de que hay una transacción real de Postgres y no
solo escrituras sueltas que casualmente se borran.

### 5. Verificaciones corridas

| Comando | Resultado |
|---|---|
| `npm run test:e2e` | 8 de 8 (los 6 nuevos y los 2 de health) |
| `npm test` | 229 de 229 |
| `npm run build` | compila |
| App levantada desde `dist/` | `GET /api/health` y `GET /api/empleados` responden bien con el middleware de CLS montado |
| `npm run lint` | no reportó nada |

## Lo que el spike no probó

- **El decorador `@Transactional()`.** Solo se probó `txHost.withTransaction`.
- **Repositorios reales participando.** Los tests escriben con `txHost.tx`
  directo. Ningún repositorio de `customers` o `employees` usa todavía el
  cliente de la transacción.
- **El caso de `customers.repository.ts`**, que usa `prisma.$transaction([...])`
  (forma de array). El cliente de una transacción no tiene `$transaction`, así
  que esa línea hay que reescribirla cuando ese repositorio participe.
- **Neon.** Todo corrió contra el Postgres local de Docker.
- **Transacciones largas.** Prisma corta las transacciones interactivas a los
  5 segundos por defecto. Regla a respetar: el hash de la contraseña se
  calcula antes de abrir la transacción.

## Decisión pendiente para el equipo

La librería funciona. Lo que hay que decidir es cómo se usa desde
`application/`, porque la arquitectura dice que esa capa depende solo de
puertos.

| | Decorador `@Transactional()` de la librería | Puerto propio sobre la librería |
|---|---|---|
| Cómo se ve en el caso de uso | Un decorador en el método | Se inyecta un puerto y se llama `run(fn)` |
| Dependencia en `application/` | Importa de `@nestjs-cls/transactional` | Ninguna externa: solo el puerto del módulo |
| Código extra | Nada | Un puerto chico por módulo y un adaptador en `src/prisma/` |
| Cambiar de librería más adelante | Hay que tocar cada caso de uso | Se toca solo el adaptador |

**Recomendación:** puerto propio, con la librería como implementación. Respeta
la regla de capas y deja la librería encerrada en `src/prisma/`. En
`infrastructure/` los repositorios sí pueden usar el cliente de la librería
directamente, porque esa capa ya depende de Prisma.

## Si se adopta

1. Pasar a `feature/login` los tres paquetes y el registro en `app.module.ts`.
2. Definir el puerto y su adaptador en `src/prisma/`.
3. Convertir los tests del spike para que usen el puerto en vez de `txHost`.
4. Los repositorios de `auth` nacen usando el cliente de la transacción. Los de
   `customers` y `employees` se adaptan cuando llegue su flujo.

## Archivos del spike

| Archivo | Cambio |
|---|---|
| `backend/package.json`, `backend/package-lock.json` | Tres dependencias nuevas |
| `backend/src/app.module.ts` | Registro de `ClsModule` con el plugin transaccional |
| `backend/test/transactions.e2e-spec.ts` | Nuevo: los 6 tests |
| `docs/spike-transacciones.md` | Este documento |
