# Avisos al equipo — cambios del 20/10/2026

Registrado a nombre de **Magali**. Salen de las correcciones de Denise, comparadas con las máquinas de
estado de la *Definición del Producto* (sección 9).

> **Todos:** después de hacer `git pull`, correr `npx prisma migrate deploy` y `npx prisma generate` en
> `backend/`. Hay una migración nueva: `20261020120000_consumption_naming_and_voided_lot`.

---

## 1. Documentos históricos: se dejaron como están

| Qué cambió | Dos archivos de `docs/seguimiento/historico/` (`loyalty-api-original.md` y `transacciones-y-eventos-original.md`) llevan una nota arriba que dice que usan el vocabulario viejo. El resto del texto no se tocó |
|---|---|
| **A quién afecta** | A nadie en el código. Afecta a quien los lea: no los use como referencia de nombres |
| **Qué tiene que hacer cada uno** | Nada |

---

## 2. Prototipo v2 (`docs/prototipo/v2/`)

| Qué cambió | - "Compra" → "Consumo" en los textos visibles. Estados del consumo: "Registrado" y "Anulado".<br>- "Canjes pendientes" → "Canjes" y "No tiene canjes." en las pantallas de caja.<br>- `LEEME.md` actualizado. |
|---|---|
| **Quedó pendiente** | - Se hace en Claude Design: el canje nace **Confirmado** (hoy nace "Pendiente" y el Cajero lo "confirma"); el lote "Anulado".<br>- El archivo único (`Vitto Club Prototipo - archivo unico.html`) **no se actualizó**: no está el script para reempaquetarlo. Hasta un nuevo export, no coincide con la carpeta `v2/` |

| Quién | Qué tiene que hacer |
|---|---|
| **Quien rediseña en Claude Design** | Aplicar el cambio de lógica de canjes y el estado "Anulado" del lote, y reexportar. Si exporta sin los cambios de textos de esta fecha, se pierden |
| **Frontend de US-46, US-21, US-22, US-23, US-19, US-26** | Mirar el prototipo actualizado. Los textos de consumo y "Canjes" salen de acá |
| **Quien tenga `scripts/desempaquetar_prototipo.py`** | Subirlo al repo |

---

## 3. "Compra" → "Consumo" en el código (renombre de "Purchase")

| Antes | Ahora |
|---|---|
| `FirstPurchaseBonus*` (tipos, modelo, DTOs, servicio, hooks, formulario) | `FirstConsumptionBonus*` |
| Campo de la respuesta `firstPurchaseBonus` | `firstConsumptionBonus` |
| Ruta `/api/loyalty/configuration/first-purchase-bonus` | `/api/loyalty/configuration/first-consumption-bonus` |
| Tabla `first_purchase_bonus_configuration` y sus constraints | `first_consumption_bonus_configuration` |
| Enum `FirstPurchaseBonusType` | `FirstConsumptionBonusType` |
| `PURCHASE_CREDIT` (`PointsMovementType`) | `CONSUMPTION_CREDIT` |
| `FIRST_PURCHASE_BONUS_UPDATED` (`AuditAction`) | `FIRST_CONSUMPTION_BONUS_UPDATED` |
| Mensaje "First purchase bonus has not been configured" | "First consumption bonus has not been configured" |

También se renombraron los archivos (`first-purchase-bonus*.ts` → `first-consumption-bonus*.ts`,
`FirstPurchaseBonusForm.tsx` → `FirstConsumptionBonusForm.tsx`). Los textos de pantalla y los docs dicen
"consumo". La migración vieja `add_first_purchase_bonus_configuration` **no se tocó**: ya está aplicada.

**La ruta y el mensaje de error no estaban en el contrato del Sprint 3** (son del Sprint 2). Se cambiaron
igual para que quede un solo nombre. Si alguien los consume por afuera (Postman, scripts), tiene que
actualizarlos.

| Quién | Qué tiene que hacer |
|---|---|
| **BASE** (modelo de datos y módulo `points`) | Usar `CONSUMPTION_CREDIT` en `PointsMovementType`. El schema ya lo trae |
| **US-21** (registrar consumo), backend | Registrar el movimiento `CONSUMPTION_CREDIT` (no `PURCHASE_CREDIT`) |
| **US-57** (registrar auditoría), backend | Usar `FIRST_CONSUMPTION_BONUS_UPDATED`. **Ojo con la rama `feature/SCRUM-161-registrar-auditoria`**: si usa el nombre viejo, hay que cambiarlo antes de mergear |
| **US-58** (consultar auditoría), frontend y backend | La acción "Modificó bonificación por primer consumo" viaja como `FIRST_CONSUMPTION_BONUS_UPDATED` |
| **US-26** (movimientos de puntos), frontend y backend | El tipo de movimiento llega como `CONSUMPTION_CREDIT` ("Sumaste {n} pts por tu consumo") |
| **US-27** y quien toque `features/points` | Se renombraron los archivos y el formulario de bonificación. Rebasear las ramas abiertas sobre `develop` |
| **Cualquiera con una rama abierta que toque `loyalty/` o `features/points/`** | Rebasear sobre `develop` antes de seguir. Si no, el merge va a chocar por los renombres de archivos |

---

## 4. `VOIDED` (Anulado) en el lote de puntos

Se agregó el estado `VOIDED` a `PointsLotStatus`: es el lote cuyo consumo se anuló. Antes pasaba a
`CONSUMED`. **Lo dispara solo US-22.** La decisión #11 del contrato quedó revisada. El invariante no cambia:
el saldo es la suma de `remaining` de los lotes `ACTIVE` menos la deuda, y los `VOIDED` no suman.

Un lote que llega a 0 por gasto (un ajuste `SUBTRACT`, por ejemplo) **sigue** pasando a `CONSUMED`.

| Quién | Qué tiene que hacer |
|---|---|
| **BASE**, backend | Ya está en el schema y la migración. Cambia su criterio CA-BASE.4: al revertir un consumo, el lote pasa a `VOIDED`. Tiene que implementarlo en `revertir` |
| **US-22** (anular consumo), backend | Dejar el lote en `VOIDED` (no `CONSUMED`) al anular. Cambia el criterio CA-22.7 |
| **US-26** (movimientos de puntos), frontend | Sumar la etiqueta "Anulado" al estado del lote (`lot.status`) |
| **US-26**, backend | Devolver `VOIDED` en `lot.status` cuando corresponda |
| Resto (US-21, 23, 24, 25, 19, 57, 58) | No cambia nada |

---

## Otros cambios de esta tanda (sin avisos específicos)

- **Canjes:** el estado "Pendiente" no existe. `docs/architecture/estructura-frontend.md` ahora lista
  "Confirmado, Utilizado, Rechazado, Cancelado, Vencido".
- **Contrato:** nota al inicio que dice que los estados salen de la sección 9 de la Definición del
  Producto. `CLAUDE.md` §1 tiene una fila nueva para eso.
- **Historias:** el botón de caja dice "Ver canjes, recompensas y …" y "No tiene canjes."; US-19 dice
  "canjes disponibles y confirmados".

## Para el equipo: dos puntos que no resolví
- El nombre del lote "Movimiento de puntos" (contrato §2) ahora sigue la Definición del Producto.
  Si el equipo prefiere "Lote de puntos", hay que unificarlo en las dos fuentes.
- `npx tsc --noEmit` del backend tira 5 errores en tests (`accounts.repository.spec.ts`,
  `points-validity.controller.spec.ts`, `loyalty.e2e-spec.ts`). **No son de estos cambios** (falta
  `mustChangePassword` en mocks y firmas de `supertest`). Los dejé como estaban.
