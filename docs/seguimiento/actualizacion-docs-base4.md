# Qué hay que actualizar en la documentación por BASE-4

> **Aplicado el 09/11/2026** en la rama `docs/actualizacion-docu-pasada`, junto con lo atrasado del Sprint 3. Se deja como registro.

> **Para qué es este archivo.** BASE-4 (modelo de recompensas y canjes, módulos `rewards` y `redemptions` y
> `PointsService.canjear`) se mergeó en `develop` el 07/11/2026 (commit `ee708e0`, Deni), con el arreglo de
> la rama `fix/BASE-4-descripcion-canje-back`. Ningún documento de `docs/` lo menciona todavía. Esta es la
> lista de lo que hay que cambiar, documento por documento, para hacerlo después.
>
> **Pedido por:** Deni, el 08/11/2026. **Armado por:** Jazmín.
>
> **No se cambia nada de las fuentes de verdad** (contratos, historias, prototipo). Todo lo de acá sale del
> contrato del Sprint 4 (§2, §3.1, §3.6, §3.15 y §8.4) y del código de `develop`.

---

## Resumen

| Documento | Qué falta | Prioridad |
|---|---|---|
| [`database/modelo-de-datos.md`](../database/modelo-de-datos.md) | Tablas, enums, relaciones y restricciones de `rewards` y `redemptions`; columna `points_movements.redemption_id` | Alta |
| [`database/migraciones.md`](../database/migraciones.md) | Fila de la migración `20261107120000_sprint4_base4_rewards_redemptions` | Alta |
| [`architecture/arquitectura.md`](../architecture/arquitectura.md) | Los módulos nuevos y en qué sentido van sus dependencias | Alta |
| [`testing/estrategia.md`](../testing/estrategia.md) | El orden de limpieza de los e2e ahora incluye canjes y recompensas | Alta |
| [`seguimiento/estado-actual.md`](./estado-actual.md) | Los módulos `rewards` y `redemptions` en "Qué existe" | Media |
| [`conceptos-transversales/transacciones-y-eventos.md`](../conceptos-transversales/transacciones-y-eventos.md) | El orden de los bloqueos al usar un canje | Media |
| [`glosario.md`](../glosario.md) | Recompensa, canje, código de canje, disponible, confirmado | Baja |
| [`vision-general.md`](../vision-general.md) | La fila de recompensas y canjes en "Qué está construido" | Baja |

> **Ojo:** varios de estos documentos tampoco tienen lo del **Sprint 3** (consumos, lotes, movimientos de
> puntos, auditoría). Si se actualizan, conviene hacer las dos cosas juntas. Lo del Sprint 3 está en
> [`estado-puntos-y-consumos.md`](./estado-puntos-y-consumos.md) y en `docs/sprint-4/CIERRE_SPRINT_3.md`.

---

## 1. `database/modelo-de-datos.md`

### 1.1 Sección "Entidades": agregar dos filas

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `Reward` | `rewards` | Recompensas del catálogo: nombre, descripción, puntos, stock (`null` = sin límite), vencimiento (`DATE`, `null` = no vence), estado y motivo de deshabilitación, canjes usados, baja lógica (`deleted_at`) |
| `Redemption` | `redemptions` | Canjes: código de 6 caracteres, cliente, recompensa, **snapshot** del nombre y los puntos de la recompensa al confirmar, origen (app o caja), quién lo confirmó y quién lo resolvió, motivo de rechazo y saldos antes y después (solo si se usó) |

### 1.2 Sección "Enums": agregar cuatro filas

| Enum | Valores |
|---|---|
| `RewardStatus` | `ACTIVE`, `DISABLED` (solo la pone el Sistema), `INACTIVE`, `DELETED` (final; el botón dice "Eliminar") |
| `RewardDisabledReason` | `OUT_OF_STOCK`, `EXPIRED` (solo con `status = DISABLED`) |
| `RedemptionStatus` | `CONFIRMED` (nace así), `USED`, `REJECTED`, `CANCELLED`, `EXPIRED`. **No existe "Pendiente"** |
| `RedemptionOrigin` | `APP`, `COUNTER` |

`PointsMovementType` no cambia: el canje usa `REDEMPTION`, que ya existía. **No hay ningún tipo de reintegro**
(decisión S4-1).

### 1.3 Sección "Relaciones": agregar

```
Reward     1 ── 0..N Redemption
Customer   1 ── 0..N Redemption
Account    1 ── 0..N Redemption (confirmó en la caja / resolvió)
Redemption 1 ── 0..1 PointsMovement (REDEMPTION, solo si se usó)
```

