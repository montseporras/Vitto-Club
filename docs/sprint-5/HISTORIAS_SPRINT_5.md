# Historias del Sprint 5: qué hay que hacer y cómo se acepta

> **Para qué es este archivo.** No usamos Jira, así que este es el tablero del sprint:
> - **quién hace qué:** sección 0;
> - **en qué orden:** sección 1;
> - **qué falta decidir:** sección 2;
> - **qué tiene que cumplir cada historia para darla por terminada:** sección 3.
>
> **Este archivo dice QUÉ hay que lograr. El CÓMO exacto está en el contrato**
> (`docs/sprint-5/API_CONTRACT_SPRINT_5.md`) y, para las pantallas, en el prototipo (`docs/prototipo/v2/`,
> **después de actualizarlo** con `PROMPT_PROTOTIPO_SPRINT_5.md`). Si un criterio de acá choca con el
> contrato, **manda el contrato**. Hay que avisar para corregir este archivo.
>
> **Versión 0 (09/11/2026, borrador para el Planning).** Los criterios que dependen de una propuesta 🟡 del
> contrato se confirman cuando se decida su PD (sección 2). **El Sprint 5 es el último.**

## Cómo se usa

**Equipo**

1. **Anotate.** Poné tu nombre en la tabla de la sección 0, en la capa que te toca, y el nombre de tu rama.
2. **Pedile la historia a Claude:** `/historia US-28 backend Tu-Nombre`.
3. **Leé el Plan previo antes de decirle que siga.** Revisá que liste **todos** los CA, cite datos concretos
   del contrato y no tenga dudas sin responder.
4. **Cuando termines, actualizá el estado** en la tabla de la sección 0.
5. **Si un criterio está mal o falta algo:** no lo cambies acá; avisá al grupo; primero se corrige el contrato.

**Claude**

- Hacé solo la historia y la capa del pedido. Cumplí los `[B]` si sos backend, los `[F]` si sos frontend y los
  `[B+F]` en la parte que te toca.
- **Si la historia depende de una PD que todavía no tiene decisión, preguntá antes de empezar.**
- **Las pantallas del Sprint 5 del prototipo son viejas** (contrato §8.1). Si todavía no se actualizaron con el
  prompt, frená y preguntá.

**Etiquetas de los criterios**

| Etiqueta | Quién lo cumple |
|---|---|
| `[B]` | Backend |
| `[F]` | Frontend |
| `[B+F]` | Las dos capas |

**Las reglas de las misiones** (contrato, encabezado; decisiones S5-4 y S5-5):

1. Se asigna y nace **En progreso**. 2. Cada consumo que cumple la condición suma avance. 3. Al llegar al
objetivo pasa a **Completada**; sin recompensa, ahí termina. 4. Con recompensa, el cliente la reclama →
**Reclamada** y recibe los puntos. 5. A fin de mes: En progreso → **Vencida**; Completada con recompensa →
**Reclamada** sola. **Nunca se pierde una recompensa ganada.**

---

## 0. Asignaciones

**Estados:** Sin empezar · En curso · En revisión · Hecha.

| Ítem | Título | Backend: responsable | Backend: rama | Frontend: responsable | Frontend: rama | Carpeta del front | Estado |
|---|---|---|---|---|---|---|---|
| ARRASTRE-S4 | Cierre del Sprint 4 (`CIERRE_SPRINT_4.md`) | | | | | Según el ítem | Sin empezar |
| BASE-5 | Modelo de misiones, notificaciones, promociones, imágenes y beneficios | | | — (no tiene pantalla) | — | — | Sin empezar |
| US-14 | Configurar imagen y mensajes automáticos | | | | | `features/notifications` | Sin empezar |
| US-15 | Configurar promociones especiales | | | | | `features/notifications` 🟡 | Sin empezar |
| US-28 | Crear misión mensual | | | | | `features/missions` | Sin empezar |
| US-29 | Editar / dar de baja misión | | | | | `features/missions` | Sin empezar |
| US-30 | Progreso y cumplimiento automático de misiones | | | — (sin pantalla propia) | — | `features/cashier` (aviso en "Consumo registrado") | Sin empezar |
| US-31 | Reclamar recompensa de misión | | | | | `features/my-account` | Sin empezar |
| US-32 | Vencer y reiniciar misiones | | | — (sin pantalla) | — | — | Sin empezar |
| US-33 | Consultar misiones | | | | | `features/my-account` (Cliente), `features/customers` (ficha), `features/cashier` (panel) | Sin empezar |
| US-34 | Imagen de la recompensa | | | | | `features/rewards` | Sin empezar |
| US-47 | Notificar vencimiento de puntos | | | — | — | — | Sin empezar |
| US-48 | Notificar cumpleaños | | | — | — | — | Sin empezar |
| US-49 | Notificar promociones | | | | | `features/notifications` | Sin empezar |
| US-50 | Notificar avance de misiones | | | — | — | — | Sin empezar |
| US-51 | Estadísticas de clientes | | | | | `features/statistics` | Sin empezar |
| US-52 | Estadísticas de consumos por período | | | | | `features/statistics` | Sin empezar |
| US-53 | Estadísticas de puntos | | | | | `features/statistics` | Sin empezar |
| US-54 | Estadísticas de niveles, misiones y recompensas | | | | | `features/statistics` | Sin empezar |
| US-55 | Exportar reportes generados | | | | | `features/statistics` | Sin empezar |
| FOTO-PERFIL | Foto de perfil del Cliente (S5-1) | | | | | `features/my-account` | Sin empezar |
| NIV-BEN | Beneficios de los niveles (S5-2) | | | | | `features/points` y `features/my-account` | Sin empezar |
| CTA-CLI | Cuentas de los clientes (S5-3) | | | | | `features/customers` | Sin empezar |

