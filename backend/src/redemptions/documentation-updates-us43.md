# US-43: rechazar y cancelar canjes (backend)

Qué agregó US-43, qué definió a pedido de Melisa (eventos, forma de la respuesta y cambio en la
baja de clientes) y qué tienen que saber las historias que vienen (US-36, US-38, US-41, US-42 y US-45).
No se modificó ningún documento de `docs/`: lo que haya que actualizar está en la sección 6.

## 1. Endpoints

| Método | Ruta | Roles | Respuesta |
|---|---|---|---|
| `PATCH` | `/api/canjes/:code/rechazar` | Administrador, Cajero | `200 { redemption }`, vista de empleado (sección 3) |
| `PATCH` | `/api/customers/me/canjes/:code/cancelar` | Cliente | `200 { redemption }`, vista del Cliente (sección 3) |

### Rechazar (contrato S4 §3.10.1)

Body `{ reason }`: se recorta y tiene que tener de 5 a 500 caracteres. Los mensajes son
"El motivo es obligatorio.", "Indicá un motivo de al menos 5 caracteres." y "El motivo no puede
superar los 500 caracteres.".

Orden, el mismo de `usar` (§3.9.1):

1. Normaliza el código (§3.6.1). Si no cumple el formato o no existe: `404` "Código no encontrado.", sin `code`.
2. Vence al leer (`vencerVencidos({ code })`, US-44) **antes** de abrir la transacción. Si lo venció:
   `409 REDEMPTION_EXPIRED` "El canje venció. El cliente tiene que pedirlo de nuevo.". El
   vencimiento y su auditoría quedan guardados.
3. Abre una transacción y bloquea el canje (`SELECT … FOR UPDATE`). Si no está `CONFIRMED`:
   `409 REDEMPTION_NOT_CONFIRMED` 'El canje ya está en estado "{Estado}".'. Eso incluye un canje
   que **ya estaba** `EXPIRED` ("Vencido"), siguiendo el orden de los pasos 2 y 3 de §3.9.1.
4. Lo pasa a `REJECTED` con `rejectionReason`, `resolvedAt` = ahora y el empleado del token como
   `resolvedBy` (el nombre sale de `EmployeesService`).
5. Audita `REDEMPTION_REJECTED` a nombre del empleado, en la misma transacción.

No toca saldo, lotes, movimientos ni stock.

### Cancelar (contrato S4 §3.10.3)

1. Normaliza el código. Si no existe, es de otro cliente o está mal escrito: `404` "No existe el
   canje.", sin `code` y sin vencer nada.
2. Vence al leer. Si lo venció: `409 REDEMPTION_EXPIRED` "El canje ya venció.".
3. Abre una transacción y bloquea el canje. Si no está `CONFIRMED`: `409 REDEMPTION_NOT_CONFIRMED`
   "El canje ya no se puede cancelar.".
4. Lo pasa a `CANCELLED` con `resolvedAt` = ahora y `resolvedBy` en `null`. **No se audita.**

## 2. Rechazo automático (contrato S4 §3.10.4 y §3.13.1)

`RedemptionResolutionService.rechazarConfirmados(filtro, motivo)` hace esto:

- toma los `CONFIRMED` **vigentes** (`expires_at > ahora`) de una recompensa (`{ rewardId }`) o de
  un cliente (`{ customerId }`), bloqueados con `FOR UPDATE` en orden de id;
- los pasa a `REJECTED` con el motivo y como Sistema (`resolved_by_account_id = NULL`,
  `resolved_by_name = 'Sistema'`);
- audita un `REDEMPTION_REJECTED` por canje, con actor Sistema;
- devuelve cuántos rechazó.

Los `CONFIRMED` ya vencidos que el barrido todavía no marcó **se vencen** (no se rechazan). Eso pasa
en la misma transacción, antes de rechazar.

Corre **dentro de la transacción de la operación que lo dispara**. Lo llama
`RedemptionEventsListener` con estos eventos:

| Evento | Lo publica | Motivo |
|---|---|---|
| `reward.deactivated` | US-36, `PATCH /recompensas/:id/desactivar` | "Recompensa desactivada" |
| `reward.deleted` | US-38, `PATCH /recompensas/:id/eliminar` | "Recompensa eliminada" |
| `customer.deactivated` | `PATCH /customers/:id/deactivate` (ya existía) | "Cliente dado de baja" |

### 2.1 Contrato de los eventos (definido en US-43, a pedido de Melisa)

En `src/shared/events/domain-events.ts`:

```ts
export const REWARD_DEACTIVATED = 'reward.deactivated';
export type RewardDeactivatedEvent = { rewardId: number };

export const REWARD_DELETED = 'reward.deleted';
export type RewardDeletedEvent = { rewardId: number };

// Lo que devuelve el listener de redemptions para los tres eventos
export type RedemptionsRejectedResult = { rejectedRedemptions: number };
```

**Para US-36 y US-38:**

- publicar con `await this.eventEmitter.emitAsync(REWARD_DEACTIVATED, { rewardId })` (o
  `REWARD_DELETED`) **dentro** de la transacción de desactivar o eliminar, después de escribir el
  estado nuevo de la recompensa;
- `emitAsync` devuelve un resultado por listener. El de redemptions es
  `{ rejectedRedemptions: n }`: es el valor de `rejectedRedemptions` de la respuesta y de la fila
  "Canjes rechazados: {n}" de `REWARD_DEACTIVATED` y `REWARD_DELETED` (§3.14.2, solo si n > 0);
- si el rechazo falla, el error sube (`suppressErrors: false`) y se deshace todo;
- `rewards` no importa `redemptions` (CA-B4.8): no hace falta tocar nada de `redemptions`.

Para leer `n` del resultado se puede copiar `rejectedRedemptionsFrom` de
`src/customers/application/customers.service.ts`. No se puso en `shared/events` porque ese archivo es
solo de datos.

## 3. Forma de `{ redemption }` (contrato S4 §3.6.2; definida en US-43, a pedido de Melisa)

En `src/redemptions/http/dto/redemption-response.dto.ts`, con dos funciones:

### Vista de empleado: `toEmployeeRedemptionDto(redemption, customer)`

Para el Administrador y el Cajero (rechazar; la van a usar `GET /canjes/:code` de US-41, `usar` de
US-42 y `GET /canjes` y `GET /customers/:id/canjes` de US-45).

```json
{
  "id": 12,
  "code": "K7MP2X",
  "createdAt": "2026-11-07T15:00:00.000Z",
  "expiresAt": "2026-11-07T15:15:00.000Z",
  "status": "REJECTED",
  "reward": { "id": 3, "name": "Café + medialuna", "points": 150 },
  "customer": { "id": 7, "firstName": "Carolina", "lastName": "Fernández", "documentType": "DNI", "documentNumber": "38456001" },
  "origin": "APP",
  "confirmedBy": null,
  "resolvedAt": "2026-11-07T15:05:00.000Z",
  "resolvedBy": { "actorType": "EMPLOYEE", "accountId": 4, "name": "Bruno Pérez" },
  "rejectionReason": "Sin insumo",
  "balanceBefore": null,
  "balanceAfter": null
}
```

- `reward` es el snapshot del canje: nombre y puntos de cuando se confirmó, con el id de la recompensa.
- `confirmedBy` es `{ accountId, name }` si `origin = COUNTER`, y `null` si es `APP`.
- `resolvedBy` es `null` mientras está Confirmado y cuando lo canceló el Cliente. Si no, es
  `{ actorType: "EMPLOYEE", accountId, name }` o `{ actorType: "SYSTEM", accountId: null, name: "Sistema" }`.
- No trae `canCancel`.

### Vista del Cliente: `toCustomerRedemptionDto(redemption, now)`

Para el Cliente (cancelar; la va a usar `GET /customers/me/canjes` de US-45).