Todas con `onDelete: Restrict`, como el resto.

### 1.4 Sección "Restricciones relevantes": agregar

Todas están escritas **a mano** en la migración (Prisma no modela `CHECK` ni índices por expresión).
`test/base4-schema.e2e-spec.ts` verifica que existan.

| Restricción | Dónde | Detalle |
|---|---|---|
| Nombre único entre las no dadas de baja | `rewards` | Índice único parcial `rewards_active_name_key`: `lower(trim(name)) WHERE status <> 'DELETED'`. Una dada de baja libera el nombre |
| Rangos | `rewards` | `rewards_points_range_check` (1 a 1.000.000), `rewards_stock_range_check` (`NULL` o 0 a 100.000), `rewards_used_count_check` (≥ 0) |
| Motivo solo si está deshabilitada | `rewards` | `rewards_disabled_reason_check`: `(status = 'DISABLED') = (disabled_reason IS NOT NULL)` |
| Fecha de baja solo si está dada de baja | `rewards` | `rewards_deleted_at_check`: `(status = 'DELETED') = (deleted_at IS NOT NULL)` |
| Código del canje | `redemptions` | `UNIQUE` (`redemptions_code_key`) y `redemptions_code_format_check`: `^[A-HJ-NP-Z2-9]{6}$` (sin 0, O, 1 ni I) |
| Dura 15 minutos | `redemptions` | `redemptions_expires_at_check`: `expires_at = created_at + 15 minutos` |
| Coherencia con el estado | `redemptions` | `redemptions_resolved_at_check` (`NULL` solo en `CONFIRMED`), `redemptions_rejection_reason_check` (solo en `REJECTED`), `redemptions_balance_before_check` y `redemptions_balance_after_check` (solo en `USED`, y obligatorios ahí) |
| Quién lo confirmó | `redemptions` | `redemptions_confirmed_by_check`: con empleado si y solo si `origin = 'COUNTER'` |
| Puntos positivos | `redemptions` | `redemptions_points_check`: `points > 0` |
| Movimiento de canje con su canje | `points_movements` | `points_movements_redemption_check`: `(type = 'REDEMPTION') = (redemption_id IS NOT NULL)` |

### 1.5 Sección "Copias derivadas" (o una nueva, "Snapshots")

- El canje guarda `reward_name` y `points` de la recompensa **al confirmar**. Si después se edita la
  recompensa, el canje conserva los suyos: al usarlo se descuentan los puntos del canje (RF-014, S4-14).
- `confirmed_by_name` y `resolved_by_name` guardan el nombre del empleado en ese momento, o "Sistema".

---

## 2. `database/migraciones.md`

Agregar al final de la tabla:

| Fecha | Migración | Qué hace |
|---|---|---|
| 2026-11-07 | `sprint4_base4_rewards_redemptions` | Crea `rewards` y `redemptions`, los enums `RewardStatus`, `RewardDisabledReason`, `RedemptionStatus` y `RedemptionOrigin`, y la columna `points_movements.redemption_id`. Escribe a mano los `CHECK` y el índice único parcial del nombre. **Se aborta con error** si hay movimientos `REDEMPTION` viejos (de seeds): hay que borrarlos antes en desarrollo |

> Las migraciones del Sprint 3 (`sprint_3_consumptions_points`, `sprint3_schema`,
> `sprint3_us57_audit_triggers`) tampoco están en la tabla.

---

## 3. `architecture/arquitectura.md`

### 3.1 La lista de módulos

En "Backend: monolito modular hexagonal" la lista dice `customers`, `employees`, `loyalty`, … Agregar los
del Sprint 3 y 4: `consumptions`, `points`, `audit`, `rewards` y `redemptions`.

### 3.2 Una sección nueva: "Dependencias entre módulos de negocio"

Las reglas de `backend/CLAUDE.md` y del contrato S4 §8.4 no están en este documento. Propuesta:

```text
consumptions ──> points ──> loyalty
redemptions ──> rewards
redemptions ──> points
```

- `points` no importa `consumptions`, `rewards` ni `redemptions`.
- `rewards` no importa `redemptions`. Para rechazar los canjes al desactivar o eliminar una recompensa,
  publica `reward.deactivated` / `reward.deleted` y `redemptions` escucha (esto lo agregó US-43).
- Cuando `rewards` necesita un dato de los canjes (`confirmedCount`), lo lee de la tabla `redemptions` en
  su repositorio, sin importar el módulo (US-34), igual que `points` lee `customers`.