> **Ramas:** `<tipo>/US-XX-<descripcion-corta>`. Por ejemplo: `feature/US-28-crear-mision-back`.

---

## 1. Orden y piezas compartidas

```text
BACKEND
  ARRASTRE-S4 (bloqueo al confirmar canje, CHECK y trigger del S3, CORS, scripts de crons)
     │
     ▼
  BASE-5 ──┬──> US-28 ──> US-29
           │       └──> US-30 ──> US-31
           │               ├──> US-32
           │               └──> US-33
           ├──> US-34, FOTO-PERFIL (imágenes)
           ├──> US-14 ──> US-47, US-48, US-50 (notificaciones)
           ├──> US-15 ──> US-49
           ├──> NIV-BEN
           └──> US-51 a US-54 ──> US-55
  CTA-CLI no depende de BASE-5

FRONTEND
  Primero: actualizar el prototipo (PROMPT_PROTOTIPO_SPRINT_5.md).
  Después, todo en paralelo con MSW, siguiendo el contrato.
```

**Piezas compartidas.** Cada una tiene un solo dueño. Las demás historias la **usan**.

| Pieza | Dueño | La usan |
|---|---|---|
| Tablas `missions`, `customer_missions`, `notification_templates`, `notifications`, `promotions`, `images`; columnas `points_movements.customer_mission_id`, beneficios y `photo_version`; enums; `CHECK` e índices | **BASE-5** | Todas |
| Módulos `missions`, `notifications`, `statistics`, `images` (esqueleto, repositorios y tipos) | **BASE-5** | US-14 a US-55 |
| `PointsService.acreditarRecompensaDeMision` (movimiento `MISSION_REWARD`, sin tocar `lifetimePoints`) | **BASE-5** | US-31, US-32 |
| Servicio de imágenes (validar, guardar, servir, `photoUrl` versionada) | **BASE-5** | US-34, FOTO-PERFIL, US-14 |
| Puerto `EmailSender` y su adaptador que solo deja en el log | **BASE-5** | US-47 a US-50 |
| Asignación y avance de misiones (`registrarAvance` desde `POST /consumos`) | **US-30** | US-31, US-32, US-33 |
| Reclamo (`reclamar(customerMission, por)`) | **US-31** | US-32 (automático), US-29 (al eliminar) |
| Envío y registro de una notificación (`enviar(tipo, cliente, motivo, variables)`) | **US-14** | US-47 a US-50 |
| Tarjeta de misión con barra de progreso (frontend) | **US-33** | US-31 |
| Selector de imagen con vista previa (frontend) | **US-34** | FOTO-PERFIL, US-14 |
| Selector de período (frontend) | **US-51** | US-52 a US-55 |

---

## 2. Pendientes que hay que decidir

**Claude: si tu historia figura en la columna "Afecta", preguntá antes de empezar.** Las propuestas están en
el contrato §10.

| # | Pendiente | Afecta | Decisión |
|---|---|---|---|
| PD-1 | Dónde se guardan las imágenes | BASE-5, US-34, FOTO-PERFIL, US-14 | |
| PD-3 | ¿Se elimina `GET /movimientos-de-puntos`? | ARRASTRE-S4 | |
| PD-6 | ¿Aviso de canje rechazado? | Nada (propuesta: no) | |
| PD-7 | Qué mide una misión | BASE-5, US-28, US-30 | |
| PD-8 | ¿La promoción cambia los puntos? | BASE-5, US-15, US-49 | |
| PD-9 | Definiciones de las estadísticas | US-51, US-52 | |
| PD-10 | Anticipación del aviso de vencimiento | US-47 | |
| PD-11 | Dependencias `resend` y `pdfkit` | US-47 a US-50, US-55 | |
| PD-12 | Foto de perfil: acceso y quién la ve | FOTO-PERFIL | |
| PD-13 | ¿Anular un consumo resta avance? | US-30 | |
| PD-14 | Asignación y repetición de misiones | BASE-5, US-30, US-32, US-33 | |
| PD-15 | Editar o eliminar una misión con progreso | US-29 | |
| PD-16 | ¿Reintentar correos fallidos? | US-14 | |
| PD-17 | ¿Auditar envíos? | US-47 a US-50 | |
| PD-18 | Puntos por cumpleaños | US-48 | |
| PD-19 | Gráficos | US-51 a US-54 (frontend) | |
| PD-20 | ¿El beneficio del nivel cambia los puntos? | NIV-BEN | |
| PD-21 | ¿Resetear la contraseña de un cliente? | CTA-CLI | |
| PD-22 | Actualizar Plan, Seguimiento y Definición del Producto | Solo documentación | |
| PD-23 | Vitest y GitHub Actions | ARRASTRE-S4 | |

