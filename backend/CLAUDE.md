# CLAUDE.md — Backend de Vitto Club

Este archivo completa al [`CLAUDE.md` de la raíz](../CLAUDE.md). Leé los dos. Si algo de acá choca con el
de la raíz, preguntá.

**Stack:**
- NestJS en TypeScript con módulos ESM (`"type": "module"`).
- Prisma 7 con PostgreSQL.
- `class-validator`.
- `@nestjs/event-emitter` y `nestjs-cls` para la transacción ambiente.
- `@nestjs/schedule` para los procesos automáticos.
- JWT.
- Jest para unitarios y e2e.
- **Sprint 5 (autorizadas):** `resend` (correo), `pdfkit` (reporte PDF) y `cloudinary` (imágenes).

---

## 1. Fuente de verdad del backend: el contrato

**`docs/sprint-5/API_CONTRACT_SPRINT_5.md` (v1) es lo único que define qué se construye en este sprint.** En
particular:

- **Rutas y métodos** (§1), incluidas las que se eliminan (`GET /movimientos-de-puntos`).
- **Body, query params y respuestas**, con los nombres exactos de los campos, sus tipos y los nulos.
- **Validaciones:** rangos, largos, formatos y mensajes en castellano.
- **Errores:** códigos HTTP y `code` de cada uno (§5, con la lista de todos los `code` del sistema).
- **Permisos por rol:** la matriz completa de la §4 (Sprints 1 a 5) y las reglas por rol de cada endpoint.
- **Reglas de negocio:** las de cada endpoint y las de la §8.2.
- **Auditoría:** qué acción, qué `description` y qué filas de `details` (§3.14).
- **Modelo de datos:** §3.15.
- **Configuración general** (CORS, correo, imágenes, variables): §4.

Los contratos anteriores siguen valiendo para lo que ya existe y para las convenciones que el del Sprint 5 da
por sabidas:
- `docs/sprint-4/API_CONTRACT_SPRINT_4.md`: recompensas y canjes. Lo que quedó pendiente del Sprint 4 está en
  `docs/sprint-5/CIERRE_SPRINT_4.md` (lo resuelve ARRASTRE-S4).
- `docs/sprint-3/API_CONTRACT_SPRINT_3.md`: formato de error, paginado, fechas, transacción ambiente y reglas
  de auditoría (auditoría en §3.9, modelo en §3.12 y §3.9.6, matriz en §4). Lo que quedó pendiente del
  Sprint 3 está en `docs/sprint-4/CIERRE_SPRINT_3.md`.

**El prototipo no es fuente de verdad del backend.** Podés buscar en él para entender un flujo, pero ningún
dato, regla ni mensaje sale de ahí. Si el prototipo muestra algo que el contrato no tiene, **preguntá**.

**Para lo que ya existe** (Sprints 1 y 2), las fuentes son:
- `docs/sprint-3/VERIFICACION_SPRINTS_1_2.md`;
- `docs/funcionalidades/`;
- `prisma/schema.prisma`.

Si tu historia pide cambiar algo que ya existe, el cambio está en el contrato (§1 "Existentes que cambian" y
"Existentes que se eliminan", §3.13 y §7). Fuera de eso, lo que ya existe **no se toca**.

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
| `docs/seguimiento/actualizacion-docs-base5.md` | Qué documentos cambian cuando se mergea BASE-5 (lo aplica la rama de BASE-5) |

---

## 3. Estructura de un módulo (copiá la de `src/rewards/` o `src/customers/`)

```text
src/<modulo>/
├── domain/            # entidades y reglas puras, sin Nest ni Prisma
│   ├── errors/        # errores de dominio (llevan el `code` del contrato)
│   └── port/          # interfaces de repositorio y de servicios externos
├── application/       # servicios: orquestan la transacción, el dominio y la auditoría
├── infrastructure/    # repositorios con Prisma (usan el client de PrismaTransactionRunner) y adaptadores
├── http/              # controllers, dto/, filters/
└── <modulo>.module.ts
```

- **Imports:** son ESM con extensión `.js` (`import { X } from './x.js'`), como el resto del backend.
- **Tests unitarios:** `*.spec.ts`, al lado del archivo que prueban.
- **Tests e2e:** en `test/<tema>.e2e-spec.ts`.

