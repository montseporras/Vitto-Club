# Dominio: programa de puntos

Reglas de negocio, sin HTTP. Los endpoints, campos y mensajes están en los contratos:

- configuración (Sprint 2): [configuración de puntos](../funcionalidades/configuracion-de-puntos.md);
- consumos, puntos, niveles y vencimiento (Sprint 3): `docs/sprint-3/API_CONTRACT_SPRINT_3.md` §3.1 a §3.7;
- recompensas y canjes (Sprint 4): `docs/sprint-4/API_CONTRACT_SPRINT_4.md`.

Actualizado el 09/11/2026 con el código de `develop`. Ante una diferencia, mandan el contrato y el código.

## 1. Configuración (módulo `loyalty`)

| Regla | Campos | Validación |
|---|---|---|
| Equivalencia monto/puntos | `baseAmount`, `pointsAwarded` | `baseAmount` > 0, máximo 2 decimales, hasta 1.000.000. `pointsAwarded` entero de 1 a 10.000 |
| Vigencia de puntos | `pointsExpirationMonths` | Entero de 1 a 120. Omitido, `null` o vacío → **12 meses (RF-010)**. Se mide desde que los puntos se acreditan |
| Bonificación de primer consumo | `bonusType`, `bonusValue` | `PERCENTAGE`: 1 a 100, hasta 2 decimales. `FIXED_AMOUNT`: entero de 1 a 10.000 puntos |
| Niveles (US-27) | `silverMinPoints`, `goldMinPoints` | Bronce desde 0 (fijo). Plata > 0 y Oro > Plata. Por defecto 300 y 800 |

Los límites 1.000.000 / 10.000 / 120 son las correcciones del Sprint 3 (`VERIFICACION_SPRINTS_1_2.md` §11).

**Versionado (RF-014).** La configuración completa es una versión inmutable, con una sola activa a la vez.
Cada guardado, completo o por sección, crea una versión nueva y copia los demás valores vigentes. Un
`PUT /loyalty/configuration` sin cambios se audita igual, con "Cambios: Se guardó sin modificar valores"
(decisión S3-24).

**Moneda.** La API no guarda código de moneda ni convierte.

**Auditoría.** Cada cambio se audita en el módulo Configuración (`POINTS_EQUIVALENCE_UPDATED`,
`POINTS_VALIDITY_UPDATED`, `FIRST_CONSUMPTION_BONUS_UPDATED`, `LEVELS_UPDATED`). La tabla de la
configuración no guarda `updatedBy`: el actor queda en la auditoría.

## 2. Consumos (módulo `consumptions`)

- **Puntos** = `floor(monto / baseAmount × pointsAwarded)`. Se trunca. Ejemplo: $1.550 con $1.000 = 10 pts
  → 15 pts.
