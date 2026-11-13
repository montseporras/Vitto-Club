# Estado actual

> **Revisado el 09/11/2026** contra el código de `develop` (commit `f4c1171`, cierre del Sprint 4), en la rama
> `docs/actualizacion-docu-pasada`. Reemplaza la versión del 15/10/2026, que se escribió sin acceso al
> código. No es una foto en vivo: confirmar con `git` y con los tests.

## Qué existe (confirmado en el código)

### Backend

| Módulo | Sprint | Notas |
|---|---|---|
| `employees` | 1 | ABMC de empleados. Email único entre activos. Sin reactivación |
| `customers` | 1 y 3 | Clientes, perfil del Cliente (`/customers/me`), ajuste de puntos, listado con saldo y nivel. Sin reactivación |
| `loyalty` | 2 y 3 | Configuración versionada: equivalencia, vigencia, bonificación y niveles |
| `accounts` | 2 y 3 | Usuarios de empleados (con reactivación), registro de clientes, cuenta del cliente cargado en caja, cambio de contraseña propio, límite de intentos |
| `auth` | 2 | Login, renovación, cierre de sesión, guards globales |
| `consumptions` | 3 | Vista previa, registro, anulación y consultas. Audita `CONSUMPTION_REGISTERED` y `CONSUMPTION_VOIDED` |
| `points` | 3, 4 y 5 | Lotes, movimientos, saldo, nivel, ajustes, vencimiento diario (US-25), `canjear` (BASE-4) y `acreditarBonificacion` (BASE-5: puntos de regalo que no suman al nivel). `GET /movimientos-de-puntos` se eliminó (S5-13) |
| `audit` | 3 | `AuditService` y `GET /auditoria`, `GET /auditoria/actores` |
| `rewards` | 4 | US-34 a US-39: crear, editar, activar/desactivar, eliminar, disponibilidad automática y proceso diario de vencidas |
| `redemptions` | 4 | US-40 a US-45: confirmar, usar, rechazar, cancelar, vencer (al leer y cada 5 minutos) y consultar; catálogo del Cliente |
| `images` | 5 (BASE-5) | Módulo técnico sin dominio: puerto `ImageStorage` con adaptador de Cloudinary y adaptador falso, validación por contenido y URL firmada. Todavía nadie lo usa (lo usarán US-34 y FOTO-PERFIL) |
| `notifications` | 5 (BASE-5 y US-14) | Mensajes automáticos y puntos de cumpleaños (`/configuracion/mensajes`), envío común (`enviar`), reenvío e historial (`/notificaciones`), con el puerto `EmailSender` (Resend o log). Falta US-15 (promociones) y los envíos y procesos de US-47 a US-50 |
| `missions` | 5 (BASE-5) | **Esqueleto:** repositorios sin operaciones. Sin endpoints ni procesos todavía (US-28 a US-33) |
| `statistics` | 5 (BASE-5) | **Esqueleto:** repositorio sin operaciones. Sin endpoints todavía (US-51 a US-55) |
| `shared`, `prisma`, `health` | — | Eventos, seguridad, hora de Argentina; transacción ambiente; health check |

### Frontend