**Módulos existentes:** los de los Sprints 1 a 3 (`customers`, `accounts`, `loyalty`, `consumptions`,
`points`, `audit`, …) y los del Sprint 4 (`rewards`, `redemptions`).

**Módulos nuevos del Sprint 5** (contrato §8.4; el esqueleto, los repositorios y los tipos los crea BASE-5):
- `missions`: misiones, asignación, avance, reclamo y proceso de fin de mes.
- `notifications`: plantillas, ajustes (logo y puntos de cumpleaños), promociones, envío y registro, y el
  proceso diario. Puerto `EmailSender` (Resend y un adaptador que solo deja en el log).
- `statistics`: solo lectura; lee las tablas por Prisma sin importar los módulos de negocio.
- `images`: **módulo técnico sin dominio**, como `prisma`. Puerto `ImageStorage` (Cloudinary y un adaptador
  falso), validación por contenido y URL firmadas.

Las dependencias van **en un solo sentido**:

```text
consumptions ──> points ──> loyalty
redemptions ──> rewards
redemptions ──> points
consumptions ──> missions ──> points
notifications ──> points            (lotes por vencer y regalo de cumpleaños; customers se lee por Prisma)
rewards, customers, notifications ──> images
statistics ──> (ningún módulo de negocio: lee por Prisma)
```

- `points` **no** importa `consumptions`, `rewards`, `redemptions`, `missions` ni `notifications`.
- `rewards` **no** importa `redemptions`: para rechazar canjes al desactivar o eliminar, publica
  `reward.deactivated` / `reward.deleted` y `redemptions` escucha (contrato S4 §8.4).
- `missions` **no** importa `consumptions`: recibe `{ customerId, consumptionId, amount, createdAt }`.
- `missions` publica `mission.completed` y `notifications` lo atiende **después del commit** (`@OnEvent` con
  `async: true` o una cola en memoria): **un correo nunca deshace un consumo ni un reclamo**.
- `customers` **no** importa `accounts`: se comunican por eventos.
- Actualizá `src/architecture.spec.ts` cuando BASE-5 sume estas reglas.

Si necesitás romper esa dirección, frená y preguntá.

---

## 4. Paso a paso de una historia de backend

1. **Contrato.**
   - Leé las secciones que indica la historia en `docs/sprint-5/HISTORIAS_SPRINT_5.md`.
   - Anotá cada endpoint, cada campo y cada fila de la tabla de errores.
   - Todo eso va al Plan previo.
2. **Schema y migración.**
   - **Solo si tu historia es dueña** de esa parte del modelo (ver la sección 1 de `HISTORIAS_SPRINT_5.md`:
     en este sprint, BASE-5, y ARRASTRE-S4 para el trigger y los `CHECK` del Sprint 3).
   - Columnas, tipos, `CHECK` e índices: exactamente los de §3.15. Los `CHECK` y los índices parciales se
     escriben a mano en la migración y un test verifica que existan.
   - Una migración por historia, con nombre descriptivo:
     `npx prisma migrate dev --name sprint5_base5_missions_notifications`.
   - La migración de BASE-5 también carga las plantillas por defecto y la fila de `notification_settings`
     (contrato §3.15).
   - Antes de crearla, revisá si otra persona ya tiene una migración abierta sobre las mismas tablas.
     Si la tiene, **preguntá**.
3. **Dominio.** Reglas puras y sus tests unitarios: cálculo de puntos, FIFO, deuda, nivel, plazo de 24 h,
   disponibilidad de la recompensa, canjes, y en el Sprint 5: avance de una misión (objetivo, días y franja
   horaria), estados de la misión del cliente, mes de la asignación, cumpleaños una vez por año, aviso 7 días
   antes, cliente frecuente.
4. **Servicio de aplicación.** Todo lo que el contrato dice "en una transacción" va dentro de
   `PrismaTransactionRunner`. Eso incluye:
   - los movimientos de puntos;
   - el saldo;
   - el avance de las misiones dentro del consumo;
   - la auditoría;
   - los eventos de dominio.

   Si algo falla, no queda nada escrito. **Lo que sale del sistema** (correos con `EmailSender`) va
   **después del commit**. Al reemplazar o quitar una foto, la imagen anterior se borra de Cloudinary
   **después del commit**; si el borrado falla, queda en el log y no deshace la operación (§3.5).