---

## 3. Historias

Formato: **ficha**, **criterios de aceptación** (CA), **casos de prueba** del backend y **recorrido** del
frontend.

---

### ARRASTRE-S4 — Cierre del Sprint 4

**No tiene criterios propios.** Todo está en `docs/sprint-5/CIERRE_SPRINT_4.md` §4.A. Lo mínimo antes de
BASE-5:

| Qué | Por qué bloquea |
|---|---|
| Trigger de solo inserción y `CHECK` de `points_movements` (A-02, A-03 del S3) | BASE-5 agrega `MISSION_REWARD` y un `CHECK` a la misma tabla |
| Bloquear la recompensa al confirmar un canje | Es un error de concurrencia del S4 |
| Scripts y variables de los crons, apagados en `setup-e2e-env.ts` | BASE-5 suma dos procesos más con el mismo patrón |

| Fila de `CIERRE_SPRINT_4.md` | Responsable | Rama | Estado |
|---|---|---|---|
| | | | |

---

### BASE-5 — Modelo de misiones, notificaciones, promociones, imágenes y beneficios (solo backend)

| | |
|---|---|
| **Qué es** | No es una historia del backlog: es la base que usan todas las del sprint. Una sola migración |
| **Contrato** | §3.14 (modelo), §2 (enums), §3.5.1 (imágenes), §8.4 (módulos) |
| **Depende de** | ARRASTRE-S4 (lo mínimo) y las PD-1, PD-7, PD-8 y PD-14 |
| **Fuera de alcance** | Los endpoints (cada historia tiene los suyos) y los procesos automáticos (US-32, US-47, US-48) |

**Criterios de aceptación**

- **CA-B5.1 [B] Migración** `sprint5_base5_missions_notifications` con las tablas, columnas, enums, `CHECK` e
  índices de §3.14. Un test consulta `pg_constraint` y `pg_indexes` y confirma que existen.
- **CA-B5.2 [B] Restricciones.** La base rechaza, como mínimo: `target = 0`; `reward_points = 0`; una sola de
  las dos horas; `end_month < start_month`; dos misiones no dadas de baja con el mismo nombre; `progress >
  target`; un movimiento `MISSION_REWARD` sin `customer_mission_id`; una asignación repetida (misma misión,
  cliente y mes); una notificación repetida (mismo tipo, cliente y motivo); una imagen de más de 2 MB.
- **CA-B5.3 [B] Solo inserción.** `notifications` rechaza `UPDATE`, `DELETE` y `TRUNCATE`.
- **CA-B5.4 [B] Plantillas por defecto.** Después de migrar hay una fila por `NotificationType` con los textos
  del contrato §3.6.1.
- **CA-B5.5 [B] Acreditar la recompensa.** `PointsService.acreditarRecompensaDeMision` crea un lote con la
  vigencia vigente, cancela primero la deuda, inserta `MISSION_REWARD` con `customer_mission_id` y **no
  toca `lifetimePoints`** (el nivel no cambia).
- **CA-B5.6 [B] Imágenes.** El servicio acepta JPG, PNG y WebP por contenido; rechaza un PDF renombrado a
  `.jpg` y uno de 2 MB + 1 byte con `INVALID_IMAGE`; cada subida aumenta la versión.
- **CA-B5.7 [B] Correo apagado.** Con `NOTIFICATIONS_EMAIL_ENABLED=false`, el adaptador no llama a ningún
  proveedor y deja el envío en el log.
- **CA-B5.8 [B] Módulos sin ciclos.** `missions` no importa `consumptions`; `points` no importa `missions`;
  `statistics` no importa módulos de negocio. `architecture.spec.ts` lo verifica.

**Casos de prueba:** los de CA-B5.2 a CA-B5.7, más la migración sobre una base con datos del Sprint 4.

---

### US-14 — Configurar imagen y mensajes automáticos

| | |
|---|---|
| **Historia** | Como Administrador, quiero configurar el logo de la organización y los mensajes de las notificaciones automáticas, para personalizar la comunicación del programa |
| **RF** | RF-012 |
| **Roles** | Administrador |
| **Contrato** | §3.6, §3.8.2, §3.13 (`LOGO_AND_MESSAGES_UPDATED`) |
| **Depende de** | BASE-5 |
| **Fuera de alcance** | Los envíos de cada tipo (US-47 a US-50) |

