# US-37: deshabilitar y habilitar recompensas automáticamente (backend)

Qué agregó US-37 al módulo `rewards`, qué se decidió a pedido de Melisa y **qué falta agregar en
archivos compartidos** (configuración y documentación). Esos cambios no se aplicaron, igual que en
US-44: quedan anotados en la sección 5 para juntarlos con el resto de la documentación.

## 1. Cómo funciona

US-37 no tiene endpoint. Son reglas que el backend aplica solo, con actor **Sistema** (contrato S4
§3.4). Dos piezas:

### 1.1 La función compartida: `RewardsAvailabilityService.reevaluarDisponibilidad(reward, hoyArgentina)`

| Antes | Condición | Después | Auditoría (Sistema) | Devuelve |
|---|---|---|---|---|
| `ACTIVE` | `stock = 0` | `DISABLED` / `OUT_OF_STOCK` | `REWARD_DISABLED` · Motivo: Sin stock | `"DISABLED"` |
| `ACTIVE` | `expiresAt < hoy` | `DISABLED` / `EXPIRED` | `REWARD_DISABLED` · Motivo: Vencida | `"DISABLED"` |
| `DISABLED` / `OUT_OF_STOCK` | vuelve a estar disponible | `ACTIVE` | `REWARD_ENABLED` · Motivo: Stock repuesto | `"ENABLED"` |
| `DISABLED` / `EXPIRED` | vuelve a estar disponible | `ACTIVE` | `REWARD_ENABLED` · Motivo: Fecha de vencimiento actualizada | `"ENABLED"` |
| `DISABLED` | sigue sin estar disponible, por **otro** motivo | `DISABLED` con el motivo nuevo | `REWARD_DISABLED` con el motivo nuevo | `null` |
| `INACTIVE` / `DELETED` | cualquiera | no cambia | — | `null` |
| cualquiera | sin cambio | no cambia | — | `null` |

- "Disponible" es lo de §3.1: stock `null` o `> 0` y `expiresAt` `null` o `>= hoy`, en hora de Argentina.
- **Si fallan dos condiciones a la vez, el motivo es "vencida"**: es la primera que falla, y
  después viene "sin stock" (decisión de Melisa, opción i).
- El valor que devuelve es el `availabilityChange` de `PATCH /recompensas/:id` (§3.2.4).

**Cómo la usan las historias que vienen:**

- **US-35 (editar):** en la misma transacción, después de guardar los cambios y auditar
  `REWARD_UPDATED`, llamar `reevaluarDisponibilidad(reward, toArgentinaDateString(new Date()))` con
  la recompensa ya actualizada. Lo que devuelve es `availabilityChange`.
- **US-42 (usar):** en la misma transacción, después de `stock − 1`, llamar
  `reevaluarDisponibilidad`. Si el stock llegó a 0, la deja `DISABLED` / `OUT_OF_STOCK` con
  `REWARD_DISABLED` (§3.9.1, paso 8). `redemptions` ya importa `RewardsModule`, que exporta
  `RewardsAvailabilityService`.
- **US-36 (activar):** para saber con qué motivo dejarla `DISABLED` cuando no está disponible
  (§3.2.5), usar `motivoNoDisponible(reward, hoy)` de `domain/reward-reevaluation.ts`. Activar audita
  `REWARD_ACTIVATED`, no `REWARD_DISABLED`.

La función guarda y audita **dentro de la transacción de quien llama**: si la operación falla, el
cambio de disponibilidad también se deshace. Quien llama tiene que haber bloqueado la recompensa
(`FOR UPDATE`).

### 1.2 El proceso diario: `RewardsAvailabilityService.runDailyExpiration()`

- **Cuándo corre:** todos los días a las **00:05, hora de Argentina** (cron `5 0 * * *`, zona
  `America/Argentina/Cordoba`, junto con US-25), una vez **al iniciar** el servidor y **a demanda**
  con `npm run rewards:expire`.
- **Qué toma:** las `ACTIVE` con `expires_at < hoy`. Las que vencen hoy siguen canjeables hasta las 23:59.
- **Cada recompensa:** su propia transacción, con `FOR UPDATE SKIP LOCKED`. Si una edición o un uso
  la tiene tomada, la saltea: esa operación la reevalúa, y si no, la toma la corrida siguiente.
- **Si una falla:** se deshace solo esa, queda en el log y sigue con las demás. Se reintenta en la
  próxima corrida.
- **Idempotente:** solo toma `ACTIVE`.
- **Canjes:** los Confirmados de una recompensa que vence **no se tocan** (CA-37.6). Al usarlos,
  US-42 tiene que responder `409 REWARD_NOT_AVAILABLE`.
- **Al iniciar:** si falla (por ejemplo, porque la base no responde), lo deja en el log y el
  servidor arranca igual. Como la disponibilidad se calcula con la fecha, una vencida sin marcar
  igual no se puede canjear.
- **Con el comando:** el comando levanta el contexto de Nest, así que también corre el proceso de
  inicio. Corre dos veces, sin efecto porque es idempotente (decisión de Melisa).

## 2. Archivos