5. **DTO.**
   - Usá `class-validator`, con las reglas y los mensajes **del contrato**.
   - Los campos que el contrato dice que **no** se envían no van en el DTO. `forbidNonWhitelisted` los
     rechaza con `400`.
   - Fotos y logo: `multipart/form-data`; el tipo se valida **por contenido**, no por la extensión.
6. **Controller.**
   - Usá `@Roles(...)` exactamente según la matriz de la §4.
   - El usuario sale de `@CurrentUser()`, **nunca** del body.
   - Las rutas `/customers/me…` se declaran **antes** que `/customers/:id`, y `/recompensas/disponibles`
     antes que `/recompensas/:id` (§4).
7. **Filtro de errores del módulo.**
   - Mapea cada error de dominio a su HTTP y a su `code`.
   - Deja pasar el `403` y su `code`.
   - Usa el formato de la §5.
8. **Auditoría.**
   - `AuditService.capture` va en la misma transacción.
   - Usa el `AuditAction` y el `AuditModule` exactos, la `description`, `affectedCustomer`, `operationCode`
     y las filas de `details` **en el orden** de la §3.14.2 (las reglas generales siguen siendo las de la
     §3.9 del contrato del Sprint 3).
   - El actor es el empleado o `SYSTEM`. **Nunca un cliente**: el reclamo que hace el Cliente se audita con
     actor Sistema y "Reclamada por: Cliente".
   - **No se auditan** los envíos de notificaciones ni la foto de perfil (§3.14.1).
9. **Tests e2e** (sección 6).
10. **Verificación** (sección 7).

---

## 5. Reglas del backend que no se negocian

1. **El cálculo es del backend:**
   - puntos, bonificación, saldo, nivel;
   - `canVoid`, `voidableUntil`;
   - `isFirstConsumption`, `balanceBefore`, `balanceAfter`, `levelUp`;
   - avance y estado de las misiones (`completedMissions` en la respuesta del consumo);
   - todas las métricas de estadísticas y el PDF.

   Si el frontend lo necesita, viaja en la respuesta.
2. **Las reglas por rol se validan en el backend.** No alcanza con que la pantalla esconda un botón.
   Algunos ejemplos:
   - Cajero: `last24h` forzado a `true`.
   - Cajero: solo anula consumos propios dentro de las 24 h.
   - Consumos: solo el Administrador.
   - `PATCH /customers/:id` y `…/deactivate`: solo el Administrador desde el 25/10 (D-02).
   - `GET /canjes` y `/recompensas`: solo el Administrador.
   - Reclamar una misión: solo el Cliente, y solo las suyas (las ajenas responden `404`).
3. **Las respuestas tienen exactamente la forma del contrato:**
   - nombres en camelCase y nulos donde el contrato dice "Sí";
   - fechas en ISO UTC; las fechas sin hora, en `YYYY-MM-DD`; los meses, en `YYYY-MM`;
   - paginación `{ items, total, page, limit }`.

   No agregues ni saques campos.
4. **Los mensajes de error van en castellano**, con el texto del contrato cuando lo cita.
5. **La contraseña actual incorrecta devuelve `400 CURRENT_PASSWORD_INCORRECT`, no `401`.** Así el
   interceptor del frontend no intenta renovar la sesión.
6. **Movimientos, auditoría y notificaciones son solo inserción.** Los triggers rechazan `UPDATE`, `DELETE` y
   `TRUNCATE`. Nunca los desactives fuera de la migración que los crea.
7. **Concurrencia.** Toda operación que mueve puntos toma `SELECT … FOR UPDATE` sobre la fila de
   `customer_points` del cliente (§3.12 del contrato del Sprint 3). Al usar un canje, el orden de los
   bloqueos es recompensa → canje → `customer_points` (§3.9.1 del Sprint 4). El reclamo bloquea la
   asignación y después `customer_points`. El proceso de fin de mes usa `SKIP LOCKED` y es idempotente.