**Criterios de aceptación**

- **CA-14.1 [B+F] Ver la configuración.** `GET /configuracion/mensajes` trae el logo y los cuatro mensajes.
  Configuración → Notificaciones deja de decir "Próx.".
- **CA-14.2 [B+F] Editar un mensaje.** Asunto 1–120 y mensaje 1–1.000, con las variables permitidas por tipo y
  vista previa. Una variable que no corresponde → `400` con el mensaje del contrato.
- **CA-14.3 [B+F] Activar y desactivar** cada tipo. Un tipo desactivado no se envía (lo prueban US-47 a US-50).
- **CA-14.4 [B+F] Logo.** Subir, reemplazar (JPG, PNG, WebP, ≤ 2 MB) y verlo en el login. `GET
  /configuracion/logo` es público.
- **CA-14.5 [B] Auditoría.** Una entrada `LOGO_AND_MESSAGES_UPDATED` por guardado, con una fila por cambio;
  "Se guardó sin modificar valores" si no cambió nada; "Logo: Actualizado" al subir el logo.
- **CA-14.6 [B+F] Historial de notificaciones.** `GET /notificaciones` con sus filtros; pestaña "Historial".
- **CA-14.7 [B] Envío común.** `enviar(tipo, cliente, motivo, variables)` reemplaza las variables, registra
  la notificación (tipo, canal, fecha, destinatario) con `SENT`, `FAILED` o `SKIPPED`, y no se repite por el
  mismo motivo.
- **CA-14.8 [B] Permisos.** Cajero y Cliente: `403`.

**Casos de prueba:** guardar con y sin cambios, variable inválida, logo válido e inválido, `GET` público,
historial con filtros, envío común (enviado, fallido, omitido, repetido), permisos.

**Recorrido del frontend:** editar cada mensaje, activar/desactivar, subir el logo, historial, errores.

---

### US-15 — Configurar promociones especiales

| | |
|---|---|
| **Historia** | Como Administrador, quiero definir promociones especiales del programa, para aprovechar las propuestas propias de La Vitto |
| **RF** | RF-013 |
| **Roles** | Administrador (configura); Cliente (las ve) |
| **Contrato** | §3.7 |
| **Depende de** | BASE-5 y **PD-8** |
| **Fuera de alcance** | El envío por correo (US-49). Si PD-8 elige que la promoción cambie los puntos, esta ficha se rehace |

**Criterios de aceptación**

- **CA-15.1 [B+F] Listado** con filtro Vigentes · Próximas · Terminadas y paginado.
- **CA-15.2 [B+F] Crear y editar** con título, descripción, días, horario y vigencia, con los mensajes del
  contrato §3.7.2.
- **CA-15.3 [B+F] Dar de baja** con confirmación.
- **CA-15.4 [B+F] El Cliente las ve.** `GET /customers/me/promociones` devuelve las vigentes y las de los
  próximos 7 días; tarjeta "Promociones" en Inicio.
- **CA-15.5 [B] Auditoría** `PROMOTIONS_UPDATED` en alta, edición (una fila por campo) y baja.
- **CA-15.6 [B] Permisos.** Cajero y Cliente: `403` en `/promociones`; Administrador y Cajero: `403` en
  `/customers/me/promociones`.

**Casos de prueba:** cada validación, vigencia (hoy, futura, terminada), baja, la vista del Cliente, auditoría,
permisos.

---

### US-28 — Crear misión mensual

| | |
|---|---|
| **Historia** | Como Administrador, quiero crear una misión mensual con objetivo medible y recompensa opcional, para incorporar gamificación al programa |
| **RF** | RF-031 |
| **Roles** | Administrador |
| **Contrato** | §3.1.1 a §3.1.3, §2.3, §3.13 (`MISSION_CREATED`) |
| **Depende de** | BASE-5 y **PD-7** |
| **Fuera de alcance** | Editar y dar de baja (US-29); el avance (US-30) |

**Criterios de aceptación**

- **CA-28.1 [B+F] Listado** de §3.1.2: columnas, objetivo armado en texto, "Sin recompensa", vigencia,
  completadas este mes, estado; filtro y búsqueda; paginado de a 10; vacío. La fila no tiene botones (abre el
  modal).
- **CA-28.2 [B+F] Crear con recompensa.** Dado "Vení 3 veces", `CONSUMPTION_COUNT`, objetivo 3, 50 pts, desde
  el mes actual, cuando se guarda: `201`, `ACTIVE`, auditoría `MISSION_CREATED` y toast "Misión guardada.".
- **CA-28.3 [B+F] Sin recompensa.** Con la casilla "Sin recompensa", `rewardPoints: null` y el listado dice "Sin
  recompensa".