Features con código: `auth`, `employees`, `customers`, `cashier`, `consumptions`, `points`,
`points-movements` (solo tipos compartidos: la pantalla se borró el 09/11), `rewards`, `redemptions`, `audit`
y `my-account`. Vacías (Sprint 5): `missions`,
`notifications`, `statistics`; `levels` también está vacía porque los niveles quedaron en `points`.
Mapa de rutas y pantallas: [estructura del frontend](../architecture/estructura-frontend.md#08-mapa-de-pantallas).

## Verificación

| Comando | Resultado (09/11/2026) |
|---|---|
| `backend/ npm test` | **111 suites, 1543 tests: pasan todos** (con `f4c1171`) |
| `backend/ npm run test:e2e` | No se corrió en esta revisión (necesita Docker y la base de tests) |
| `frontend/ npm run lint` y `npm run build` | No se corrieron en esta revisión (no se tocó código) |

## Lo que falta o no coincide con los contratos

Encontrado al revisar el código. **No se corrigió nada**: es código de otras historias.

### Del Sprint 3 (arrastre que sigue abierto, `docs/sprint-4/CIERRE_SPRINT_3.md` §4.A)

| # | Qué falta | Dónde |
|---|---|---|
| A-02 | ✅ **Resuelto el 12/11 (ARRASTRE-S4):** `points_movements` es solo inserción (migración `sprint4_arrastre_points_movements_integrity`) | — |
| A-03 | **Resuelto a medias el 12/11 (ARRASTRE-S4):** `points_movements` tiene `points <> 0` y "motivo obligatorio en `MANUAL_ADJUSTMENT`". **Siguen sin existir** los `CHECK` de las otras tablas de la §3.12 (montos y puntos de `consumptions`, anulación, lotes, deuda y acumulados de `customer_points`, niveles) | Migración nueva |
| A-09 / B5 | `employees.phone`: la columna es nullable, pero el repositorio sigue guardando `''` y las filas viejas no se migraron | `backend/src/employees/infrastructure/employees.repository.ts:7` |
| B7 | ✅ **Resuelto el 12/11 (ARRASTRE-S4):** el CORS sale de `CORS_ORIGIN` (varios orígenes separados por coma; por defecto `http://localhost:5173`) | — |
| A-13 | Las 13 notas `documentation-updates-*.md` siguen dentro del código. Su contenido ya está en [decisiones de implementación](./decisiones-de-implementacion.md) | `backend/src/*/`, `frontend/src/features/*/` |
| A-10 | Las tablas de asignaciones de `HISTORIAS_SPRINT_3.md` §0 y `HISTORIAS_SPRINT_4.md` §0 dicen "Sin empezar" casi en todo | Fuentes de verdad (las actualiza el equipo) |
| A-07 | Ficha del cliente para el **Cajero** (US-19, contrato S3 §3.4.1). El router no tiene ninguna ruta de ficha en `/caja`; solo existe la del Administrador (`/admin/clientes/:id`). Confirmar si con los ajustes de navegación del 25/10 sigue haciendo falta | `frontend/src/app/router/paths.ts` |

Ya resueltos del arrastre: A-01 (auditoría de consumos), A-04 (US-25 mergeada), A-05 y A-06 (frontends de
US-21, US-22, US-19 Inicio, US-23 historial y pantalla Consumos, US-57 y EMP-PASS), D-14 (`customers` usa
`PointsService`).

### Del Sprint 4

Resueltos el 09/11 en `fix/cerrar-sprint4` (merge `f4c1171`): **US-41** (`GET /canjes/:code` y la pantalla
"Canjes por código"), **CLI-DOC** (`documentType` y `documentNumber` en `GET /customers`), **D-02**
(`PATCH /customers/:id` y `…/deactivate` con `@Roles('ADMIN')`), **D-03** (`UpdateCustomerDto` ya no acepta
el documento) y **NAV** (menú "Recompensas", pantalla vieja de Movimientos de puntos borrada).

| Qué pide el contrato | Qué hay en `develop` | Dónde |
|---|---|---|
| Al confirmar, bloquear la recompensa (anotado por US-35) | ✅ Resuelto el 12/11 (ARRASTRE-S4): `RedemptionConfirmationService` usa `lockForUpdate`, con un e2e de concurrencia | — |
| Test: usar un canje rechazado por la desactivación → `409` "Rechazado" | ✅ Resuelto el 12/11 (ARRASTRE-S4): está en `redemptions-use.e2e-spec.ts` | — |
| Scripts `rewards:expire` y `redemptions:expire`; variables de sus crons en `.env.example`; apagadas en `test/setup-e2e-env.ts` | ✅ Resuelto el 12/11 (ARRASTRE-S4) | — |

### Otros

- `backend/test/customer-registration.e2e-spec.ts:234` sigue con `it.skip` ("volver a registrarse con el
  mismo email"), aunque el cambio que lo bloqueaba (email de cuentas único entre activas) ya está.
- `frontend/src/shared/components/ui/Modal.tsx` no se cierra con Escape: cada modal suma su listener.
- Los saldos de los mocks del Cliente y de Caja son independientes (no afecta al backend real).
- Errores de tipos en `npx tsc --noEmit` de algunos e2e (`supertest`), conocidos desde el Sprint 3.

## Cruce con los documentos del producto (09/11/2026)

Se compararon el código de `develop` y los contratos con el **Plan de Proyecto v1.6**, el **Seguimiento del
Proyecto v1.7** y la **Definición del Producto v1.4** (los tres fuera del repo).

### Requerimientos de los Sprints 1 a 4 que el código no cumple del todo

| RF / US | Qué piden los documentos | Qué hay | Comentario |
|---|---|---|---|
| RF-029 / US-27 | "Consultar los niveles… su puntaje mínimo **y sus beneficios asociados**". El caso CP-US27-02 de la Definición del Producto carga "Beneficios: Postre gratis" | No hay beneficios en la base ni en la pantalla | Pasa al Sprint 5 (decisión de Deni, 09/11). El contrato S3 §3.7 los había dejado "pendientes de definir" |
| RF-08 / US-08 | "Visualizar la cuenta de acceso de un usuario, **cualquiera sea su rol**" | `/usuarios` muestra solo cuentas de empleados | Pasa al Sprint 5 (decisión de Deni, 09/11: el Administrador tiene que ver también las cuentas de los clientes) |
| RF-017 / US-19 | Consultar "misiones vigentes con su progreso" | No existe (misiones son del Sprint 5) | Se completa con US-33 |
| RF-038 / US-34 | Recompensa con imagen | Sin foto (S4-17) | El Story Map la pasa al Sprint 5 ("US-34 — Imagen de la recompensa") |

Todo lo demás de RF-01 a RF-011, RF-014 a RF-028, RF-030, RF-039 a RF-049 y RF-059 a RF-065 está en el código.

### Tecnologías y proceso declarados que no están en el repo

| Qué dice el Seguimiento (2.6) | Qué hay |
|---|---|
| Integración continua con GitHub Actions | No existe `.github/` |
| Vitest + React Testing Library en el frontend | No están instalados (D-17). La Definición del Producto §10.1 ya lista solo Jest + Supertest |
| Despliegue en Vercel, Render y Neon | No hay `vercel.json` ni configuración de despliegue en el repo; CORS fijo en `localhost:5173` (B7) |
| Resend (correo) y PDFKit (reportes) | Son del Sprint 5 (RF-050 a RF-053 y RF-058) |

### Diferencias entre los documentos del producto y el código o los contratos

- **Numeración de historias.** El Seguimiento v1.5 eliminó la vieja US-47 y corrió las siguientes: auditoría
  = **US-56** (registrar) y **US-57** (consultar), autorregistro = **US-58**, perfil = **US-59** (RF-065).
  `HISTORIAS_SPRINT_3.md`, el contrato S3 y el cierre del Sprint 3 se corrigieron el 09/11.
  `develop` ya renombró los comentarios del código (`cdc1722`).
- **DER de la Definición del Producto:** modela los estados como tablas (`points_lot_status`, `reward_status`,
  `redemption_status`); el código usa enums. No tiene `silver_min_points`, `gold_min_points` ni
  `must_change_password`.
- **Máquina "Recompensa":** el encabezado dice que los estados finales son "Eliminada, Deshabilitada,
  Inactiva", pero la tabla (y el código) tienen un solo estado final, "Dada de baja".
- **Títulos viejos de US-37, US-40 y US-41** en la §7.6 de la Definición del Producto y en el Sprint Backlog
  del Sprint 4 del Seguimiento ("Marcar recompensa como agotada", "Solicitar canje", "Confirmar canje"). El
  Story Map ya usa los nuevos.
- **US-59:** el Product Backlog del Seguimiento dice SCRUM-188 y el Sprint Backlog del Sprint 3, SCRUM-175.
- **Sprint 3 del Seguimiento:** la tabla suma 107 h y el resultado dice "se estimaron 90 h".

## Sprint 5 según el Seguimiento (Story Map)

US-14 (logo y mensajes automáticos, RF-012), US-15 (promociones, RF-013), US-28 a US-33 (misiones, RF-031
a RF-037), US-34 (imagen de la recompensa, RF-038), US-47 a US-50 (notificaciones de vencimiento,
cumpleaños, promociones y misiones, RF-050 a RF-053) y US-51 a US-55 (estadísticas y PDF, RF-054 a
RF-058). Lo que ya hay preparado en el código: las acciones de auditoría `MISSION_*`, `MISSIONS_EXPIRED`,
`LOGO_AND_MESSAGES_UPDATED` y `PROMOTIONS_UPDATED`, el módulo `MISSIONS`, las carpetas vacías del frontend y
las opciones "Próx." de los menús. Para BASE-5 hacen falta, como mínimo: misiones y el progreso por cliente
(estados enProgreso, Completada, Reclamada y Vencida de la Definición del Producto §9), el registro de cada
notificación enviada (tipo, canal, fecha y destinatario, como piden RF-050 a RF-053), la configuración de
logo, mensajes y promociones, y dónde se guardan las fotos.

> **Actualización del 12/11/2026.** Todo esto ya está decidido en el contrato del Sprint 5 **v3**
> (`docs/sprint-5/API_CONTRACT_SPRINT_5.md` §8.3, S5-1 a S5-58): el logo **no se configura** (S5-35), las
> promociones **no se guardan**, solo se envían (S5-36), las fotos van a Cloudinary (S5-12) y las estadísticas son
> por mes (S5-42). En el código de `develop` el Sprint 5 sigue sin empezar.

### Lo que también entra al Sprint 5 (no está hecho y no figura en el Story Map)

Decidido por Deni el 09/11/2026: todo lo que debía estar y no está hecho pasa al Sprint 5.

| # | Qué | Origen | Por qué no figura en el Story Map |
|---|---|---|---|
| 1 | **Foto de perfil del Cliente** | Decisión #9 del contrato S3 (la ponía en el Sprint 4) y PD-2 del contrato S4 (la pasa al Sprint 5) | No hay ningún RF ni US que la pida: RF-065 / US-59 no mencionan la foto. Hay que sumarla a RF-065 y a US-59 (o crear un RF y una US nuevos) |
| 2 | **Beneficios de los niveles** (mostrarlos y guardarlos) | RF-029 del Plan de Proyecto; CP-US27-02 de la Definición del Producto ("Beneficios: Postre gratis") | Es parte de US-27 (Sprint 3), que figura como terminada. El contrato S3 §3.7 los dejó "pendientes de definir". Decidido (S5-26): un texto informativo por nivel, que no cambia los puntos (NIV-BEN) |
| 3 | **El Administrador ve también las cuentas de los clientes** | RF-08 ("cualquiera sea su rol") / US-08 | Es parte de US-08 (Sprint 2), que figura como terminada. Hoy `GET /usuarios` solo devuelve cuentas de empleados (`findAllEmployeeAccounts`) y la pantalla de Clientes no muestra el estado de la cuenta |
| 4 | Bloquear la recompensa al confirmar un canje | Anotado por US-35 (ítem 7 de las verificaciones pendientes) | Arrastre de US-40 |
| 5 | Test: usar un canje rechazado por la desactivación | Ítem 4 de las verificaciones pendientes | Arrastre de US-42 |
| 6 | Trigger de solo inserción y `CHECK` de `points_movements` y demás tablas del Sprint 3 | A-02 y A-03 del cierre del Sprint 3 | Arrastre de BASE (Sprint 3) |
| 7 | `employees.phone` en `NULL` y migrar los `''` | A-09 / B5 | Arrastre de CORR (Sprint 3) |
| 8 | CORS por variable de entorno y configuración de despliegue (Vercel, Render, Neon) | B7; Seguimiento §2.6 | Tecnología declarada sin historia |
| 9 | Scripts `rewards:expire` y `redemptions:expire`, sus variables en `.env.example` y apagarlas en `test/setup-e2e-env.ts` | US-37 y US-44 | Configuración compartida que quedó sin aplicar |
| 10 | Habilitar el e2e saltado de "volver a registrarse con el mismo email" | `customer-registration.e2e-spec.ts:235` | Arrastre de US-58 |
| 11 | CI con GitHub Actions y tests del frontend (Vitest + Testing Library) | Seguimiento §2.6; D-17 | Tecnología declarada sin historia. Decidido (S5-30): se hace el CI y Vitest se saca del Seguimiento |
| 12 | Sacar las notas `documentation-updates-*.md` del código | A-13 | Tarea de documentación |

Los ítems 1, 2 y 3 cambian el alcance de historias ya cerradas: hay que reflejarlos en el Plan de Proyecto
(RF-065), en el Seguimiento (Story Map del Sprint 5, y marcar US-08 y US-27 como completadas en parte) y en
la Definición del Producto.

### Máquina de estados "Misión mensual" (cuadro de la Definición del Producto §9)

Según el cuadro (no la imagen, que está desactualizada):

| Origen | Método | Destino | US |
|---|---|---|---|
| Inicial | `asignar()` | enProgreso | US-30 |
| enProgreso | `registrarAvance()` | enProgreso | US-30 |
| enProgreso | `completar()` | Completada | US-30 |
| enProgreso | `vencer()` | Vencida | US-32 |
| Completada | `reclamar()` | Reclamada | US-31 |

Estados finales que declara: Reclamada y Vencida. **Choca con el propio cuadro** en dos casos, **ya decididos
por Deni el 09/11** (S5-4: Completada es final si la misión no tiene recompensa; S5-5: la Completada con
recompensa sin reclamar se reclama sola a fin de mes):

1. **Misión sin recompensa** (RF-031 la permite: "opcionalmente, una recompensa asociada"): llega a
   Completada y no tiene ninguna transición de salida, así que Completada también sería final.
2. **Misión completada con recompensa que el cliente no reclama antes de fin de mes:** el cuadro solo vence
   desde enProgreso. No dice si la recompensa se puede reclamar después del cambio de mes ni si pasa a
   Vencida.

## Preguntas abiertas de otros documentos

Las decisiones de producto que siguen abiertas (D-06 a D-13, D-15, D-18, D-19, D-35, D-37 y D-38 del cierre
del Sprint 3) están juntas en
[decisiones de implementación](./decisiones-de-implementacion.md#preguntas-abiertas). Ya se decidieron D-17
(S5-30), PD-3 (S5-13) y PD-6 (S5-14).

## Historial

| Fecha | Cambio |
|---|---|
| 2026-10-15 | Versión inicial, a partir de los documentos de traspaso del 5 y 6 de octubre (sin acceso al código) |
| 2026-11-09 | Reescrito contra `develop` (Sprints 1 a 4). Las inconsistencias de documentación de la versión anterior se corrigieron en cada documento |
| 2026-11-09 | Con `develop` en `f4c1171`: cruce con los documentos del producto, lo que pasa al Sprint 5 y la máquina de Misión |
| 2026-11-12 | Alineado con el contrato del Sprint 5 v3: decisiones ya tomadas (S5-4, S5-5, S5-13, S5-14, S5-26, S5-30, S5-35, S5-36) |