- `src/shared/time/argentina-date.ts` (`toArgentinaDateString`) es la función única de "hoy en
  Argentina". BASE-4 la movió desde `points/domain`. La usan `points`, `rewards` y `redemptions`.

---

## 4. `testing/estrategia.md`

### 4.1 Sección "Base de datos de los e2e", punto "Cada spec limpia…"

Agregar el orden de limpieza que hace falta desde el Sprint 4, porque los canjes apuntan a clientes,
cuentas y recompensas con `onDelete: Restrict`:

```ts
await prisma.pointsMovement.deleteMany(); // apunta a lotes, consumos y canjes
await prisma.redemption.deleteMany();     // apunta a clientes, cuentas y recompensas
await prisma.reward.deleteMany();
// ... después, lotes, saldos, consumos, sesiones, cuentas, empleados y clientes
```

> **Por qué importa:** si una suite deja un canje sin borrar, la siguiente que borre clientes o cuentas
> falla por la clave foránea, aunque el problema no sea suyo. En `fix/BASE-4-descripcion-canje-back` se
> agregó este borrado a los 20 e2e que ya existían.

### 4.2 Sección "Suites documentadas": agregar

| Tema | Archivo |
|---|---|
| Modelo de recompensas y canjes (`CHECK`, índices, enums) | `test/base4-schema.e2e-spec.ts` |
| `PointsService.canjear` (FIFO, `REDEMPTION`, bloqueo, consulta de movimientos) | `test/points-redemption.e2e-spec.ts` |

---

## 5. `seguimiento/estado-actual.md`

En "Qué existe (confirmado en el código)", agregar:

| Módulo backend | Notas |
|---|---|
| `rewards` | BASE-4: tipo `Reward`, `estaDisponible(reward, hoyArgentina)`, `RewardsService` y su repositorio. Los endpoints los suma cada historia (US-34 en adelante) |
| `redemptions` | BASE-4: tipo `Redemption`, código de canje (`generarCodigo`, `generarCodigoUnico`, `normalizarCodigo`) y repositorio. US-44 y US-43 sumaron el vencimiento y los rechazos |
| `points` (cambio) | BASE-4: `PointsService.canjear` descuenta por FIFO, registra el movimiento `REDEMPTION` con `redemption_id` y no toca `lifetimePoints`. No existe ninguna operación de reintegro |

---

## 6. `conceptos-transversales/transacciones-y-eventos.md`

Agregar una nota sobre el **orden de los bloqueos** al usar un canje (contrato S4 §3.9.1), para no generar
*deadlocks*:

> Recompensa → canje → `customer_points`, todos con `SELECT … FOR UPDATE`. `PointsService.canjear` toma el
> bloqueo de `customer_points`; quien lo llama (US-42) tiene que haber bloqueado antes la recompensa y el
> canje.

---

## 7. `glosario.md` (sección "Negocio")

| Término | Significado |
|---|---|
| Recompensa | Lo que un cliente puede pedir a cambio de puntos. Puede tener stock y fecha de vencimiento |
| Disponible | Una recompensa `ACTIVE`, con stock (o sin límite) y sin vencer, según la fecha de hoy en Argentina. Se calcula con la fecha y no solo con el estado |
| Canje | El pedido de una recompensa. Nace **Confirmado**, dura 15 minutos y **no descuenta nada** hasta que se registra el uso |
| Código del canje | 6 caracteres sin 0, O, 1 ni I (por ejemplo `K7MP2X`), aleatorio y único. Lo presenta el cliente en la caja |
| Snapshot | Copia de un dato en un momento: el canje guarda el nombre y los puntos de la recompensa al confirmar |

---

## 8. `vision-general.md`

En "Qué está construido", la fila de recompensas y canjes tiene que apuntar a un documento de
funcionalidad. Hoy no hay ninguno en `docs/funcionalidades/`. Cuando se arme (por ejemplo,
`funcionalidades/recompensas-y-canjes.md`, a partir de la plantilla), agregar la fila. El párrafo que dice
que la carpeta `rewards` del frontend "existe como carpeta" ya no es cierto.

---

## Lo que arregló `fix/BASE-4-descripcion-canje-back` (para que conste)

| Qué | Antes | Después |
|---|---|---|
| Descripción del movimiento `REDEMPTION` | `describeMovement` tiraba error: las tres consultas de movimientos de puntos respondían 500 en cuanto un cliente usaba un canje | "Canje: {recompensa}", con el nombre guardado en el canje (join a `redemptions.reward_name`). Cumple CA-B4.6 |
| Limpieza de los e2e | 20 suites borraban clientes o cuentas sin borrar antes los canjes | Todas borran `redemptions` y `rewards` antes |
