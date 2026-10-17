# CLAUDE.md — Backend de Vitto Club

Este archivo completa al [`CLAUDE.md` de la raíz](../CLAUDE.md). Leé los dos. Si algo de acá choca con el
de la raíz, preguntá.

**Stack:**
- NestJS en TypeScript con módulos ESM (`"type": "module"`).
- Prisma 7 con PostgreSQL.
- `class-validator`.
- `@nestjs/event-emitter` y `nestjs-cls` para la transacción ambiente.
- JWT.
- Jest para unitarios y e2e.

---

## 1. Fuente de verdad del backend: el contrato

**`docs/sprint-3/API_CONTRACT_SPRINT_3.md` es lo único que define qué se construye.** En particular:

- **Rutas y métodos.**
- **Body, query params y respuestas**, con los nombres exactos de los campos, sus tipos y los nulos.
- **Validaciones:** rangos, largos, formatos y mensajes en castellano.
- **Errores:** códigos HTTP y `code` de cada uno.
- **Permisos por rol:** la matriz de la §4 y las reglas por rol de cada endpoint.
- **Reglas de negocio:** las de cada endpoint y las de la §8.2.
- **Auditoría:** qué acción, qué `description` y qué filas de `details` (§3.9).
- **Modelo de datos:** §3.12 y §3.9.6.

**El prototipo no es fuente de verdad del backend.** Podés buscar en él para entender un flujo, pero ningún
dato, regla ni mensaje sale de ahí. Si el prototipo muestra algo que el contrato no tiene, **preguntá**.

**Para lo que ya existe** (Sprints 1 y 2), las fuentes son:
- `docs/sprint-3/VERIFICACION_SPRINTS_1_2.md`;
- `docs/funcionalidades/`;
- `prisma/schema.prisma`.

Si tu historia pide cambiar algo que ya existe, el cambio está en el contrato (§1 "Existentes que cambian"
y §7). Fuera de eso, lo que ya existe **no se toca**.

---

## 2. Lectura obligatoria antes de la primera tarea

| Documento | Para qué |
|---|---|
| `docs/architecture/arquitectura.md` | Cómo se organizan los módulos y qué puede depender de qué |
| `docs/decisions/001-monolito-modular-hexagonal.md` | Capas `domain` / `application` / `infrastructure` / `http` y puertos |
| `docs/decisions/002-transaccion-ambiente.md` y `docs/conceptos-transversales/transacciones-y-eventos.md` | `PrismaTransactionRunner` y eventos de dominio dentro de la transacción |
| `docs/decisions/005-registro-de-clientes-orquestado-por-accounts.md` | Por qué `customers` no importa `accounts`, y cómo se resuelve con eventos |
| `docs/conceptos-transversales/errores-y-codigos.md` | Formato de error, `code`, filtros de excepciones por módulo |
| `docs/conceptos-transversales/roles-y-permisos.md` | `@Roles`, `@Public`, `@CurrentUser`, guards globales |
| `docs/testing/estrategia.md` | Unitarios, e2e y base de tests |
| `docs/database/migraciones.md` y `docs/database/prisma.md` | Cómo se crean las migraciones |

---

## 3. Estructura de un módulo (copiá la de `src/customers/` o `src/loyalty/`)

```text
src/<modulo>/
├── domain/            # entidades y reglas puras, sin Nest ni Prisma
│   ├── errors/        # errores de dominio (llevan el `code` del contrato)
│   └── port/          # interfaces de repositorio
├── application/       # servicios: orquestan la transacción, el dominio y la auditoría
├── infrastructure/    # repositorios con Prisma (usan el client de PrismaTransactionRunner)
├── http/              # controllers, dto/, filters/
└── <modulo>.module.ts
```

- **Imports:** son ESM con extensión `.js` (`import { X } from './x.js'`), como el resto del backend.
- **Tests unitarios:** `*.spec.ts`, al lado del archivo que prueban.
- **Tests e2e:** en `test/<tema>.e2e-spec.ts`.

**Módulos nuevos del Sprint 3** (contrato §8.4):
- `consumptions`
- `points`

Las dependencias van **en un solo sentido**:

```text
consumptions ──> points ──> loyalty
```

- `points` **no** importa `consumptions`.
- `customers` **no** importa `accounts`: se comunican por eventos.

Si necesitás romper esa dirección, frená y preguntá.

---

## 4. Paso a paso de una historia de backend

1. **Contrato.**
   - Leé las secciones que indica la historia en `HISTORIAS_SPRINT_3.md`.
   - Anotá cada endpoint, cada campo y cada fila de la tabla de errores.
   - Todo eso va al Plan previo.
2. **Schema y migración.**
   - **Solo si tu historia es dueña** de esa parte del modelo (ver la sección 1 de `HISTORIAS_SPRINT_3.md`).
   - Columnas, tipos, `CHECK` e índices: exactamente los de §3.12 y §3.9.6.
   - Una migración por historia, con nombre descriptivo:
     `npx prisma migrate dev --name sprint3_us21_consumptions`.
   - Antes de crearla, revisá si otra persona ya tiene una migración abierta sobre las mismas tablas.
     Si la tiene, **preguntá**.
3. **Dominio.** Reglas puras y sus tests unitarios: cálculo de puntos, FIFO, deuda, nivel, plazo de 24 h.
4. **Servicio de aplicación.** Todo lo que el contrato dice "en una transacción" va dentro de
   `PrismaTransactionRunner`. Eso incluye:
   - los movimientos de puntos;
   - el saldo;
   - la auditoría;
   - los eventos de dominio.

   Si algo falla, no queda nada escrito.