- **CA-28.4 [B+F] Condición.** Días (domingo) y horario (09:00 a 13:00) se guardan y se ven en el objetivo
  armado.
- **CA-28.5 [B+F] Validaciones** de §3.1.3, en las dos capas.
- **CA-28.6 [B+F] Nombre repetido:** `409 MISSION_NAME_IN_USE`; el nombre de una dada de baja se puede usar.
- **CA-28.7 [B] El servidor decide:** `status`, `id` o fechas en el body → `400`.
- **CA-28.8 [B] Permisos.** Cajero y Cliente: `403`.

---

### US-29 — Editar / dar de baja misión

| | |
|---|---|
| **Historia** | Como Administrador, quiero modificar o dar de baja lógicamente una misión, para mantener actualizado el catálogo de misiones |
| **RF** | RF-032 |
| **Roles** | Administrador |
| **Contrato** | §3.1.4 a §3.1.6, §3.13 |
| **Depende de** | US-28, US-30 (para el caso con progreso), US-31 (reclamo) y **PD-15** |

**Criterios de aceptación**

- **CA-29.1 [B+F] Editar sin progreso:** cambia todo y rige desde ya.
- **CA-29.2 [B+F] Editar con progreso este mes:** el objetivo y la recompensa rigen desde el mes siguiente
  (`appliesFrom`); la pantalla avisa; los clientes del mes conservan su snapshot.
