# US-44: vencimiento automático de canjes (backend)

Qué se agregó al módulo `redemptions` para US-44 y **qué falta agregar en archivos compartidos**
(configuración y documentación). Por pedido de Melisa, esos cambios **no se aplicaron**: quedan
anotados acá para juntarlos con el resto de la documentación (sección 4).

## 1. Cómo funciona

Un canje `CONFIRMED` vence a los **15 minutos** de confirmarse (`expiresAt <= ahora`; contrato S4
§3.11, decisión S4-3). No tiene endpoint HTTP. Hay dos formas de vencerlo:

- **"Vencer al leer"**: `RedemptionsExpirationService.vencerVencidos(filtro)`. Lo tienen que llamar,
  antes de responder, `GET /canjes/:code` (US-41), `usar` (US-42), `rechazar` y `cancelar` (US-43),
  `GET /canjes`, `GET /customers/:id/canjes` y `GET /customers/me/canjes` (US-45).
- **Barrido**: `RedemptionsExpirationService.run()`. Corre **cada 5 minutos** (cron `*/5 * * * *`),
  **una vez al iniciar** el servidor y **a demanda** con `npm run redemptions:expire`.

Por cada canje, **en su propia transacción**:

1. lo bloquea (`FOR UPDATE SKIP LOCKED` en el barrido; `FOR UPDATE` que espera en "vencer al leer");
2. si ya no está `CONFIRMED` o no venció, no hace nada (idempotente, CA-44.5);
3. lo pasa a `EXPIRED` con `resolved_at = expires_at` (no la hora del barrido),
   `resolved_by_account_id = NULL` y `resolved_by_name = 'Sistema'`;
4. audita `REDEMPTION_EXPIRED` con actor Sistema: "Venció el canje de {cliente}", código en
   `operationCode` y detalles Código del canje · Recompensa (§3.14.2).

**No toca** saldo, lotes, movimientos, stock ni `used_count`: confirmar no descontó nada (S4-1).

En el barrido, si un canje falla (por ejemplo, la auditoría), se deshace solo ese, queda en el log
y el resto sigue; se reintenta en la próxima corrida. En "vencer al leer", el error sube.

### Para quien use `vencerVencidos` (US-41, US-42, US-43 y US-45)

| Endpoint | Filtro |
|---|---|
| `GET /canjes/:code`, `usar`, `rechazar`, `cancelar` | `{ code }` (ya normalizado con `normalizarCodigo`) |
| `GET /customers/:id/canjes`, `GET /customers/me/canjes` | `{ customerId }` |
| `GET /canjes` (Administrador) | `{ all: true }` |

**Llamarlo antes de abrir la transacción del caso de uso, nunca adentro.** La transacción ambiente
se anida: si se llama dentro de la de `usar` y `usar` termina en `409 REDEMPTION_EXPIRED`, el
rollback se lleva también el pase a `EXPIRED` y su auditoría (CA-44.2, §3.9.1 paso 2). Después de
llamarlo, cada historia igual valida `expiresAt` al operar ("vencido es vencido", §8.2).

## 2. Cambios en `src/redemptions`

| Archivo | Qué cambió |
|---|---|
| `domain/redemption.ts` | `REDEMPTION_DURATION_MS` (15 min), `SYSTEM_RESOLVER_NAME` ('Sistema'), `isExpired(now)` y `expire(now)` |
| `domain/errors/domain.error.ts` (nuevo) | `DomainError`, igual que en los demás módulos |
| `domain/port/redemption.repository.ts` | `RedemptionExpirationFilter`, `RedemptionCustomer` y los métodos `findExpiredCandidateIds`, `lockForExpirationSkipLocked`, `lockForUpdate`, `saveExpiration` y `findCustomer` |
| `infrastructure/redemptions.repository.ts` | Esos métodos. Los candidatos usan el índice `(status, expires_at)`. El cliente de la auditoría se lee de `customers` por Prisma (no se importa el módulo `customers`, igual que `points` en US-25) |
| `application/redemptions-expiration.service.ts` (nuevo) | `vencerVencidos(filtro)` y `run()` |
| `infrastructure/redemptions-expiration.scheduler.ts` (nuevo) | Cron de 5 minutos + `onApplicationBootstrap`. No corre si `REDEMPTIONS_EXPIRATION_CRON_ENABLED=false`. Si falla al iniciar, lo deja en el log y el servidor arranca igual |
| `redemptions.module.ts` | Importa `AuditModule`; registra el servicio y el scheduler; exporta `RedemptionsExpirationService` |
| Tests | `redemption.spec.ts`, `redemptions-expiration.service.spec.ts`, `redemptions-expiration.scheduler.spec.ts` |

## 3. Cambios fuera de `src/redemptions`

| Archivo | Qué cambió |
|---|---|
| `src/expire-redemptions.ts` (nuevo) | El comando a demanda: arma el contexto de Nest sin servidor HTTP y corre el barrido. Al levantar el contexto también corre el barrido de inicio: corre dos veces, sin efecto porque es idempotente (decisión de Melisa) |
| `src/audit/domain/audit-entries.ts` | `redemptionExpiredEntry` (+ su test en `audit-entries.spec.ts`) |
| `test/redemptions-expiration.e2e-spec.ts` (nuevo) | Barrido, límite de 15:00, auditoría, sin reintegro, idempotencia, concurrencia, filtros de `vencerVencidos`, CA-44.2 y rollback. Apaga el cron al principio del archivo (ver 4.3) |

## 4. Pendiente de agregar (no aplicado)

### 4.1 `backend/package.json`, en `scripts`

```json
"redemptions:expire": "nest build && node dist/expire-redemptions",
```

Mientras no esté, el comando se corre a mano desde `backend/`: `npx nest build && node dist/expire-redemptions`.

### 4.2 `backend/.env.example`, debajo de `POINTS_EXPIRATION_CRON_ENABLED`

```dotenv
# US-44: barrido de canjes vencidos (cada 5 minutos y al iniciar). Prendido por defecto; false lo
# apaga (los e2e lo apagan). Sin la variable, queda prendido. Para correrlo a demanda:
# npm run redemptions:expire
REDEMPTIONS_EXPIRATION_CRON_ENABLED=true
```

La variable es opcional: sin ella, el barrido queda prendido.

### 4.3 `backend/test/setup-e2e-env.ts`, al final

```ts
// US-44: el barrido de canjes vencidos no corre durante los e2e (ni al iniciar ni cada 5 minutos);
// los tests llaman al proceso directamente. Mismo motivo: ConfigModule no pisa lo ya definido.
process.env.REDEMPTIONS_EXPIRATION_CRON_ENABLED = 'false';
```

Hoy solo `test/redemptions-expiration.e2e-spec.ts` lo apaga (al principio del archivo). En las demás
suites el barrido corre al iniciar la app de cada spec, antes de que el spec inserte sus datos. Una
vez agregada esta línea, se puede borrar la del spec.

### 4.4 `docs/SETUP.md`

- La variable `REDEMPTIONS_EXPIRATION_CRON_ENABLED` (qué hace, que es opcional y que va en `false` en
  los e2e).
- El comando `npm run redemptions:expire`.
- Tampoco figuran todavía `POINTS_EXPIRATION_CRON_ENABLED` ni `npm run points:expire` (US-25).

### 4.5 Otros documentos que quedan desactualizados

- `docs/funcionalidades/`: no hay ficha de canjes; cuando se arme, sumar el vencimiento (sección 1).
- `docs/sprint-4/HISTORIAS_SPRINT_4.md`, sección 0: responsable, rama y estado de US-44 (los
  actualiza el equipo).