```json
{
  "id": 12,
  "code": "K7MP2X",
  "createdAt": "2026-11-07T15:00:00.000Z",
  "expiresAt": "2026-11-07T15:15:00.000Z",
  "status": "CANCELLED",
  "reward": { "id": 3, "name": "Café + medialuna", "points": 150 },
  "resolvedAt": "2026-11-07T15:05:00.000Z",
  "rejectionReason": null,
  "canCancel": false
}
```

- Sin `customer`, `origin`, `confirmedBy`, `resolvedBy`, `balanceBefore` ni `balanceAfter`
  (§3.6.2 "Lo ve el Cliente", CA-45.2). El Cliente nunca ve qué empleado resolvió su canje.
- `canCancel` es `true` solo si `status = CONFIRMED` y no venció.

## 4. Cambio en la baja de clientes (contrato S4 §3.13.1; confirmado por Melisa que entra en US-43)

| Archivo | Qué cambió |
|---|---|
| `src/customers/application/customers.service.ts` | `deactivate(id)` devuelve `{ lostBalance, rejectedRedemptions }` en lugar de solo el saldo. `rejectedRedemptions` sale del resultado de `emitAsync(CUSTOMER_DEACTIVATED)`. Todo sigue en la misma transacción: si falla el rechazo de canjes, el cliente sigue activo |
| `src/customers/http/customers.controller.ts` | Pasa `rejectedRedemptions` a la auditoría |
| `src/audit/domain/audit-entries.ts` | `customerDeactivatedEntry(actor, customer, lostBalance, rejectedRedemptions = 0)` suma la fila "Canjes rechazados: {n}" **después** de "Saldo perdido", solo si n > 0 (decisión de Melisa) |
| Tests | `customers.service.spec.ts` y `customers.controller.spec.ts`, ajustados al nuevo valor de retorno |

## 5. Otros cambios

| Archivo | Qué cambió |
|---|---|
| `domain/redemption.ts` | `reject(reason, resolver, now)`, `cancel(now)`, `SYSTEM_RESOLVER` y `REDEMPTION_STATUS_LABELS` (textos de §2.3) |
| `domain/port/redemption.repository.ts` y `infrastructure/redemptions.repository.ts` | `lockByCodeForUpdate`, `lockConfirmedForRejection` y `saveResolution`. `RedemptionExpirationFilter` suma `{ rewardId }` |
| `application/redemption-resolution.service.ts` (nuevo) | `reject`, `cancel` y `rechazarConfirmados`, con los mensajes y `code` del contrato |
| `application/redemption-events.listener.ts` (nuevo) | Los tres `@OnEvent` |
| `http/` (nuevo) | `RedemptionsController` (`/canjes`), `CustomerRedemptionsController` (`/customers/me/canjes`), `RejectRedemptionDto` con su validador y `RedemptionsExceptionFilter` |
| `redemptions.module.ts` | Importa `EmployeesModule` (nombre del empleado, como `consumptions`; decisión de Melisa) y registra controllers y providers |
| `src/audit/domain/audit-entries.ts` | `redemptionRejectedEntry` |
| `test/redemptions-reject-cancel.e2e-spec.ts` (nuevo) | Los casos de la historia |

## 6. Documentos que quedan desactualizados (no se tocaron)

- `docs/conceptos-transversales/errores-y-codigos.md`: los codes nuevos `REDEMPTION_NOT_CONFIRMED`
  y `REDEMPTION_EXPIRED`.
- `docs/architecture/arquitectura.md` y `backend/CLAUDE.md` §3: la dependencia
  `redemptions → employees` y `redemptions → audit`, y los eventos `reward.deactivated` y `reward.deleted`.
- `docs/conceptos-transversales/transacciones-y-eventos.md`: los listeners que devuelven un valor
  (`rejectedRedemptions`) para quien publica.
- `docs/funcionalidades/clientes.md`: la baja de un cliente ahora rechaza sus canjes Confirmados.
- `docs/sprint-4/HISTORIAS_SPRINT_4.md`, sección 0: responsable, rama y estado de US-43 (los
  actualiza el equipo).
