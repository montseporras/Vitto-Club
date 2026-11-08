# US-45: consultar canjes (backend)

Qué agregó US-45 y qué se decidió a pedido de Melisa en lo que el contrato no define (sección 3).
No se modificó ningún documento de `docs/`: lo que haya que actualizar está en la sección 5.

## 1. Endpoints

| Método | Ruta | Roles | Respuesta |
|---|---|---|---|
| `GET` | `/api/customers/me/canjes` | Cliente | `{ items, total, page, limit }`, vista del Cliente |
| `GET` | `/api/customers/:id/canjes` | Administrador, Cajero | `Redemption[]`, vista de empleado, sin paginado |
| `GET` | `/api/canjes` | Administrador (el Cajero recibe `403`) | `{ items, total, page, limit }`, vista de empleado |

Las dos vistas del canje son las de US-43 (`http/dto/redemption-response.dto.ts`; ver
`documentation-updates-us43.md` §3).

Los tres **vencen al leer** antes de consultar (CA-44.1), fuera de cualquier transacción:
`{ customerId }` en los dos de cliente y `{ all: true }` en `GET /canjes`.

### `GET /customers/me/canjes` — Mis canjes (§3.12.1)

| Query | Regla |
|---|---|
| `status` | `CONFIRMED` (Confirmados) · `FINISHED` (Utilizado, Cancelado, Rechazado y Vencido) · sin valor = todos |
| `fromDate` / `toDate` | `YYYY-MM-DD`, inclusivos, por `createdAt`, en hora de Argentina. Un día = los dos iguales |
| `order` | `desc` (por defecto) · `asc`, por `createdAt` y, a igual fecha, por id |
| `page` / `limit` | Por defecto `1` / `20`; `limit` máximo `100` (la pantalla usa 100) |

Solo los canjes del cliente del token. Sin `customer`, `origin`, `confirmedBy`, `resolvedBy`,
`balanceBefore` ni `balanceAfter`; con `canCancel`.

### `GET /customers/:id/canjes` — Canjes para usar ahora (§3.12.2, S4-10)

- Solo los `CONFIRMED` vigentes (`expiresAt > ahora`), por `expiresAt` ascendente.
- Cliente inexistente: `404` "No existe el cliente." (sin `code`).
- Cliente dado de baja: `[]`.

### `GET /canjes` — Canjes del Administrador (§3.12.3)

| Query | Regla |
|---|---|
| `documentType` | `DNI` (por defecto) · `PASSPORT`. Solo se aplica si viene `documentNumber` |
| `documentNumber` | Máx. 20. Sin puntos, espacios ni guiones, en mayúsculas; coincidencia parcial |
| `code` | Máx. 10. Mayúsculas, sin espacios ni guiones; coincidencia parcial |
| `rewardName` | Máx. 80. Parte del nombre del canje (snapshot), sin mayúsculas ni tildes; encuentra también las recompensas dadas de baja |
| `status` | Uno de los 5 estados; sin valor = todos |
| `fromDate` / `toDate` | Igual que Mis canjes |
| `order` | Igual que Mis canjes |
| `page` / `limit` | Por defecto `1` / `20`; `limit` máximo `100` (la pantalla usa 10) |

## 2. Archivos

| Archivo | Qué cambió |
|---|---|
| `domain/redemption-filters.ts` (nuevo, + spec) | Grupos de estado, orden, normalización de `code`, `documentNumber` y `rewardName`, y el rango de fechas |
| `domain/port/redemption.repository.ts` e `infrastructure/redemptions.repository.ts` | `findPageByCustomer`, `findUsableByCustomer`, `findPage` y `findCustomerStatus`. `rewardName` se compara con `translate()` sobre `reward_name`, sin extensiones de Postgres (mismo criterio que Movimientos de puntos) |
| `application/redemptions-query.service.ts` (nuevo, + spec) | `listMine`, `listUsableNow` y `listAll` |
| `http/dto/list-my-redemptions-query.dto.ts` y `list-redemptions-query.dto.ts` (nuevos) | Los query params |
| `http/customer-redemptions.controller.ts` | `GET /customers/me/canjes` |
| `http/customer-redemptions-staff.controller.ts` (nuevo) | `GET /customers/:id/canjes` |
| `http/redemptions.controller.ts` | `GET /canjes`, con `@Roles('ADMIN')` |
| `redemptions.module.ts` | `RedemptionsQueryService`. `CustomerRedemptionsController` (`customers/me/canjes`) se registra **antes** que `CustomerRedemptionsStaffController` (`customers/:id/canjes`), así "me" no se toma como un id (§4) |
| `test/redemptions-query.e2e-spec.ts` (nuevo) | Los casos de la historia y de la §8.4 |

## 3. Decisiones tomadas a pedido de Melisa (el contrato no las define)

1. **Texto del 404 de `GET /customers/:id/canjes`:** "No existe el cliente.", sin el id y sin `code`.
2. **`page` y `limit` de `GET /canjes`:** por defecto `1` y `20`, con `limit` máximo `100`. El mismo
   máximo vale para Mis canjes.
3. **Mensajes de validación de los query params:**
   - fechas y rango invertido: los de Movimientos de puntos y Consumos (`buildMovementDateRange`):
     "fromDate no es una fecha válida (YYYY-MM-DD)" y "fromDate no puede ser posterior a toDate";
   - el resto, con el estilo de `ListAuditQueryDto`: "status no es un estado válido", "order debe ser
     desc o asc", "documentType debe ser DNI o PASSPORT", "documentNumber no puede superar los 20
     caracteres", "code no puede superar los 10 caracteres", "rewardName no puede superar los 80
     caracteres", "page debe ser un entero", "limit no puede superar 100", etcétera.
4. **`code` parcial:** no usa `normalizarCodigo`, que exige los 6 caracteres. Pasa a mayúsculas, saca
   espacios y guiones y busca con "contiene". No valida el alfabeto: un `0`, `O`, `1` o `I`
   simplemente no encuentra nada. El máximo de 10 se controla antes de normalizar.
5. **`documentNumber` vacío:** si después de normalizar queda vacío (por ejemplo `"..."`), se ignora
   el filtro en lugar de responder `400`.

## 4. Para las historias que vienen

- **US-41** (`GET /canjes/:code`) y **US-42** (`usar`) van en `RedemptionsController`, que tiene
  `@Roles('ADMIN', 'CASHIER')` a nivel de clase. Solo `GET /canjes` lo pisa con `@Roles('ADMIN')`.
  Hay que declarar `GET :code` **después** de `GET` (sin parámetro).
- El panel de Caja también usa `GET /recompensas/disponibles` (US-40), que no está en esta historia.

## 5. Documentos que quedan desactualizados (no se tocaron)

- `docs/conceptos-transversales/errores-y-codigos.md`: el `404` "No existe el cliente." de
  `GET /customers/:id/canjes`.
- `docs/funcionalidades/`: no hay ficha de canjes; cuando se arme, sumar los tres listados.
- `docs/sprint-4/HISTORIAS_SPRINT_4.md`, sección 0: responsable, rama y estado de US-45 (los
  actualiza el equipo).