| Archivo | Qué cambió |
|---|---|
| `domain/reward.ts` | `disable(reason)` (desde `ACTIVE` o `DISABLED`) y `enable()` (desde `DISABLED`) |
| `domain/errors/domain.error.ts` (nuevo) | `DomainError`, igual que en los demás módulos |
| `domain/reward-reevaluation.ts` (nuevo, + spec) | `motivoNoDisponible(reward, hoy)` y `reevaluar(reward, hoy)`: reglas puras |
| `domain/port/reward.repository.ts` e `infrastructure/rewards.repository.ts` | `findExpiredCandidateIds(hoy)` (usa el índice `(status, expires_at)`), `lockForUpdateSkipLocked(id)` y `saveAvailability(reward)` |
| `application/rewards-availability.service.ts` (nuevo, + spec) | `reevaluarDisponibilidad` y `runDailyExpiration` |
| `infrastructure/rewards-expiration.scheduler.ts` (nuevo, + spec) | Cron de las 00:05 + `onApplicationBootstrap`; no corre si `REWARDS_EXPIRATION_CRON_ENABLED=false` |
| `rewards.module.ts` | Importa `AuditModule`; registra el servicio y el scheduler; exporta `RewardsAvailabilityService` |
| `src/expire-rewards.ts` (nuevo) | El comando a demanda |
| `src/audit/domain/audit-entries.ts` (+ spec) | `rewardDisabledEntry` y `rewardEnabledEntry` (§3.14.2): actor Sistema, sin cliente ni código de operación |
| `test/rewards-expiration.e2e-spec.ts` (nuevo) | Vencida ayer, vence hoy, sin vencimiento, estados que no se tocan, 23:59, idempotencia, concurrencia, rollback, canjes sin tocar y `reevaluarDisponibilidad` contra la base |

## 3. Decisiones tomadas a pedido de Melisa

1. **Dos condiciones a la vez (opción i):** el motivo es la primera que falla (vencida y después
   sin stock). Si una `DISABLED` cambia de motivo, se actualiza y se audita `REWARD_DISABLED` con el
   motivo nuevo. Por ejemplo, una "Agotada" que además venció pasa a "Vencida" cuando se repone el
   stock sin cambiar la fecha.
2. **Firma:** `reevaluarDisponibilidad(reward, hoyArgentina)`. Corre en la transacción de quien
   llama, guarda y audita, y devuelve `"ENABLED" | "DISABLED" | null`. Se agrega
   `motivoNoDisponible` para US-36.
3. **Bloqueo del proceso diario:** `FOR UPDATE SKIP LOCKED`, una transacción por recompensa.
4. **Configuración y docs:** no se tocan; quedan anotados en la sección 5.
5. **Comando:** corre también el proceso de inicio (dos corridas, idempotente).

## 4. Para tener en cuenta

- **`updatedAt` cambia cuando el Sistema habilita o deshabilita.** La columna es `@updatedAt`, así
  que Prisma la actualiza en cada `update`. Como `updatedAt` es el orden del listado del
  Administrador (§3.1), una recompensa que se deshabilita sola sube en ese listado. El contrato no
  dice nada sobre este caso.
- **Una `DISABLED` / `OUT_OF_STOCK` que vence** no cambia de motivo con el proceso diario, que solo
  toma `ACTIVE` (§3.4). Pasa a `EXPIRED` la próxima vez que se reevalúa (al editarla).

## 5. Pendiente de agregar (no aplicado)

### 5.1 `backend/package.json`, en `scripts`

```json
"rewards:expire": "nest build && node dist/expire-rewards",
```

Mientras no esté, el comando se corre a mano desde `backend/`: `npx nest build && node dist/expire-rewards`.

### 5.2 `backend/.env.example`, debajo de `POINTS_EXPIRATION_CRON_ENABLED`

```dotenv
# US-37: recompensas vencidas (todos los días a las 00:05, hora de Argentina, y al iniciar).
# Prendido por defecto; false lo apaga (los e2e lo apagan). Sin la variable, queda prendido.
# Para correrlo a demanda: npm run rewards:expire
REWARDS_EXPIRATION_CRON_ENABLED=true
```

### 5.3 `backend/test/setup-e2e-env.ts`, al final

```ts
// US-37: el proceso de recompensas vencidas no corre durante los e2e (ni al iniciar ni a las 00:05);
// los tests llaman al proceso directamente. Mismo motivo: ConfigModule no pisa lo ya definido.
process.env.REWARDS_EXPIRATION_CRON_ENABLED = 'false';
```

Hoy solo `test/rewards-expiration.e2e-spec.ts` lo apaga, al principio del archivo. En las demás
suites el proceso corre al iniciar la app de cada spec, antes de que el spec inserte sus datos. Una
vez agregada esta línea, se puede borrar la del spec.

### 5.4 `docs/SETUP.md`

- La variable `REWARDS_EXPIRATION_CRON_ENABLED` (qué hace, que es opcional y que va en `false` en los e2e).
- El comando `npm run rewards:expire`.
- Junto con los de US-25 y US-44 (ver `src/redemptions/documentation-updates-us44.md` §4.4).

### 5.5 Otros documentos que quedan desactualizados

- `docs/funcionalidades/`: no hay ficha de recompensas; cuando se arme, sumar la sección 1.
- `docs/sprint-4/HISTORIAS_SPRINT_4.md`, sección 0: responsable, rama y estado de US-37 (los
  actualiza el equipo).