8. **Snapshots.** El consumo guarda la equivalencia y la versión vigentes. El lote guarda su vencimiento.
   El canje guarda el nombre y los puntos de la recompensa al confirmar. La asignación de una misión guarda el
   objetivo, la condición y la recompensa. Un cambio posterior de configuración **no** los modifica (RF-014).
9. **Fechas de filtro.** `fromDate` y `toDate` son días completos en hora de Argentina (UTC−03:00). Meses,
   días de la semana y franjas horarias de las misiones: con `shared/time/argentina-date.ts`.
10. **Nada de `any`** ni de `// @ts-ignore`. Tampoco desactives reglas de lint.
11. **No toques `frontend/`.**
12. **Lo que la historia no pide no se hace.** Ejemplo: si estás en US-28, no programes el reclamo.
13. **Sin reintegros (Sprint 4).** Confirmar un canje no descuenta nada; solo `PATCH /canjes/:code/usar`
    toca saldo, lotes, movimientos y stock. Cancelar, rechazar y vencer no devuelven nada (decisión S4-1).
14. **Puntos de regalo (Sprint 5).** `MISSION_REWARD` y `BIRTHDAY_BONUS` se acreditan con
    `PointsService.acreditarBonificacion` (de BASE-5): crean un lote, cancelan primero la deuda y **no tocan
    `lifetimePoints`** (S5-9). **Nunca se pierde una recompensa ganada** (S5-5).
15. **Servicios externos detrás de un puerto.** Resend solo a través de `EmailSender` y Cloudinary solo a
    través de `ImageStorage`. Las claves salen de variables de entorno (contrato §4); **nunca** en el código,
    en los tests ni en `.env.example` con valores reales.
16. **Procesos automáticos.** Cada uno se puede apagar con su variable (`…_CRON_ENABLED`) y correr a mano con
    su script de `npm run`. Misiones: día 1 a las 00:10, al iniciar y `npm run missions:expire`.
    Notificaciones: 09:00 y `npm run notifications:send`.

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
| Reglas por rol | Por ejemplo: Cajero con consumo ajeno, consumo propio > 24 h, misión de otro cliente |
| Efectos en la base | Saldo, `lifetimePoints`, lotes, movimientos con `balanceAfter`, estado de la misión, notificaciones registradas |
| Auditoría | Se escribió con la acción, la `description` y los `details` correctos. **No** se escribió cuando el contrato dice que no se audita |
| Rollback | Si un paso falla (por ejemplo, la auditoría), no queda nada escrito. Si falla el correo, el consumo queda |
| Concurrencia | Donde el contrato lo pide: dos reclamos en paralelo (uno `200`, otro `409`) |

- **Los e2e nunca llaman a Resend ni a Cloudinary.** Usan los adaptadores falsos: `NOTIFICATIONS_EMAIL_ENABLED=false`
  e `IMAGES_STORAGE_ENABLED=false`, y los procesos apagados (`MISSIONS_EXPIRATION_CRON_ENABLED=false`,
  `NOTIFICATIONS_CRON_ENABLED=false`) en `setup-e2e-env.ts`.
- La lista mínima de e2e del sprint está en el contrato, §8.4. Los casos de cada historia están en
  `docs/sprint-5/HISTORIAS_SPRINT_5.md`.

---

## 7. Verificar (desde `backend/`)

```bash
npm run lint        # oxlint
npm test            # unitarios
npm run test:e2e    # e2e (Docker + base vitto_club_test)
npm run build       # compila
```

- El CI de GitHub Actions corre lint, unitarios y build en cada PR (contrato §3.12). **Los e2e no corren en el
  CI**: corrélos en local antes de pedir el merge.
- Si no podés correr los e2e (por ejemplo, porque no hay Docker), **decilo en el resumen**. No los des
  por buenos.
- Si falla un test que no es de tu historia, no lo arregles: informalo.

---

## 8. Documentación del repo

**No edites `docs/` salvo que te lo pidan.** En el resumen, listá qué documentos quedaron desactualizados
por tu cambio. Por ejemplo:
- `docs/database/modelo-de-datos.md` (tablas y columnas nuevas);
- `docs/conceptos-transversales/errores-y-codigos.md` (para los códigos nuevos).

La rama de BASE-5 sí aplica la lista de `docs/seguimiento/actualizacion-docs-base5.md`, si la persona que la
pide está de acuerdo.