5. **DTO.**
   - Usá `class-validator`, con las reglas y los mensajes **del contrato**.
   - Los campos que el contrato dice que **no** se envían no van en el DTO. `forbidNonWhitelisted` los
     rechaza con `400`.
6. **Controller.**
   - Usá `@Roles(...)` exactamente según la matriz de la §4.
   - El usuario sale de `@CurrentUser()`, **nunca** del body.
   - Las rutas `/customers/me…` se declaran **antes** que `/customers/:id`.
7. **Filtro de errores del módulo.**
   - Mapea cada error de dominio a su HTTP y a su `code`.
   - Deja pasar el `403` y su `code`.
   - Usa el formato de la §5.
8. **Auditoría.**
   - `AuditService.capture` va en la misma transacción.
   - Usa el `AuditAction` y el `AuditModule` exactos, la `description`, `affectedCustomer`, `operationCode`
     y las filas de `details` **en el orden** de la §3.9.3.
   - El actor es el empleado o `SYSTEM`. **Nunca un cliente.**
9. **Tests e2e** (sección 6).
10. **Verificación** (sección 7).

---

## 5. Reglas del backend que no se negocian

1. **El cálculo es del backend:**
   - puntos, bonificación, saldo, nivel;
   - `canVoid`, `voidableUntil`;
   - `isFirstConsumption`, `balanceBefore`, `balanceAfter`, `levelUp`.

   Si el frontend lo necesita, viaja en la respuesta.
2. **Las reglas por rol se validan en el backend.** No alcanza con que la pantalla esconda un botón.
   Algunos ejemplos:
   - Cajero: `last24h` forzado a `true`.
   - Cajero: solo anula consumos propios dentro de las 24 h.
   - Cajero: no edita el documento (`403 FORBIDDEN_FIELD`).
   - Consumos: solo el Administrador.
3. **Las respuestas tienen exactamente la forma del contrato:**
   - nombres en camelCase y nulos donde el contrato dice "Sí";
   - fechas en ISO UTC; las fechas sin hora, en `YYYY-MM-DD`;
   - paginación `{ items, total, page, limit }`.

   No agregues ni saques campos.
4. **Los mensajes de error van en castellano**, con el texto del contrato cuando lo cita.
5. **La contraseña actual incorrecta devuelve `400 CURRENT_PASSWORD_INCORRECT`, no `401`.** Así el
   interceptor del frontend no intenta renovar la sesión.
6. **Movimientos y auditoría son solo inserción.** Los triggers rechazan `UPDATE`, `DELETE` y `TRUNCATE`.
   Nunca los desactives fuera de la migración que indica la §3.9.6.
7. **Concurrencia.** Toda operación que mueve puntos toma `SELECT … FOR UPDATE` sobre la fila de
   `customer_points` del cliente (§3.12).
8. **Snapshots.** El consumo guarda la equivalencia y la versión vigentes. El lote guarda su vencimiento.
   Un cambio posterior de configuración **no** los modifica (RF-014).
9. **Fechas de filtro.** `fromDate` y `toDate` son días completos en hora de Argentina (UTC−03:00).
10. **Nada de `any`** ni de `// @ts-ignore`. Tampoco desactives reglas de lint.
11. **No toques `frontend/`.**
12. **Lo que la historia no pide no se hace.** Ejemplo: si estás en US-21, no programes la anulación.

---

## 6. Tests

**Unitarios** (`npm test`, no usan base de datos). Uno por regla de dominio, con los ejemplos numéricos del
contrato. Por ejemplo:
- $1.550 con $1.000 = 10 pts → 15 pts;
- 15% de bonificación sobre 500 → 75.

**End to end** (`npm run test:e2e`). Necesitan Docker y la base `vitto_club_test`; ver
`docs/testing/estrategia.md`. Por cada endpoint de la historia:

| Qué probar | Cómo |
|---|---|
| Camino feliz | Status y **forma completa** de la respuesta, campo por campo |
| Cada fila de la tabla de errores del contrato | Status **y** `code` |
| Cada rol | Administrador, Cajero, Cliente y sin token, según la matriz de la §4 |
| Reglas por rol | Por ejemplo: Cajero con consumo ajeno, consumo propio > 24 h, `last24h=false` forzado |
| Efectos en la base | Saldo, `lifetimePoints`, lotes, movimientos con `balanceAfter` |
| Auditoría | Se escribió con la acción, la `description` y los `details` correctos. **No** se escribió cuando el contrato dice que no se audita |
| Rollback | Si un paso falla (por ejemplo, la auditoría), no queda nada escrito |

La lista mínima de e2e del sprint está en el contrato, §8.4. Los casos de cada historia están en
`HISTORIAS_SPRINT_3.md`.

---

## 7. Verificar (desde `backend/`)

```bash
npm run lint        # oxlint
npm test            # unitarios
npm run test:e2e    # e2e (Docker + base vitto_club_test)
npm run build       # compila
```

- Si no podés correr los e2e (por ejemplo, porque no hay Docker), **decilo en el resumen**. No los des
  por buenos.
- Si falla un test que no es de tu historia, no lo arregles: informalo.

---

## 8. Documentación del repo

**No edites `docs/` salvo que te lo pidan.** En el resumen, listá qué documentos quedaron desactualizados
por tu cambio. Por ejemplo:
- `docs/funcionalidades/clientes.md`;
- `docs/conceptos-transversales/errores-y-codigos.md` (para los códigos nuevos).