- **Bonificación por primer consumo:** se aplica si el cliente no tiene **ningún** consumo `REGISTERED`.
  Si el primero se anula, el siguiente vuelve a recibirla (decisión #2). Porcentaje sobre los puntos del
  consumo (15 % de 500 → 75) o puntos fijos. **Suma** a los acumulados (decisión #3).
- El consumo guarda un **snapshot** de la configuración usada. Nunca se edita: si está mal, se anula y se
  registra de nuevo.
- La vista previa (`GET /consumos/preview`) la calcula el backend. La pantalla no hace cuentas.
- Un consumo que da 0 puntos (monto menor que la base, y sin bonificación) se **registra igual**, pero **no
  deja movimiento** de puntos: el contrato pide `points <> 0` en los movimientos. Anularlo tampoco deja
  movimiento (D-07, opción a, decisión tomada a pedido de Montse el 12/11; falta llevarla al contrato).

**Anulación (US-22):**

- El Cajero anula solo consumos **propios** y dentro de las **24 h**; el Administrador, cualquiera.
- Motivo obligatorio, de 5 a 500 caracteres.
- `CONSUMPTION_ALREADY_VOIDED` se evalúa antes que `VOID_NOT_ALLOWED` (S3-02).
- El lote del consumo pasa a `VOIDED`. Si sus puntos ya se gastaron, la diferencia queda como **deuda** y
  el saldo puede quedar **negativo**. Los acumulados bajan, así que el nivel puede bajar.
- Anular un consumo cuyo lote ya venció hoy convierte todo en deuda aunque esos puntos ya se descontaron al
  vencer (D-06, abierta).

## 3. Saldo, lotes y nivel (módulo `points`)

- Cada acreditación (consumo o ajuste "Sumar") cancela primero la deuda, si hay, y con lo que sobra crea
  un **lote** con su vencimiento. Los descuentos (ajuste "Restar", canje) consumen
  los lotes por **FIFO**: primero el que vence antes.
- **Invariante:** saldo = suma de lo que queda en los lotes `ACTIVE` − deuda. Toda operación bloquea la
  fila de `customer_points` del cliente.
- La fila de `customer_points` nace con el primer movimiento (S3-01). Sin fila: saldo 0, nivel Bronce.
- **Nivel:** se calcula con `lifetimePoints` (consumos con bonificación − anulaciones) y los umbrales
  vigentes. No se guarda por cliente. Los ajustes, vencimientos y canjes **no** lo bajan.
  `progressPercent` se redondea y `nextMinPoints` es `null` en Oro (S3-03, S3-04).

**Ajuste de puntos (US-24, solo Administrador):** sumar o restar con motivo. "Restar" **nunca** deja el saldo negativo: `409 INSUFFICIENT_BALANCE`
(decisión #1). No cambia el nivel.

**Vencimiento automático (US-25):** todos los días a las 00:05 (hora de Argentina) vencen los lotes
`ACTIVE` con `expiresAt` pasado y saldo, de clientes **activos** (los dados de baja se excluyen, S3-08).
El lote vence **entero** (`remaining = 0`, S3-07), se registra un movimiento `EXPIRATION` a nombre de
"Sistema" y se audita `POINTS_EXPIRED`. No toca `lifetimePoints`.

**Puntos de regalo (Sprint 5, BASE-5):** `PointsService.acreditarBonificacion` acredita `MISSION_REWARD`
(recompensa de una misión) y `BIRTHDAY_BONUS` (regalo de cumpleaños). Funciona como una acreditación: cancela
primero la deuda y, con lo que sobra, crea un lote con la vigencia vigente (sin consumo). Siempre lo hace el
**Sistema** (el Cliente que reclama una misión nunca es actor). A diferencia de un consumo, **no suma a
`lifetimePoints`**: el nivel sale solo de los consumos (S5-9), aunque el regalo cruce un umbral. Un
`MISSION_REWARD` lleva siempre su asignación (`customer_mission_id`) y una misión se cobra una sola vez.
Todavía no hay endpoint ni proceso que lo llame: lo usan US-31, US-32 y US-48.

**Movimientos:** son solo inserción, con signo y saldo resultante (la base rechaza `UPDATE`, `DELETE` y
`TRUNCATE`, y un movimiento de 0 puntos). Tipos: `CONSUMPTION_CREDIT`, `VOID_REVERSAL`, `MANUAL_ADJUSTMENT`,
`EXPIRATION` y `REDEMPTION` (con `redemptionCode`, "Canje: {recompensa}"), y, desde el Sprint 5,
`MISSION_REWARD` y `BIRTHDAY_BONUS`. No existe ningún tipo de reintegro. La descripción del movimiento de
misión ("Recompensa de misión: {misión}") la agrega US-31; la de cumpleaños es "Regalo de cumpleaños".

## 4. Recompensas (módulo `rewards`)

| Estado | Quién lo pone | Disponible para canjear |
|---|---|---|
| Activa (`ACTIVE`) | Al crearla o al activarla | Sí, si tiene stock (o sin límite) y no venció |
| Deshabilitada (`DISABLED`) | **Solo el Sistema**, por "Sin stock" o "Vencida" | No |
| Inactiva (`INACTIVE`) | El Administrador ("Desactivar") | No |
| Dada de baja (`DELETED`) | El Administrador (el botón dice "Eliminar") | No. Es final y libera el nombre |

- **Campos** (S4-12): nombre (1 a 80, único entre las no dadas de baja, sin distinguir mayúsculas),
  descripción (hasta 255), puntos (1 a 1.000.000), stock (vacío = sin límite; 1 a 100.000) y vencimiento
  (vacío = no vence). **Foto: Sprint 5**; hoy todas usan la imagen genérica (S4-17).
- **Disponible** = `ACTIVE`, stock `null` o mayor que 0, y vencimiento `null` o mayor o igual que hoy en
  Argentina. Se calcula con la fecha, no solo con el estado: una vencida que el proceso todavía no marcó
  ya no se puede canjear (`estaDisponible`, `rewards/domain/reward-availability.ts`).
- **Deshabilitar y habilitar solas (US-37):** al editar, al usar un canje (stock − 1) y en el proceso
  diario de las 00:05 (y al iniciar). Si fallan las dos condiciones, el motivo es "Vencida" (decisión de
  US-37). Reponer stock o correr la fecha la vuelve a habilitar. Se audita `REWARD_DISABLED` /
  `REWARD_ENABLED` como Sistema.
- **Editar (S4-14):** el stock no puede quedar por debajo de los canjes confirmados vigentes
  (`STOCK_BELOW_CONFIRMED`). Cambiar los puntos no afecta los canjes ya confirmados.
- **Activar** una sin stock o vencida la deja Deshabilitada y avisa (S4-9).
- **Desactivar o eliminar** rechaza sus canjes Confirmados, como Sistema (S4-8).

## 5. Canjes (módulo `redemptions`)

**Las cinco reglas** (decisión S4-1, "opción B"):

1. El canje **nace Confirmado** (lo confirma el Cliente en la app o el Cajero en la caja).
2. Confirmar **no descuenta nada**: ni puntos ni stock.
3. Dura **15 minutos**.
4. Puntos y stock se descuentan **al registrar el uso**, y ahí se valida contra la base.
5. Cancelar, rechazar y vencer **no reintegran nada**.

| Estado | Cómo llega | Quién |
|---|---|---|
| Confirmado | Al confirmar | Cliente (app, no se audita) o Cajero/Administrador (caja, se audita) |
| Utilizado | Registrar uso | Cajero o Administrador |
| Rechazado | Rechazar con motivo (5 a 500), o automático | Cajero o Administrador; Sistema si se desactivó o eliminó la recompensa o se dio de baja al cliente |
| Cancelado | El Cliente lo cancela | Cliente (no se audita; "resuelto por" queda vacío) |
| Vencido | Pasaron los 15 minutos | Sistema |

- **Código:** 6 caracteres sin `0`, `O`, `1` ni `I`, aleatorio (`crypto.randomInt`) y único; se
  reintenta hasta 5 veces si choca. Se escribe a mano: se normaliza (mayúsculas, sin espacios ni guiones).
- **Snapshot:** el canje guarda el nombre y los puntos de la recompensa al confirmar. Al usarlo se
  descuentan **esos** puntos.
- **Saldo al confirmar:** lo valida **solo la pantalla**, con el saldo que ya tiene cargado (S4-2). El
  backend acepta el canje aunque no alcance; la validación real es al usar.
- **Registrar uso (US-42):** valida vencimiento, estado, cliente activo, recompensa disponible y saldo
  real, con bloqueos (recompensa → canje → saldo). Descuenta por FIFO, registra el movimiento
  `REDEMPTION`, baja el stock (si no es sin límite), suma `used_count` y no toca `lifetimePoints`.
- **Vence al leer y con un barrido** cada 5 minutos (y al iniciar). "Vencido es vencido": un canje con
  `expiresAt` pasado no se puede usar, rechazar ni cancelar aunque el barrido no lo haya marcado.
- **El Cajero ve** de un cliente solo los Confirmados vigentes (S4-10).
- **El Cliente nunca ve** qué empleado resolvió su canje.
- **Baja de un cliente:** sus canjes Confirmados pasan a Rechazados ("Cliente dado de baja").
