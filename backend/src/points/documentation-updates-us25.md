# US-25: vencimiento automático de puntos (backend)

Qué se agregó al módulo `points` (y a lo que lo rodea) para US-25, qué decisiones se tomaron y
qué tiene que hacer cada integrante del equipo para levantar su entorno local después de traer
estos cambios. No se modificó ningún documento de `docs/`: lo que haya que actualizar ahí está
en la sección 6.

## 1. Cómo funciona

El proceso vence los lotes de puntos `ACTIVE` con `expiresAt <= ahora` y saldo, de clientes
activos (contrato §3.6.3). No tiene endpoint HTTP. Corre:

- **solo**, todos los días a las **00:05, hora de Argentina** (cron `5 0 * * *`, zona
  `America/Argentina/Cordoba`), mientras el backend está levantado;
- **a demanda**, con `npm run points:expire` (desde `backend/`), sin levantar el servidor.

Por cada lote, **en su propia transacción**:

1. bloquea la fila de `customer_points` del cliente (`FOR UPDATE`), igual que el resto de las
   operaciones que mueven puntos;
2. bloquea el lote con `FOR UPDATE SKIP LOCKED`: si otra instancia del proceso lo tiene, lo
   saltea; si ya venció, no lo vuelve a procesar (CA-25.4);
3. el lote pasa a `EXPIRED`, con `expired_at` y `remaining_points = 0` (vence entero);
4. el saldo baja lo que tenía el lote. `debt` y `lifetime_points` no cambian: el nivel no baja
   (CA-25.3);
5. inserta el movimiento `EXPIRATION` por `−remaining`, con `balance_after`, a nombre de
   "Sistema" (`performed_by_account_id = NULL`);
6. escribe la auditoría `POINTS_EXPIRED` con actor Sistema (§3.9.3).

Si un lote falla (por ejemplo, la auditoría), se deshace solo ese lote, el proceso sigue con los
demás y el error queda en el log. Ese lote se vuelve a intentar en la próxima corrida.

La fecha de vencimiento es la del lote (snapshot de la vigencia al acreditar): cambiar la vigencia
en la configuración no corre los lotes ya creados (CA-25.5).

## 2. Cambios en `src/points`

| Archivo | Qué cambió |
|---|---|
| `domain/points-lot.ts` | `expire(now)`: vence el lote entero (EXPIRED, `remaining = 0`, `expiredAt`) y devuelve los puntos que vencieron. Rechaza un lote que no está ACTIVE, que no venció o que no tiene saldo |
| `domain/port/points.repository.ts` | `InsertMovementData` acepta el tipo `EXPIRATION` y `performedByAccountId: null` (Sistema). Métodos nuevos: `findExpiredLotCandidates(now)`, `lockLotForExpiration(lotId)` y `findExpirationCustomer(customerId)`. Tipos nuevos: `ExpiredLotCandidate` y `ExpirationCustomer` |
| `infrastructure/points.repository.ts` | Los tres métodos. Los candidatos se buscan con el índice `(status, expires_at)` y excluyen a los clientes dados de baja. El bloqueo del lote usa `FOR UPDATE SKIP LOCKED`. El nombre y el documento del cliente se leen de `customers` por Prisma (`points` no importa el módulo `customers`, igual que con la configuración de puntos) |
| `application/points.service.ts` | `vencerLotes(now, onExpired)`: el proceso de la sección 1. `onExpired` corre dentro de la transacción de cada lote (ahí se audita). Devuelve `{ expiredLots, expiredPoints, failures }`. Constante `SYSTEM_PERFORMER_NAME = 'Sistema'` |
| `application/points-expiration.service.ts` (nuevo) | Corre `vencerLotes` y escribe `POINTS_EXPIRED` con `AuditService.record`. Deja en el log cuántos lotes y puntos vencieron, y los lotes que fallaron |
| `infrastructure/points-expiration.scheduler.ts` (nuevo) | El cron diario (`@Cron` de `@nestjs/schedule`). No corre si `POINTS_EXPIRATION_CRON_ENABLED=false` |
| `points.module.ts` | Importa `AuditModule` (que no importa ningún módulo de negocio, así que no se arma un ciclo) y registra el servicio y el cron |
| Tests | `points-lot.spec.ts`, `points.service.spec.ts`, `points-expiration.service.spec.ts` y `points-expiration.scheduler.spec.ts` |

## 3. Cambios fuera de `src/points`

