# Estado de puntos y consumos (Sprint 3)

> **Escrito el 18/10/2026**, por Montse, al cerrar BASE + US-21 (Registrar consumo) + US-22
> (Anular consumo) backend. Es una foto de ese momento — si algo de esto cambió después,
> confirmar contra el código y contra `HISTORIAS_SPRINT_3.md`.

## Qué se hizo

### BASE — Modelo de datos y módulo `points` (sin historia propia)

No es una historia del backlog: es la base que usan casi todas las historias de puntos.
Contrato: `API_CONTRACT_SPRINT_3.md` §3.12, §2.2, §3.4.1, §3.6.3, §3.7, §8.4.

- `PointsService`, con 4 operaciones: `acreditar()`, `revertir()`, `ajustar()` (`ADD`/
  `SUBTRACT` con FIFO entre lotes), `resumen()` (saldo, deuda, puntos acumulados, nivel,
  próximos vencimientos).
- Entidad `PointsLot` (lotes de puntos, con su propio vencimiento) y cálculo de nivel
  (Bronce/Plata/Oro) a partir de los puntos acumulados.
- **Decisión tomada (pendiente P6 del archivo de historias):** la fila de saldo de un
  cliente (`customer_points`) se crea en su primer movimiento, no al alta del cliente. Se
  eligió esta opción para no depender de ningún evento de otro módulo.
- **No incluye** el vencimiento automático de lotes (`vencerLotes()`) — queda para US-25.
- 101 tests unitarios.

### US-21 — Registrar consumo y cálculo automático de puntos

Contrato: §3.1, §3.1.1 a §3.1.4, §3.3.3.

- `GET /api/consumos/preview` — vista previa (puntos, bonificación, saldo resultante),
  sin escribir nada.
- `POST /api/consumos` — registra el consumo, acredita los puntos (vía `PointsService`),
  informa si subió de nivel.
- Reglas: truncado del cálculo, bonificación por primera compra (% o fija, y vuelve a
  aplicarse si el primer consumo se anuló), el servidor decide fecha/puntos/responsable
  (rechaza esos campos si llegan en el body), `409 CUSTOMER_INACTIVE`,
  `409 POINTS_EQUIVALENCE_NOT_CONFIGURED`. Roles: Administrador y Cajero.

### US-22 — Anular consumo

Contrato: §3.2, §3.2.1, §3.2.2.

- `PATCH /api/consumos/:code/anular` — anula y revierte los puntos (vía `PointsService`).
- `GET /api/customers/:id/consumos` — listado por cliente (lo usa el panel "Ver
  movimientos de las últimas 24 hs"), con `canVoid`/`voidableUntil` calculados según quien
  consulta.
- Reglas: Cajero solo anula lo propio y dentro de las 24 hs; Administrador, cualquiera sin
  límite; `409 CONSUMPTION_ALREADY_VOIDED`; motivo obligatorio (5 a 500 caracteres);
  lote parcialmente gastado → deuda y saldo negativo; el nivel puede bajar.

### Verificación

- 792 tests unitarios + 26 tests e2e reales (Postgres, sin mocks, con JWT real), estable
  en corridas repetidas.
- Ambos endpoints y el listado ya están conectados en `AppModule` — las rutas funcionan
  hoy, no hace falta ningún paso más para que el front las consuma.

## Qué falta — organizado por quién lo tiene que hacer

### Auditoría (US-57) — bloquea a todo lo demás, sin dueño asignado

El contrato pide que `POST /consumos`, `PATCH /consumos/:code/anular`, y todo lo que
mueve puntos (ajustes, vencimientos, configuración) quede en un historial de auditoría
(`AuditService`, tabla `audit_logs`). **No existe código todavía.** Sin esto:

- `CONSUMPTION_REGISTERED`/`CONSUMPTION_VOIDED` no se auditan (queda marcado con `TODO`
  en `consumptions.service.ts`) — el resto de la funcionalidad funciona igual.
- Ninguna historia que audite (Ajustar puntos, Vencimiento, Configurar niveles, etc.)
  puede cerrar su criterio de auditoría hasta que esto exista.

**Según la planilla del equipo, nadie lo tiene asignado.** Hay una fila "Registrar
auditoría" en esa planilla, pero es otra cosa: dice *"(pendiente del Sprint 2:
frontend)"* y solo tiene front asignado (Tomás) — no es la auditoría de Sprint 3.

### Historias de `points` sin construir

| Historia | Qué falta | Quién (planilla) |
|---|---|---|
| **US-24 — Ajustar puntos** | Todo el HTTP (`POST /customers/:id/ajustes-de-puntos`, DTO, controller, `403`/`404`/`409 INSUFFICIENT_BALANCE`). El motor (`PointsService.ajustar()`) **ya existe y está testeado** — es la más rápida de cerrar | Nadie asignado |
| **US-25 — Vencimiento automático** | `PointsService.vencerLotes()` (no existe) + cron (`@nestjs/schedule`) + resolver **P7** (comando a demanda, `POINTS_EXPIRATION_CRON_ENABLED` por entorno) | Nadie asignado backend |
| **US-26 — Consultar movimientos de puntos** | Todo (`GET /customers/:id/movimientos`, `GET /movimientos-de-puntos`, `GET /customers/me/movimientos`) | Jaz (back) / Tomás (front) |
| **US-27 — Configurar niveles** | Todo (`GET`/`PUT /loyalty/configuration/levels`) | Jaz (back) / Tomás (front) |
| **US-46 — Identificar cliente en mostrador** | `GET /customers/:id/puntos` — lo necesita la pantalla de Registrar consumo para la tarjeta de búsqueda | No está claro si entra en "Consultar cliente" — confirmar |
| **US-19 — Consultar cliente (ficha)** | Pestañas de consumos/movimientos en la ficha | Jaz (back) / Tomás + [] (front) |

### Historias de `consumptions` sin construir

| Historia | Qué falta | Quién (planilla) |
|---|---|---|
| **US-23 — Consultar consumos** | `GET /consumos` (listado Administrador), `GET /consumos/:code` (detalle), `GET /customers/me/consumos` (historial del Cliente) | Maga (back) / Deni (front) — puede reusar `Consumption`/`ConsumptionRepository`, no hace falta reconstruirlos |

### Frontend de lo que ya está en backend

- **US-21/US-22**: pantalla "Buscar cliente", vista previa, "Consumo registrado", modal
  "Anular consumo" — Deni. El backend ya está listo para que lo consuma.

## Preguntas abiertas (del archivo de historias, afectan esta área)

- **P6**: resuelta por nosotros (Opción B).
- **P7**: comando de vencimiento a demanda — sigue sin decidir.
- **P10**: ¿está mergeada `feature/SCRUM-161-registrar-auditoria`? Si existe, puede ser
  la base de US-57 en vez de arrancar de cero.