- **CA-29.3 [B] Mes de inicio** solo editable si no empezó.
- **CA-29.4 [B+F] Eliminar** con el aviso del contrato: las En progreso del mes → Vencida ("Misión dada de
  baja"); las Completadas con recompensa → Reclamadas (Sistema) con sus puntos; respuesta `{ expired,
  claimed }`.
- **CA-29.5 [B] Auditoría:** `MISSION_UPDATED` (una fila por campo, "Rige desde") y `MISSION_DELETED`, más un
  `MISSION_REWARD_CLAIMED` por reclamo automático.
- **CA-29.6 [B] Dada de baja:** `404` en `GET`, `PATCH` y eliminar otra vez.
- **CA-29.7 [B] Permisos.**

---

### US-30 — Progreso y cumplimiento automático de misiones (backend)

| | |
|---|---|
| **Historia** | Como Sistema, quiero actualizar automáticamente el progreso de cada cliente en las misiones activas a partir de sus consumos y marcarlas como completadas al alcanzar el objetivo |
| **RF** | RF-033, RF-034 |
| **Contrato** | §3.2, §3.13 (`MISSION_COMPLETED`) |
| **Depende de** | BASE-5, **PD-13** y **PD-14** |
| **Frontend** | Solo el aviso en "Consumo registrado" (`completedMissions`) |

**Criterios de aceptación**

- **CA-30.1 [B] Asignar.** El primer consumo del mes de un cliente le asigna las misiones en curso En
  progreso, con el snapshot de la misión.
- **CA-30.2 [B] Sumar.** Un consumo que cumple la condición suma 1 o su monto; uno fuera del día o la franja
  (hora de Argentina) no suma.
- **CA-30.3 [B] Completar.** Al llegar al objetivo: Completada, `completedAt`, `MISSION_COMPLETED` (Sistema) y
  la notificación de US-50 **después** del commit. El progreso no pasa del objetivo.
- **CA-30.4 [B] Sin recompensa:** queda Completada (final).
- **CA-30.5 [B] Ya resuelta:** una Completada, Reclamada o Vencida no suma más.
- **CA-30.6 [B] Misma transacción:** si falla el avance, no queda el consumo.
- **CA-30.7 [B+F] Respuesta:** `POST /consumos` trae `completedMissions`; "Consumo registrado" muestra
  "¡{Nombre} completó la misión {misión}!".
- **CA-30.8 [B] Anular** (PD-13): resta avance solo en las del mismo mes En progreso.
- **CA-30.9 [B] Cliente dado de baja:** no se le asignan misiones.

---

### US-31 — Reclamar recompensa de misión

| | |
|---|---|
| **Historia** | Como Cliente, quiero reclamar la recompensa asociada a una misión completada, cuando corresponda, para obtener el beneficio ganado |
| **RF** | RF-035 |
| **Roles** | Cliente |
| **Contrato** | §3.3.3, §2.7, §3.13 (`MISSION_REWARD_CLAIMED`) |
| **Depende de** | US-30 |

**Criterios de aceptación**

- **CA-31.1 [B+F] Reclamar.** Dada una Completada con 50 pts, "Reclamar recompensa" → `200`, Reclamada,
  movimiento `MISSION_REWARD` por +50, lote nuevo, saldo actualizado y toast "¡Sumaste 50 pts!".
- **CA-31.2 [B] El nivel no cambia** (`lifetimePoints` igual).
- **CA-31.3 [B+F] No reclamable:** En progreso, Reclamada, Vencida o sin recompensa → `409
  MISSION_NOT_CLAIMABLE` con el mensaje de cada caso; el botón no aparece si `canClaim` es `false`.
- **CA-31.4 [B] Ajena:** `404`.
- **CA-31.5 [B] Dos reclamos a la vez:** uno `200`, el otro `409`; un solo movimiento.
- **CA-31.6 [B] Auditoría** a nombre del Sistema, con "Reclamada por: Cliente".
- **CA-31.7 [B] Permisos:** Administrador y Cajero `403`.

---

### US-32 — Vencer y reiniciar misiones (backend)

| | |
|---|---|
| **Historia** | Como Sistema, quiero vencer automáticamente las misiones no completadas al finalizar el mes y habilitar las del nuevo período, para mantener la dinámica mensual |
| **RF** | RF-036 |
| **Contrato** | §3.4, §3.13 (`MISSIONS_EXPIRED`) |
| **Depende de** | US-30, US-31 |

**Criterios de aceptación**

- **CA-32.1 [B] Cuándo corre:** día 1 a las 00:10 (hora de Argentina), al iniciar y con `npm run
  missions:expire`; `MISSIONS_EXPIRATION_CRON_ENABLED=false` lo apaga.
- **CA-32.2 [B] En progreso → Vencida** con "Fin de mes".
- **CA-32.3 [B] Completada con recompensa → Reclamada** sola: puntos acreditados, `claimedBy = SYSTEM` y
  `MISSION_REWARD_CLAIMED` con "Reclamada por: Automático" (S5-5).
- **CA-32.4 [B] Completada sin recompensa:** queda igual (S5-4).
- **CA-32.5 [B] Una entrada `MISSIONS_EXPIRED`** por corrida con los totales; ninguna si no venció nada.
- **CA-32.6 [B] Idempotente** y una transacción por asignación (`SKIP LOCKED`); un fallo no frena el resto.
- **CA-32.7 [B] Mes nuevo:** el primer consumo o consulta del cliente en el mes nuevo le asigna las misiones
  vigentes desde cero.

---

### US-33 — Consultar misiones

| | |
|---|---|
| **Historia** | Como Cliente, quiero consultar las misiones vigentes y mi progreso en cada una, para saber qué puedo completar y cuánto me falta para lograrlo |
| **RF** | RF-037 (y RF-017: el personal también las consulta) |
| **Roles** | Cliente; Administrador y Cajero (las del cliente) |
| **Contrato** | §3.3.1, §3.3.2, §3.3.4 |
| **Depende de** | US-30 |

**Criterios de aceptación**

- **CA-33.1 [B+F] Mis misiones:** pestaña "Misiones" habilitada; tarjetas con nombre, descripción, barra
  "2 / 3 consumos" o "$ 12.000 / $ 20.000", recompensa, estado y "Termina el {día}"; vacío del contrato.
- **CA-33.2 [B] Asignar al consultar** las en curso que todavía no tenía (PD-14).
- **CA-33.3 [B+F] Meses anteriores** con `?period=`: Vencidas y Reclamadas.
- **CA-33.4 [F] Inicio:** tarjeta "Misiones" con cuántas tiene en progreso.
- **CA-33.5 [B+F] Personal:** `GET /customers/:id/misiones` en la ficha (pestaña "Misiones") y en el panel de
  Caja ("Misiones: {n} en progreso"), sin botón de reclamo.
- **CA-33.6 [B] Permisos y casos:** cliente inexistente `404`; dado de baja `[]`; Cliente `403` en
  `/customers/:id/misiones`.

---

### US-34 — Imagen de la recompensa

| | |
|---|---|
| **Historia** | Como Administrador, quiero cargar la imagen de una recompensa, para que los clientes la vean en el catálogo (parte de "Crear recompensa" que el Sprint 4 dejó para el 5, S4-17) |
| **RF** | RF-038 |
| **Roles** | Administrador (carga); todos (ven) |
| **Contrato** | §3.5.1, §3.5.2 |
| **Depende de** | BASE-5 y **PD-1** |

**Criterios de aceptación**

- **CA-34.9 [B+F] Subir y reemplazar** en el modal (vista previa, "Elegir imagen"); al crear, se sube después
  del `POST`. `photoUrl` versionada.
- **CA-34.10 [B+F] Quitar:** vuelve la imagen genérica.
- **CA-34.11 [B+F] Validación:** `400 INVALID_IMAGE` con el mensaje del contrato (por contenido y tamaño).
- **CA-34.12 [F] Se ve** en el listado, el catálogo del Cliente, el mostrador y los canjes.
- **CA-34.13 [B] Auditoría** `REWARD_UPDATED` con "Foto: Actualizada" o "Foto: Quitada".
- **CA-34.14 [B] `GET` público** con caché; `404` sin foto; Cajero y Cliente `403` en `PUT` y `DELETE`.

> Los CA-34.1 a CA-34.8 son los del Sprint 4 (`HISTORIAS_SPRINT_4.md`); se numeran a continuación.

---

### US-47 — Notificar vencimiento de puntos (backend)

| | |
|---|---|
| **Historia** | Como Cliente, quiero recibir una notificación antes de que mis puntos venzan, para poder utilizarlos a tiempo |
| **RF** | RF-050 |
| **Contrato** | §3.8 |
| **Depende de** | US-14 y **PD-10** |

**Criterios de aceptación**

- **CA-47.1 [B] Cuándo:** proceso diario a las 09:00 (hora de Argentina), al iniciar no; `npm run
  notifications:send`; `NOTIFICATIONS_CRON_ENABLED=false` lo apaga.
- **CA-47.2 [B] A quién:** clientes activos con lotes `ACTIVE` y saldo que vencen dentro de 7 días; un correo
  por cliente con `{puntos}` y `{fecha}`.
- **CA-47.3 [B] Una vez por lote** (no se repite al día siguiente).
- **CA-47.4 [B] Registro** con tipo, canal, fecha y destinatario; `SKIPPED` si el tipo está desactivado.
- **CA-47.5 [B] Un fallo** del proveedor queda `FAILED` y no frena al resto.

---

### US-48 — Notificar cumpleaños (backend)

| | |
|---|---|
| **Historia** | Como Cliente, quiero recibir una notificación automática de cumpleaños si registré mi fecha de nacimiento, para sentirme reconocido por La Vitto |
| **RF** | RF-051 |
| **Contrato** | §3.8 |
| **Depende de** | US-14 y **PD-18** |

**Criterios de aceptación**

- **CA-48.1 [B]** El proceso diario manda `BIRTHDAY` a los clientes activos con `dateOfBirth` de hoy (día y
  mes); el 29/02 se manda el 28/02 en años no bisiestos.
- **CA-48.2 [B]** Sin fecha de nacimiento, no se manda.
- **CA-48.3 [B]** Una vez por año por cliente.
- **CA-48.4 [B]** Registro, `SKIPPED` y `FAILED` como US-47.

---

### US-49 — Notificar promociones

| | |
|---|---|
| **Historia** | Como Cliente, quiero recibir notificaciones de promociones, para enterarme de las propuestas especiales de La Vitto |
| **RF** | RF-052 |
| **Roles** | Administrador (envía) |
| **Contrato** | §3.7.3, §3.8 |
| **Depende de** | US-14, US-15 |

**Criterios de aceptación**

- **CA-49.1 [B+F] Enviar** con confirmación "¿Enviar "{título}" a {n} clientes por correo?" → `202 {
  queued }`; `lastSentAt` actualizado.
- **CA-49.2 [B]** Solo a clientes activos; una vez por cliente por envío.
- **CA-49.3 [B+F]** Tipo desactivado → `409 NOTIFICATION_DISABLED`; promoción terminada → `409
  PROMOTION_FINISHED`.
- **CA-49.4 [B]** El envío sigue en segundo plano: la respuesta no espera a los correos.

---

### US-50 — Notificar avance de misiones (backend)

| | |
|---|---|
| **Historia** | Como Cliente, quiero recibir notificaciones sobre el avance o cumplimiento de una misión, para estar al tanto de mi progreso |
| **RF** | RF-053 |
| **Contrato** | §3.8 |
| **Depende de** | US-14, US-30 |

**Criterios de aceptación**

- **CA-50.1 [B]** Al completar una misión se manda `MISSION` con `{mision}`, **después del commit** del
  consumo.
- **CA-50.2 [B]** Un fallo del correo no deshace el consumo.
- **CA-50.3 [B]** Una vez por misión del mes por cliente.
- **CA-50.4 [B]** Registro y `SKIPPED` como US-47.

---

### US-51 — Estadísticas de clientes

| | |
|---|---|
| **Historia** | Como Administrador, quiero generar estadísticas de clientes activos, frecuentes y nuevos, para conocer la evolución de la base de clientes |
| **RF** | RF-054 |
| **Contrato** | §3.9 y §3.9.1 |
| **Depende de** | **PD-9**. No depende de BASE-5 (solo lee) |

**Criterios de aceptación**

- **CA-51.1 [B]** Activos, nuevos y frecuentes con datos conocidos (por ejemplo, 3 clientes con 3, 2 y 4
  consumos → 2 frecuentes).
- **CA-51.2 [B]** Período obligatorio, hora de Argentina; rango invertido y más de un año → `400`.
- **CA-51.3 [F]** Pantalla "Estadísticas y reportes" habilitada; selector de período; bloque Clientes.
- **CA-51.4 [B]** Cajero y Cliente: `403`.

### US-52 — Estadísticas de consumos por período

**RF-055 · Contrato §3.9.2.** CA-52.1 [B] totales y agrupación por día, semana o mes · CA-52.2 [B] por día de
la semana y por franja horaria (PD-9), en hora de Argentina · CA-52.3 [B] solo `REGISTERED` · CA-52.4 [F]
bloque Consumos · CA-52.5 [B] permisos.

### US-53 — Estadísticas de puntos

**RF-056 · Contrato §3.9.3.** CA-53.1 [B] otorgados, bonificación, recompensas de misión, canjeados, vencidos,
ajustes y anulaciones del período, con datos conocidos · CA-53.2 [F] bloque Puntos · CA-53.3 [B] permisos.

### US-54 — Estadísticas de niveles, misiones y recompensas

**RF-057 · Contrato §3.9.4.** CA-54.1 [B] distribución por nivel actual · CA-54.2 [B] por misión: asignadas,
completadas, reclamadas y vencidas · CA-54.3 [B] las 10 recompensas más canjeadas (canjes `USED`) · CA-54.4
[F] bloque Programa · CA-54.5 [B] permisos.

### US-55 — Exportar reportes generados

| | |
|---|---|
| **Historia** | Como Administrador, quiero exportar los reportes generados en formato PDF, para compartir o archivar la información del programa |
| **RF** | RF-058 |
| **Contrato** | §3.9.5 |
| **Depende de** | US-51 a US-54 y **PD-11** |

**Criterios de aceptación**

- **CA-55.1 [B]** `GET /estadisticas/reporte.pdf` responde `application/pdf` con el nombre del contrato.
- **CA-55.2 [B]** El PDF trae el logo, el período, la fecha de generación y las cuatro secciones.
- **CA-55.3 [F]** "Exportar reporte PDF" lo descarga con `shared/api/download.ts`.
- **CA-55.4 [B]** Mismas validaciones de período y permisos que US-51.

---

### FOTO-PERFIL — Foto de perfil del Cliente

| | |
|---|---|
| **Qué es** | La foto del Cliente en Mi perfil. Estaba en el Sprint 4 (decisión #9 del S3), pasó al 5 (PD-2 del S4) y no tiene RF ni US (S5-1). Hay que sumarla a RF-065 / US-59 (PD-22) |
| **Roles** | Cliente (carga); 🟡 Cajero y Administrador (ven) |
| **Contrato** | §3.5.1, §3.5.3 |
| **Depende de** | BASE-5, **PD-1** y **PD-12** |

**Criterios de aceptación**

- **CA-FP.1 [B+F] Subir y reemplazar** desde Mi perfil ("Cambiar foto" habilitado); `photoUrl` en `GET
  /customers/me`.
- **CA-FP.2 [B+F] Quitar:** vuelve el avatar con las iniciales.
- **CA-FP.3 [B+F] Validación** `INVALID_IMAGE`.
- **CA-FP.4 [F]** La foto en el encabezado del Cliente (y, si PD-12 lo confirma, en la tarjeta de Caja y en la
  ficha).
- **CA-FP.5 [B] No se audita.**
- **CA-FP.6 [B] Permisos:** solo el Cliente sube y quita la suya; el acceso al `GET` según PD-12.

---

### NIV-BEN — Beneficios de los niveles

| | |
|---|---|
| **Qué es** | La parte de RF-029 que US-27 no hizo: los beneficios de Bronce, Plata y Oro (S5-2) |
| **Roles** | Administrador (configura); Cliente (ve) |
| **Contrato** | §3.10 |
| **Depende de** | BASE-5 y **PD-20** |

**Criterios de aceptación**

- **CA-NB.1 [B+F] Configurar:** un campo "Beneficio" por nivel en Configuración → Puntos → Niveles (hasta 255,
  opcional); se guarda en una versión nueva de la configuración.
- **CA-NB.2 [B] Auditoría:** `LEVELS_UPDATED` suma "Beneficio {nivel}: {antes} → {después}".
- **CA-NB.3 [B+F] El Cliente lo ve:** `level.benefit` y `level.nextBenefit` en `…/puntos`; en Inicio: "Tu
  beneficio: …" y "Con {nivel siguiente}: …".
- **CA-NB.4 [B]** El beneficio no cambia los puntos de ningún consumo.

---

### CTA-CLI — Cuentas de los clientes

| | |
|---|---|
| **Qué es** | La parte de RF-08 que US-08 no hizo: el Administrador ve la cuenta de acceso de un cliente (S5-3) |
| **Roles** | Administrador |
| **Contrato** | §3.11 |
| **Depende de** | Nada (no usa BASE-5) |

**Criterios de aceptación**

- **CA-CC.1 [B+F]** `GET /customers/:id/cuenta` con email, rol, estado, `mustChangePassword`, nombre y apellido;
  sección "Cuenta de acceso" en Clientes → Ver más.
- **CA-CC.2 [B+F]** "Contraseña inicial sin cambiar" solo si `mustChangePassword`.
- **CA-CC.3 [B]** Sin cuenta → `404` "El cliente no tiene cuenta."; inexistente → `404` "No existe el cliente.".
- **CA-CC.4 [B]** Cajero y Cliente: `403`. No se audita (consulta).