| Archivo | Qué cambió |
|---|---|
| `src/expire-points.ts` (nuevo) | El comando a demanda: arma el contexto de Nest sin servidor HTTP y corre el proceso |
| `src/audit/domain/audit-entries.ts` | `pointsExpiredEntry`: description "Venció N pts de {cliente}"; detalles Puntos vencidos (con signo "−") · Fecha del lote (acreditación, dd/mm/aaaa en hora de Argentina) · Saldo resultante; sin código de operación. `affectedCustomerOf` acepta un tipo más chico (`AffectedCustomerSnapshot`), sin cambiar lo que ya existía |
| `src/app.module.ts` | `ScheduleModule.forRoot()` |
| `package.json` / `package-lock.json` | Dependencia `@nestjs/schedule` (^12.0.2, autorizada en el contrato §8.4) y script `points:expire` (`nest build && node dist/expire-points`) |
| `.env.example` | `POINTS_EXPIRATION_CRON_ENABLED=true` |
| `test/setup-e2e-env.ts` | Apaga el cron durante los e2e |
| `test/points-expiration.e2e-spec.ts` (nuevo) | Vencimiento parcial y total, lotes que no se tocan, auditoría, correr dos veces, dos corridas a la vez, cambio de vigencia y rollback |

## 4. Decisiones (a pedido de Melisa)

| Tema | Decisión |
|---|---|
| P7 (`HISTORIAS_SPRINT_3.md` §2) | Comando: `npm run points:expire`. `POINTS_EXPIRATION_CRON_ENABLED`: prendido por defecto (desarrollo y producción; sin la variable también queda prendido) y `false` en los e2e |
| `vencerLotes` | Lo hace US-25, aunque la tabla de piezas compartidas lo pone en BASE. Para eso se extendieron dos piezas de BASE: `InsertMovementData` y `PointsLot` |
| Saldo del lote vencido | `remaining_points = 0` |
| Datos del cliente para la auditoría | Se leen con Prisma desde el repositorio de `points` |
| Clientes dados de baja | Se excluyen del vencimiento: sus lotes quedan como estaban |

## 5. Qué tiene que hacer cada uno para levantar su entorno local

Después de traer estos cambios (`git pull` de develop), desde `backend/`:

1. **`npm install`.** Hay una dependencia nueva, `@nestjs/schedule`: sin instalarla, el backend
   no compila. Al terminar, `npm install` también corre `prisma generate`.
2. **No hace falta migrar.** US-25 no agrega migraciones: el schema ya tenía todo (`EXPIRED`,
   `expired_at`, `EXPIRATION` y el índice). Si tu base ya está al día con develop, no corras nada.
3. **`.env`: la variable nueva es opcional.** Sin `POINTS_EXPIRATION_CRON_ENABLED`, el cron queda
   prendido. Si no querés que el vencimiento corra solo en tu base de desarrollo, agregá
   `POINTS_EXPIRATION_CRON_ENABLED=false`.
4. **`.env`: para correr los e2e** tiene que estar `DATABASE_URL_TEST` (el valor de desarrollo
   está en `.env.example`). No es nueva de US-25, pero si no la tenés, `npm run test:e2e` falla
   antes de empezar con "Missing environment variable DATABASE_URL_TEST".
5. **Si ves errores de tipos de Prisma** (por ejemplo, "Property 'auditLog' does not exist") es
   porque el cliente de Prisma quedó generado con un schema viejo. Se arregla con
   `npx prisma generate`, que solo regenera los tipos: no toca la base.

**Ojo con el cron en local:** si dejás el backend levantado a las 00:05 con el cron prendido, el
proceso vence de verdad los lotes vencidos de tu base de desarrollo, con su movimiento y su
auditoría. Lo mismo pasa con `npm run points:expire`. En la base de tests no corre: los e2e lo
apagan.

## 6. Documentos que quedaron desactualizados

- `docs/sprint-3/HISTORIAS_SPRINT_3.md`, §2: completar P7 con la decisión de la sección 4.
- `docs/seguimiento/estado-puntos-y-consumos.md`: dice que `vencerLotes` y el cron de US-25 están
  pendientes.
- `docs/SETUP.md`: falta la variable `POINTS_EXPIRATION_CRON_ENABLED` y el comando
  `npm run points:expire`.

## 7. Para tener en cuenta

- En "Saldo resultante" de la auditoría, el negativo sale con guion común ("-30 pts"), igual que
  en `POINTS_ADJUSTED` (US-24). "Puntos vencidos" usa el signo "−".
- Antes de US-25, `npx tsc` sobre todo el proyecto ya marcaba errores en
  `test/audit-query.e2e-spec.ts` (línea 521) y `test/loyalty.e2e-spec.ts` (líneas 244 y 260). No
  son de esta historia y no se tocaron.
