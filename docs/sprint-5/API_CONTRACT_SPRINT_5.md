# Contrato de API — Sprint 5 · Vitto Club

> **Alcance:** todo lo que el backend tiene que exponer para el **Sprint 5, el último** (Misiones,
> Notificaciones, Estadísticas, mensajes automáticos, envío de promociones y fotos), armado a partir de:
> - el Story Map del Sprint 5 del *Seguimiento del Proyecto* v1.7 (09/11/2026);
> - los RF-012, RF-013, RF-029, RF-031 a RF-038, RF-050 a RF-058 y RF-065 del *Plan de Proyecto* v1.6;
> - la sección 9 de la *Definición del Producto* v1.4 (máquina de estados "Misión mensual", **los cuadros**,
>   no las imágenes);
> - lo que los contratos de los Sprints 3 y 4 dejaron anotado para el Sprint 5 (§3.9.2 del S3 y §3.3 y §10 del
>   S4);
> - las decisiones de Deni del 09/11/2026 ([8.3](#83-decisiones-del-sprint-5));
> - los cambios del prototipo v2 del 11/11 y el 12/11/2026, a pedido de Deni (S5-34 a S5-50,
>   `docs/prototipo/v2/LEEME.md`);
> - el estado de `develop` al cierre del Sprint 4 (`docs/sprint-5/CIERRE_SPRINT_4.md`).
>
> **Historias:** US-14, US-15, US-28 a US-33, US-34 (imagen), US-47 a US-55, más los ítems que pasan al
> Sprint 5 porque no quedaron hechos antes (decisión S5-6): **FOTO-PERFIL**, **NIV-BEN** (beneficios de los
> niveles), **CTA-CLI** (cuentas de clientes, RF-08), **CI** (integración continua) y el **ARRASTRE-S4**.
>
> **Versión 2 (12/11/2026).** Sobre la v1 del 09/11 (decisiones S5-12 a S5-33), incorpora los cambios del
> prototipo v2 del 11/11 y el 12/11 (S5-34 a S5-50). Los más grandes:
> - las promociones **ya no se guardan**: se escriben desde cero y se envían en el momento o programadas, a
>   todos los clientes o a los de un nivel ([3.7](#37-envío-de-promociones-us-15-us-49));
> - el logo **ya no se configura** ([3.6](#36-mensajes-automáticos-y-puntos-de-cumpleaños-us-14));
> - los correos que fallaron **se pueden reenviar** a mano ([3.8.5](#385-reenviar-un-correo-que-falló));
> - el detalle de una misión muestra **quiénes la completaron** ([3.1.7](#317-get-apimisionesidcompletadas--quiénes-la-completaron));
> - las estadísticas se piden **por mes**, con gráficos de torta y barras, y el PDF se arma **con las secciones
>   elegidas** ([3.9](#39-estadísticas-y-reporte-pdf-us-51-a-us-55)).
>
> **Todo está decidido (✅)**: lo único que queda abierto es documentación fuera del repo
> ([10](#10-pendientes)).
>
> **Como es el último sprint**, las secciones [4](#4-información-general),
> [5](#5-convenciones-de-respuestas-y-códigos-de-error) y [6](#6-códigos-http) están **completas**: valen para
> todo el sistema y reemplazan a las de los contratos anteriores. El resto de los endpoints de los Sprints 1 a
> 4 no cambia: su detalle sigue en `docs/sprint-3/API_CONTRACT_SPRINT_3.md`,
> `docs/sprint-4/API_CONTRACT_SPRINT_4.md` y `docs/funcionalidades/`.
>
> **Si este contrato choca con `HISTORIAS_SPRINT_5.md`, manda el contrato.** Si choca con el prototipo, mirá
> la [8.1](#81-diferencias-del-prototipo-que-este-contrato-corrige).

**Convenciones de este documento**

- "UI" es el texto que muestra la pantalla. "API" es el valor que viaja en el JSON.
- Las decisiones se citan como "decisión S5-N" y están en la [8.3](#83-decisiones-del-sprint-5). Las de los
  sprints anteriores siguen valiendo ("decisión #N" del S3, "S4-N" del S4).
- **Numeración de historias:** la del Seguimiento v1.5 (US-56 registrar auditoría, US-57 consultar,
  US-58 autorregistro, US-59 perfil).
- **Máquinas de estado:** los nombres salen de la sección 9 de la Definición del Producto. Misión mensual por
  cliente: **En progreso, Completada, Reclamada, Vencida**.
- **No queda nada "Próximamente":** es el último sprint (S5-33). Lo que no esté en este contrato ni en un RF
  se pregunta.

**Las reglas de las misiones** (Definición del Producto §9 y decisiones S5-4 y S5-5):

1. Una misión mensual se asigna al cliente y nace **En progreso**.
2. Cada consumo que cumple la condición de la misión **suma avance**.
3. Al llegar al objetivo pasa a **Completada**. Si la misión **no tiene recompensa**, ahí termina: Completada
   es un estado final.
4. Si tiene recompensa, el cliente la **reclama** y pasa a **Reclamada**: recién ahí recibe los puntos.
5. A fin de mes: las que siguen **En progreso** pasan a **Vencida** (el cliente pierde la misión); las
   **Completadas con recompensa sin reclamar** se **reclaman solas** (Sistema) y pasan a **Reclamada**. Si la
   terminó, **nunca pierde la recompensa**.

---

## Tabla de contenido

1. [Resumen de endpoints](#1-resumen-de-endpoints)
2. [Enumerados](#2-enumerados)
3. [Endpoints](#3-endpoints)
   - [3.1 Misiones del Administrador (US-28, US-29)](#31-misiones-del-administrador-us-28-us-29)
   - [3.2 Progreso y cumplimiento (US-30)](#32-progreso-y-cumplimiento-us-30)
   - [3.3 Misiones del Cliente y reclamo (US-31, US-33)](#33-misiones-del-cliente-y-reclamo-us-31-us-33)
   - [3.4 Vencer y reiniciar misiones (US-32)](#34-vencer-y-reiniciar-misiones-us-32)
   - [3.5 Fotos: recompensa (US-34) y perfil del Cliente (FOTO-PERFIL)](#35-fotos-recompensa-us-34-y-perfil-del-cliente-foto-perfil)
   - [3.6 Mensajes automáticos y puntos de cumpleaños (US-14)](#36-mensajes-automáticos-y-puntos-de-cumpleaños-us-14)
   - [3.7 Envío de promociones (US-15, US-49)](#37-envío-de-promociones-us-15-us-49)
   - [3.8 Notificaciones (US-47 a US-50)](#38-notificaciones-us-47-a-us-50)
   - [3.9 Estadísticas y reporte PDF (US-51 a US-55)](#39-estadísticas-y-reporte-pdf-us-51-a-us-55)
   - [3.10 Beneficios de los niveles (NIV-BEN)](#310-beneficios-de-los-niveles-niv-ben)
   - [3.11 Cuentas de los clientes (CTA-CLI)](#311-cuentas-de-los-clientes-cta-cli)
   - [3.12 Integración continua (CI)](#312-integración-continua-ci)
   - [3.13 Cambios en pantallas y endpoints existentes](#313-cambios-en-pantallas-y-endpoints-existentes)
   - [3.14 Auditoría del Sprint 5](#314-auditoría-del-sprint-5)
   - [3.15 Modelo de datos nuevo (BASE-5)](#315-modelo-de-datos-nuevo-base-5)
4. [Información general](#4-información-general)
5. [Convenciones de respuestas y códigos de error](#5-convenciones-de-respuestas-y-códigos-de-error)
6. [Códigos HTTP](#6-códigos-http)
7. [Cambios respecto del Sprint 4](#7-cambios-respecto-del-sprint-4)
8. [Observaciones](#8-observaciones)
9. [Resumen por historia](#9-resumen-por-historia)
10. [Pendientes](#10-pendientes)

---

## 1. Resumen de endpoints

Todas las rutas cuelgan de `/api`. **A** = Administrador, **C** = Cajero, **Cl** = Cliente.

### Nuevos

| # | Método | Ruta | Roles | Para qué | Historia |
|---|---|---|---|---|---|
| 1 | `GET` | `/misiones` | A | Listado de misiones, con búsqueda, filtro y orden | US-28, US-29 |
| 2 | `GET` | `/misiones/:id` | A | Detalle y datos para editar | US-29 |
| 3 | `GET` | `/misiones/:id/completadas` | A | Clientes que la completaron en un mes (detalle de la misión) | US-29, US-33 |
| 4 | `POST` | `/misiones` | A | Crear misión mensual | US-28 |
| 5 | `PATCH` | `/misiones/:id` | A | Editar misión | US-29 |
| 6 | `PATCH` | `/misiones/:id/eliminar` | A | Dar de baja (lógica) | US-29 |
| 7 | `GET` | `/customers/me/misiones` | Cl | Misiones del mes con mi progreso | US-33 |
| 8 | `PATCH` | `/customers/me/misiones/:id/reclamar` | Cl | Reclamar la recompensa de una misión Completada | US-31 |
| 9 | `GET` | `/customers/:id/misiones` | A, C | Misiones del mes del cliente (ficha y Caja, RF-017) | US-33 |
| 10 | `PUT` | `/recompensas/:id/foto` | A | Subir o reemplazar la foto | US-34 |
| 11 | `DELETE` | `/recompensas/:id/foto` | A | Quitar la foto | US-34 |
| 12 | `PUT` | `/customers/me/foto` | Cl | Subir o reemplazar mi foto de perfil | FOTO-PERFIL |
| 13 | `DELETE` | `/customers/me/foto` | Cl | Quitar mi foto | FOTO-PERFIL |
| 14 | `GET` | `/configuracion/mensajes` | A | Mensajes automáticos y puntos de cumpleaños | US-14 |
| 15 | `PUT` | `/configuracion/mensajes` | A | Guardar mensajes, activar/desactivar y puntos de cumpleaños | US-14, US-48 |
| 16 | `GET` | `/promociones/destinatarios` | A | Cuántos clientes reciben una promoción (todos o un nivel) | US-15, US-49 |
| 17 | `POST` | `/promociones/envios` | A | Enviar una promoción ahora o programarla | US-15, US-49 |
| 18 | `GET` | `/promociones/envios` | A | Envíos programados que todavía no salieron | US-15, US-49 |
| 19 | `PATCH` | `/promociones/envios/:id/cancelar` | A | Cancelar un envío programado | US-15, US-49 |
| 20 | `GET` | `/notificaciones` | A | Historial de notificaciones | US-47 a US-50 |
| 21 | `POST` | `/notificaciones/:id/reenviar` | A | Reenviar un correo que falló | US-47 a US-50 |
| 22 | `GET`/`PUT` | `/loyalty/configuration/frequent-customers` | A | Mínimo de consumos de un "cliente frecuente" | US-51 |
| 23 | `GET` | `/estadisticas/clientes` | A | Clientes activos, frecuentes, nuevos y los últimos 6 meses | US-51 |
| 24 | `GET` | `/estadisticas/consumos` | A | Consumos del mes por día de la semana y franja horaria | US-52 |
| 25 | `GET` | `/estadisticas/puntos` | A | Puntos acreditados por origen, canjeados, vencidos y anulados | US-53 |
| 26 | `GET` | `/estadisticas/programa` | A | Niveles, subidas de nivel, misiones asignadas y recompensas más canjeadas | US-54 |
| 27 | `GET` | `/estadisticas/reporte.pdf` | A | Exportar el reporte del mes en PDF, con las secciones elegidas | US-55 |
| 28 | `GET` | `/customers/:id/cuenta` | A | Cuenta de acceso del cliente (RF-08) | CTA-CLI |

> **Ya no están** (v1 → v2): `PUT`/`GET /configuracion/logo` (S5-35), el ABM de `/promociones`,
> `POST /promociones/:id/enviar` y `GET /customers/me/promociones` (S5-36).

### Existentes que cambian en este sprint

| Método | Ruta | Qué cambia |
|---|---|---|
| `GET` | `/recompensas` | Suma `order` = `RECENT` (por defecto) · `OLDEST`, por fecha de alta (S5-45) |
| — | Mis canjes del Cliente | El filtro "Fecha" junta "Día específico" y "Rango" en **"Elegir fechas"**, con el calendario de Consumos (S5-41). `GET /customers/me/canjes` no cambia |
| `GET`/`PUT` | `/loyalty/configuration/levels` | Suma los **beneficios** de cada nivel ([3.10](#310-beneficios-de-los-niveles-niv-ben)) |
| `GET` | `/customers/me/puntos`, `/customers/:id/puntos` | `level` suma `benefit` y `nextBenefit` |
| `GET` | `/customers/me`, `/customers/:id`, `/customers/by-document` | Suman `photoUrl` ([3.5.3](#353-foto-de-perfil-del-cliente-foto-perfil)) |
| — | Tipo `Reward` | `photoUrl` deja de venir siempre en `null` ([3.5.2](#352-foto-de-la-recompensa-us-34)) |
| `POST` | `/consumos` | Suma avance de misiones en la misma transacción y devuelve `completedMissions` ([3.2](#32-progreso-y-cumplimiento-us-30)) |
| `PATCH` | `/consumos/:code/anular` | Resta el avance de las misiones En progreso del mismo mes (S5-21) |
| `GET` | `/customers/:id/movimientos`, `/customers/me/movimientos` | Aparecen los tipos `MISSION_REWARD` y `BIRTHDAY_BONUS` |
| `GET` | `/auditoria` | Se habilita el módulo `MISSIONS` y las acciones de [3.14](#314-auditoría-del-sprint-5) |

### Existentes que se eliminan

| Método | Ruta | Motivo |
|---|---|---|
| `GET` | `/movimientos-de-puntos` | Se quedó sin pantalla el 25/10 y el frontend borró su página el 09/11. Las estadísticas de puntos (US-53) lo reemplazan (S5-13) |

---

## 2. Enumerados

Los existentes de los Sprints 1 a 4 no cambian, salvo `PointsMovementType` y `AuditAction`. La lista completa
está en `docs/database/modelo-de-datos.md`.

### 2.1 `CustomerMissionStatus` — estado de la misión de un cliente

Sale de la máquina "Misión mensual" (Definición del Producto §9, cuadro) y de las decisiones S5-4 y S5-5.

| API | UI | Final | Cómo llega |
|---|---|---|---|
| `IN_PROGRESS` | En progreso | No | `asignar()` (nace así) y `registrarAvance()` |
| `COMPLETED` | Completada | **Sí, si la misión no tiene recompensa** (S5-4) | `completar()` al llegar al objetivo |
| `CLAIMED` | Reclamada | Sí | `reclamar()` del Cliente, o el reclamo automático de fin de mes o de baja de la misión (S5-5) |
| `EXPIRED` | Vencida | Sí | `vencer()` a fin de mes o al dar de baja la misión, solo desde En progreso |

### 2.2 `MissionStatus` — estado de la misión (catálogo)

La Definición del Producto no tiene máquina de la misión en sí, solo la del cliente. RF-032 pide "modificar o
dar de baja lógicamente".

| API | UI | Cuándo |
|---|---|---|
| `ACTIVE` | Activa | Al crearla. Se asigna a los clientes en los meses de su vigencia |
| `DELETED` | Dada de baja | El Administrador la elimina (estado final). El botón dice "Eliminar", como en Recompensas |

En la pantalla, una misión activa se muestra **"En curso"** (el mes actual está en su vigencia), **"Próxima"**
(empieza más adelante) o **"Finalizada"** (su último mes ya pasó). Se calcula con la fecha; no es un estado
guardado.

### 2.3 `MissionObjectiveType` — qué mide la misión (S5-15)

| API | UI | `target` | Cómo suma |
|---|---|---|---|
| `CONSUMPTION_COUNT` | Cantidad de consumos | Entero 1–100 | +1 por cada consumo que cumpla la condición |
| `CONSUMPTION_AMOUNT` | Monto acumulado | Monto 1–1.000.000, hasta 2 decimales | + el monto de cada consumo que cumpla la condición |

**Condición opcional**, combinable: días de la semana (`daysOfWeek`) y franja horaria (`timeFrom`, `timeTo`),
en hora de Argentina.

### 2.4 `NotificationType` (RF-050 a RF-053)

| API | UI | RF | Historia |
|---|---|---|---|
| `POINTS_EXPIRING` | Vencimiento de puntos | RF-050 | US-47 |
| `BIRTHDAY` | Cumpleaños | RF-051 | US-48 |
| `PROMOTION` | Promociones | RF-052 | US-49 |
| `MISSION` | Misiones | RF-053 | US-50 |

No hay aviso de canje rechazado: ningún RF lo pide y el Cliente lo ve en Mis canjes (S5-14).

`PROMOTION` **no es un mensaje automático**: no tiene plantilla ni interruptor. Cada promoción se escribe desde
cero al enviarla ([3.7](#37-envío-de-promociones-us-15-us-49), S5-37). Los mensajes automáticos son los otros
tres.

### 2.5 `NotificationChannel`

| API | UI |
|---|---|
| `EMAIL` | Correo electrónico |

Es el único canal (Seguimiento §2.6, Definición del Producto §10.1, S5-10). El correo es obligatorio para todo
cliente (RF-015).

### 2.6 `NotificationStatus`

| API | UI | Cuándo |
|---|---|---|
| `SENT` | Enviada | El proveedor aceptó el correo |
| `FAILED` | Falló | El proveedor respondió error. Se guarda el motivo. **No se reintenta solo**: el Administrador lo puede **reenviar** a mano una vez (S5-38, [3.8.5](#385-reenviar-un-correo-que-falló)) |
| `SKIPPED` | No enviada | El tipo estaba desactivado o el envío de correos está apagado en el entorno ([4](#4-información-general)) |

### 2.6.1 `PromotionSendStatus` — estado de un envío de promoción (S5-36)

| API | UI | Cuándo |
|---|---|---|
| `SCHEDULED` | Programado | Se programó para una fecha y hora futura |
| `SENT` | Enviado | Salió (en el momento, o el proceso de programados llegó a su hora). Final |
| `CANCELLED` | Cancelado | El Administrador lo canceló antes de que saliera. Final |

Un envío "ahora" nace directamente `SENT`.

### 2.7 `PointsMovementType` — valores nuevos

| API | UI (movimientos) | Cuándo |
|---|---|---|
| `MISSION_REWARD` | "Recompensa de misión: {misión}" (Cliente: "Ganaste {n} pts por la misión {misión}") | Al reclamar (Cliente o Sistema) |
| `BIRTHDAY_BONUS` | "Regalo de cumpleaños" (Cliente: "Te regalamos {n} pts por tu cumpleaños") | El proceso diario de cumpleaños (US-48, S5-25) |

Los dos crean un **lote** con la vigencia vigente y cancelan primero la deuda, como cualquier acreditación.
**Ninguno suma a los puntos acumulados** (`lifetimePoints`): el nivel se calcula "según sus puntos acumulados
por consumos" (RF-028 y Glosario del Plan de Proyecto, S5-9).

### 2.8 `AuditAction` — valores nuevos y los del Sprint 5

- Se empiezan a usar `MISSION_CREATED`, `MISSION_UPDATED`, `MISSION_DELETED`, `MISSION_COMPLETED`,
  `MISSION_REWARD_CLAIMED`, `MISSIONS_EXPIRED` y `LOGO_AND_MESSAGES_UPDATED` (ya existen en la base desde el
  Sprint 3). `AuditModule.MISSIONS` deja de mostrarse "(Próximamente)" y se puede elegir en el filtro.
- `LOGO_AND_MESSAGES_UPDATED` mantiene el nombre (ya está en la base), pero ahora **solo** registra los
  mensajes automáticos y los puntos de cumpleaños: el logo ya no se configura (S5-35). En pantalla:
  "Modificó logo y mensajes" (la etiqueta del filtro no cambia).
- `PROMOTIONS_UPDATED` **no se usa**: las promociones ya no se guardan (S5-36). Queda en el enum (no se borra un
  valor que ya está en la base), pero no aparece en el filtro de Auditoría.
- **Nuevos:** `BIRTHDAY_BONUS_GRANTED` (módulo `POINTS`, actor Sistema) y `FREQUENT_CUSTOMERS_UPDATED`
  (módulo `CONFIGURATION`, actor Administrador).
- Los **envíos de notificaciones no se auditan**, tampoco los de promociones, su programación, su cancelación ni
  los reenvíos: quedan en el historial de notificaciones (S5-28).

---

## 3. Endpoints

### 3.1 Misiones del Administrador (US-28, US-29)

#### 3.1.1 Tipo `Mission`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | number | No | |
| `name` | string | No | 1–80, único entre las no dadas de baja (sin distinguir mayúsculas ni espacios de los extremos) |
| `description` | string | Sí | Hasta 255 |
| `objectiveType` | `MissionObjectiveType` | No | [2.3](#23-missionobjectivetype--qué-mide-la-misión-s5-15) |
| `target` | number | No | Entero para `CONSUMPTION_COUNT`; monto con hasta 2 decimales para `CONSUMPTION_AMOUNT` |
| `daysOfWeek` | number[] | Sí | 1 (lunes) a 7 (domingo), sin repetir. `null` = todos los días |
| `timeFrom`, `timeTo` | string | Sí | `HH:mm`, hora de Argentina. Los dos o ninguno; `timeFrom < timeTo` |
| `rewardPoints` | number | Sí | 1–100.000. `null` = **sin recompensa** (RF-031: "opcionalmente") |
| `startMonth` | string | No | `YYYY-MM`. Primer mes en que se asigna. Al crear, no puede ser anterior al mes actual |
| `endMonth` | string | Sí | `YYYY-MM`. Último mes. `null` = **se repite todos los meses** mientras esté activa (S5-19) |
| `status` | `MissionStatus` | No | |
| `phase` | `"RUNNING"` \| `"UPCOMING"` \| `"FINISHED"` | No | Calculado ([2.2](#22-missionstatus--estado-de-la-misión-catálogo)) |
| `pendingChanges` | object | Sí | Si una edición rige desde el mes siguiente: `{ appliesFrom, objectiveType, target, daysOfWeek, timeFrom, timeTo, rewardPoints }` |
| `completedCount` | number | No | Clientes que la completaron **este mes** (Completada + Reclamada) |
| `createdAt`, `updatedAt` | string | No | ISO UTC |

#### 3.1.2 `GET /api/misiones` — listado

| Query | Regla |
|---|---|
| `q` | Parte del nombre, sin mayúsculas ni tildes (máx. 80) |
| `phase` | `RUNNING` · `UPCOMING` · `FINISHED` · sin valor = todas las no dadas de baja |
| `order` | `RECENT` (por defecto) · `OLDEST`: por `createdAt` descendente o ascendente (S5-45). Otro valor → `400` |
| `page` / `limit` | 1 / 10, máximo 100 |

Respuesta `{ items: Mission[], total, page, limit }`.

**Pantalla** (Administración → Misiones): título "Misiones mensuales", debajo "Hacé clic en una misión para ver
su detalle y quiénes la completaron.". Filtros: Buscar (nombre) · Estado (Todas · En curso · Próximas ·
Finalizadas) · **Orden** (Más recientes · Más antiguas). Columnas: Nombre · Objetivo (texto armado: "3
consumos", "$ 20.000 en consumos", más "los domingos de 09:00 a 13:00" si tiene condición) · Recompensa ("50
pts" o "Sin recompensa") · Vigencia ("Noviembre 2026 – Diciembre 2026" o "Desde noviembre 2026") · Completadas
este mes · Estado (badge) · chevron (›). **La fila no tiene botones: un clic abre el detalle de la misión**
([3.1.6](#316-get-apimisionesid--detalle)). Botón "+ Crear misión mensual". Paginado de a 10: "Mostrando 1–10
de N". Vacío: "No hay misiones para los filtros seleccionados."

#### 3.1.3 `POST /api/misiones` — crear (US-28)

Body: `name`, `description`, `objectiveType`, `target`, `daysOfWeek`, `timeFrom`, `timeTo`, `rewardPoints`,
`startMonth`, `endMonth`. El servidor pone `status`, fechas e `id` (campos de más → `400`).

| Campo | Mensaje |
|---|---|
| `name` vacío / > 80 | "El nombre es obligatorio." / "El nombre no puede superar los 80 caracteres." |
| `description` > 255 | "La descripción no puede superar los 255 caracteres." |
| `target` | "Ingresá un objetivo mayor a 0." · "El objetivo máximo es {máx}." · "Ingresá un número entero." (solo `CONSUMPTION_COUNT`) |
| `rewardPoints` | "Ingresá puntos enteros mayores a 0." · "El máximo es 100.000 puntos." |
| `daysOfWeek` vacío | "Elegí al menos un día o marcá «Todos los días»." |
| `timeFrom` / `timeTo` | "Completá las dos horas o ninguna." · "La hora de inicio tiene que ser anterior a la de fin." |
| `startMonth` | "El mes de inicio no puede ser anterior al mes actual." |
| `endMonth` | "El mes de fin no puede ser anterior al de inicio." |

| HTTP | `code` | Cuándo | Mensaje |
|---|---|---|---|
| 409 | `MISSION_NAME_IN_USE` | Nombre repetido entre las no dadas de baja | "Ya existe una misión con ese nombre." |

Éxito: `201` con `Mission`. Audita `MISSION_CREATED`.

**Modal en dos pasos** (S5-34) "Crear misión mensual" / "Editar misión", con el indicador "1 Objetivo · 2
Recompensa y vigencia":

1. **Objetivo:** Nombre; Descripción (opcional) con contador "n/255"; Tipo de objetivo (Cantidad de consumos /
   Monto acumulado) con un **?** que, **al pasar el mouse o al enfocarlo**, explica cada tipo (S5-44):
   - "Cantidad de consumos: cuenta cuántos consumos hace el cliente en el mes que cumplen los días y el horario
     elegidos. Ej.: objetivo 3 → tiene que venir 3 veces."
   - "Monto acumulado: suma el monto en $ de esos consumos. Ej.: objetivo $ 20.000 → sus consumos del mes
     tienen que sumar $ 20.000, en una o varias visitas."

   Objetivo; Días ("Todos los días" o elegir); Horario opcional "Desde" / "Hasta", con el botón **"Quitar
   horario"** cuando hay alguna hora cargada (borra las dos, S5-43). Botones Cancelar · **Siguiente**:
   valida el paso 1 (nombre, objetivo, días y horario) antes de pasar.
2. **Recompensa y vigencia:** arriba, un resumen "{nombre} · {objetivo, condición}"; Puntos, con la casilla
   "Sin recompensa", y "Los puntos de una misión no cuentan para el nivel del cliente."; Mes de inicio; Mes de
   fin, con la casilla "Se repite todos los meses". Botones Eliminar (solo al editar) · **Atrás** · Guardar
   misión.

El `POST` y el `PATCH` se mandan **una sola vez**, al guardar en el paso 2: los pasos son solo de la pantalla.
El nombre repetido (`409 MISSION_NAME_IN_USE`) se muestra en el campo Nombre del paso 1. Toast "Misión
guardada.".

#### 3.1.4 `PATCH /api/misiones/:id` — editar (US-29, S5-20)

Mismos campos y mensajes que crear, todos opcionales (al menos uno: "Modificá al menos un dato.").

- `name` y `description` se cambian siempre y en el momento.
- **Objetivo, condición y recompensa** (`objectiveType`, `target`, `daysOfWeek`, `timeFrom`, `timeTo`,
  `rewardPoints`):
  - si la misión **no tiene asignaciones este mes**, cambian en el momento;
  - si **ya tiene clientes este mes**, el cambio queda en `pendingChanges` y **rige desde el mes siguiente**:
    el mes actual sigue con el snapshot de cada asignación ([3.15](#315-modelo-de-datos-nuevo-base-5)), igual
    que el canje guarda los puntos de la recompensa (RF-014). La pantalla avisa: "Los cambios del objetivo y la
    recompensa se aplican desde {mes}. Este mes sigue igual para los clientes.".
- `startMonth` solo se puede cambiar si la misión todavía no empezó: "La misión ya empezó: no se puede cambiar
  el mes de inicio.".
- Una dada de baja o inexistente → `404` "No existe la misión.".

Éxito `200` con `{ mission, appliesFrom }` (`appliesFrom` = `null` si todo rigió en el momento). Audita
`MISSION_UPDATED` con una fila por campo que cambió y, si corresponde, "Rige desde: {mes}".

#### 3.1.5 `PATCH /api/misiones/:id/eliminar` — dar de baja (US-29, S5-20)

- Pasa a `DELETED` (final) y libera el nombre.
- En el mes en curso: las asignaciones **En progreso** pasan a **Vencida** con el motivo "Misión dada de
  baja"; las **Completadas con recompensa** se **reclaman solas** en ese momento (Sistema), para que nadie
  pierda una recompensa ganada (misma regla que S5-5). Las Completadas sin recompensa quedan igual.
- La pantalla avisa antes: '¿Eliminar la misión "{nombre}"? Los clientes que la tienen en progreso este mes la
  pierden. Los que ya la completaron reciben su recompensa.' Botones Cancelar · Eliminar. Toast "Misión
  eliminada.".
- Éxito `200` con `{ expired, claimed }`. Audita `MISSION_DELETED` y un `MISSION_REWARD_CLAIMED` (Sistema) por
  cada reclamo automático. Todo en una transacción.

#### 3.1.6 `GET /api/misiones/:id` — detalle

`Mission`. Dada de baja o inexistente: `404` "No existe la misión.".

**Pantalla: modal de detalle** (S5-34), al hacer clic en una fila. Título: el nombre; debajo "Estado: {badge}" y,
si hay `pendingChanges`, la etiqueta "Cambios desde {mes}". La descripción y cuatro recuadros: **Objetivo**
("3 consumos" y la condición o "Todos los días") · **Recompensa** · **Vigencia** · **Completadas este mes**.
Debajo, **"Clientes que la completaron"** con "{Mes año} · {n} clientes" y la tabla de
[3.1.7](#317-get-apimisionesidcompletadas--quiénes-la-completaron). Botones Cerrar · **Editar misión** (abre el
modal de dos pasos, con los `pendingChanges` si los hay).

#### 3.1.7 `GET /api/misiones/:id/completadas` — quiénes la completaron

Lista las asignaciones **Completadas y Reclamadas** de la misión en un mes (S5-34).

| Query | Regla |
|---|---|
| `period` | `YYYY-MM`. Sin valor = el mes actual. Hasta 12 meses atrás; más atrás o en el futuro: `400` "Elegí un mes de los últimos 12." |

Respuesta (sin paginado, por `completedAt` descendente):

```json
[
  { "customerMissionId": 41, "customer": { "id": 7, "firstName": "Martín", "lastName": "Gómez", "documentType": "DNI", "documentNumber": "41987654" }, "status": "COMPLETED", "completedAt": "2026-11-06T14:30:00.000Z", "claimedAt": null, "claimedBy": null, "rewardPoints": 50 }
]
```

- Misión dada de baja o inexistente: `404` "No existe la misión.". **No asigna** nada: solo lee.
- Consulta: no se audita.
- **Tabla:** Cliente · Documento ("DNI 41.987.654") · Completada (`dd/mm/aaaa hh:mm`) · Estado (badge). Debajo
  del estado: si está Reclamada, "Por el cliente · {fecha}" o "Por el sistema · {fecha}"; si está Completada,
  "Falta reclamar" (con recompensa) o "Sin recompensa". Vacío: "Ningún cliente completó esta misión este
  mes.".

---

### 3.2 Progreso y cumplimiento (US-30)

No tiene endpoint propio. Corre **dentro de la transacción de `POST /consumos`** (RF-033), después de acreditar
los puntos:

1. Para cada misión **en curso este mes** (`ACTIVE` y el mes dentro de su vigencia):
   - si el cliente **no la tiene asignada** este mes, se le asigna en ese momento (`asignar()` → En progreso),
     con el snapshot de la misión (S5-19: se asigna en el primer consumo o consulta del mes, no a todos de
     antemano);
   - si el consumo cumple la condición (días y franja horaria **del momento del consumo**, en hora de
     Argentina), `registrarAvance()`: +1 o + el monto;
   - si el progreso llega al objetivo: `completar()` → **Completada**, con `completedAt`. Audita
     `MISSION_COMPLETED` (Sistema) y publica `mission.completed`, que dispara la notificación `MISSION` (US-50)
     **después del commit** ([3.8](#38-notificaciones-us-47-a-us-50)).
2. Las Completadas, Reclamadas y Vencidas **no suman más**. El progreso nunca pasa el objetivo.
3. Si la misión **no tiene recompensa**, queda Completada (final, S5-4).
4. Si algo falla, se deshace el consumo entero (misma transacción).

La respuesta de `POST /consumos` suma `completedMissions: [{ id, name, rewardPoints }]`. "Consumo registrado"
muestra "¡{Nombre} completó la misión {misión}!" por cada una (como el aviso de nivel).

**Anular un consumo** (S5-21): dentro de la misma transacción, resta su avance (1 o su monto) **solo** en las
misiones del mismo mes del consumo que sigan **En progreso**. Si la misión ya está Completada o Reclamada, no
se revierte: la recompensa ganada no se quita.

**Clientes dados de baja:** no se les asignan misiones; las suyas En progreso vencen a fin de mes.

---

### 3.3 Misiones del Cliente y reclamo (US-31, US-33)

#### 3.3.1 Tipo `CustomerMission`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | number | No | Id de la asignación (no de la misión) |
| `mission` | `{ id, name, description }` | No | |
| `period` | string | No | `YYYY-MM` |
| `objectiveType`, `target`, `daysOfWeek`, `timeFrom`, `timeTo`, `rewardPoints` | | | **Snapshot** de la misión al asignarla |
| `progress` | number | No | Nunca mayor que `target` |
| `status` | `CustomerMissionStatus` | No | |
| `completedAt` | string | Sí | |
| `claimedAt` | string | Sí | |
| `claimedBy` | `"CUSTOMER"` \| `"SYSTEM"` | Sí | Solo si está Reclamada. El Cliente ve "Reclamada" igual en los dos casos |
| `canClaim` | boolean | No | `true` solo si está Completada y tiene recompensa (solo en las rutas del Cliente) |
| `endsAt` | string | No | Último día del mes, `YYYY-MM-DD` |

#### 3.3.2 `GET /api/customers/me/misiones` — Mis misiones (US-33)

- Sin `period`: las misiones **del mes actual**. Primero asigna las en curso que el cliente todavía no tenía
  (S5-19). Orden: En progreso, Completada, Reclamada; después, por nombre.
- `?period=YYYY-MM`: un mes anterior (hasta 12 meses atrás; más atrás o en el futuro: `400` "Elegí un mes de
  los últimos 12."). Trae las Vencidas, Reclamadas y Completadas de ese mes.
- Respuesta `CustomerMission[]` (sin paginado).

**Pantalla** (Cliente → pestaña **Misiones**): título "Misiones del mes" y "Termina el {día}". Una tarjeta por
misión: nombre, descripción, barra de progreso "2 / 3 consumos" o "$ 12.000 / $ 20.000", recompensa ("50 pts" o
"Sin recompensa"), estado y, si `canClaim`, el botón **"Reclamar recompensa"**. Selector "Meses anteriores".
Vacío: "No hay misiones este mes. ¡Volvé pronto!". En **Inicio**, la tarjeta "Misiones" muestra "{n} en
progreso" y "Ver misiones".

#### 3.3.3 `PATCH /api/customers/me/misiones/:id/reclamar` (US-31)

1. Bloquea la asignación (`FOR UPDATE`). Si no es del cliente del token o no existe: `404` "No existe la
   misión.".
2. Si no está Completada: `409 MISSION_NOT_CLAIMABLE` con "La misión todavía no está completada." (En
   progreso), "La recompensa de esta misión ya se reclamó." (Reclamada) o "La misión venció." (Vencida).
3. Si no tiene recompensa: `409 MISSION_NOT_CLAIMABLE` "Esta misión no tiene recompensa.".
4. Acredita `rewardPoints` con `PointsService` (movimiento `MISSION_REWARD`, lote con la vigencia vigente,
   deuda primero). Bloquea `customer_points` después de la asignación. **No toca `lifetimePoints`.**
5. Pasa a **Reclamada** con `claimedAt` y `claimedBy = CUSTOMER`.
6. Audita `MISSION_REWARD_CLAIMED` a nombre del **Sistema** (el Cliente nunca es actor de la auditoría).
7. Responde `200 { customerMission, balanceAfter }`. Toast: "¡Sumaste {n} pts!".

Cliente dado de baja con token vivo: `401`, como el resto de `/customers/me`.

#### 3.3.4 `GET /api/customers/:id/misiones` (A, C)

Lo mismo que 3.3.2 (con `period` opcional) para un cliente identificado (RF-017), sin `canClaim` (el reclamo es
solo del Cliente). Cliente inexistente: `404` "No existe el cliente.". Dado de baja: `[]`. **No asigna**
misiones (solo lee): las que todavía no tiene asignadas este mes aparecen con `progress: 0` y estado En
progreso, sin `id` (`null`).

**Pantallas:** ficha del cliente (Administrador) → pestaña nueva **"Misiones"**; tarjeta del cliente en Caja →
línea "Misiones: {n} en progreso".

---

### 3.4 Vencer y reiniciar misiones (US-32)

Proceso automático, sin endpoint (RF-036). Corre el **día 1 de cada mes a las 00:10, hora de Argentina** (después
del vencimiento de puntos de las 00:05), una vez **al iniciar** el servidor y a demanda con `npm run
missions:expire`. Variable `MISSIONS_EXPIRATION_CRON_ENABLED` (prendida por defecto, `false` en los e2e), con el
mismo patrón que los otros procesos.

Para cada asignación de un mes **ya terminado**, en su propia transacción (`FOR UPDATE SKIP LOCKED`):

| Estado | Pasa a | Qué hace |
|---|---|---|
| En progreso | **Vencida** (`vencer()`), motivo "Fin de mes" | Nada más: el cliente pierde la misión (S5-5) |
| Completada con recompensa | **Reclamada** (reclamo automático) | Acredita los puntos como 3.3.3, con `claimedBy = SYSTEM`. Audita `MISSION_REWARD_CLAIMED` (Sistema) |
| Completada sin recompensa | (queda igual) | Es final (S5-4) |

Al terminar, **una** entrada `MISSIONS_EXPIRED` (Sistema) con "Período · Misiones vencidas · Recompensas
reclamadas automáticamente". Si no hubo nada que vencer ni reclamar, no se audita.

**"Habilitar las del nuevo período"** (RF-036): las misiones activas vigentes el mes nuevo se asignan solas en
el primer consumo o consulta de cada cliente (S5-19). Si la misión tenía `pendingChanges` con `appliesFrom` =
el mes nuevo, el proceso los aplica a la misión antes de terminar.

Es idempotente: correrlo dos veces no cambia nada.

---

### 3.5 Fotos: recompensa (US-34) y perfil del Cliente (FOTO-PERFIL)

#### 3.5.1 Reglas comunes de las imágenes (S5-12)

| Regla | Valor |
|---|---|
| Formato del pedido | `multipart/form-data`, campo `photo`. `multer` viene con `@nestjs/platform-express` |
| Tipos | JPG, PNG o WebP, **validados por el contenido** del archivo, no por la extensión |
| Tamaño | Hasta 2 MB |
| Error | `400 INVALID_IMAGE` "Usá una imagen JPG, PNG o WebP de hasta 2 MB." |
| Dónde se guardan | **Cloudinary** (dependencia `cloudinary`, autorizada). El backend sube el archivo y guarda el `public_id` y la URL; nunca guarda la imagen |
| Carpetas | `vitto-club/rewards`, `vitto-club/customers` |
| Recompensas | Entrega **pública** (`type: upload`). `photoUrl` = la `secure_url` de Cloudinary |
| Fotos de perfil | Entrega **autenticada** (`type: authenticated`). El backend devuelve una **URL firmada que vence a la hora**, generada en cada respuesta (S5-23) |
| Reemplazar o quitar | El backend borra la imagen anterior en Cloudinary después del commit. Si el borrado falla, queda en el log: no deshace la operación |
| Variables | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `IMAGES_STORAGE_ENABLED` (en `false` en desarrollo sin cuenta y en los e2e: un adaptador falso valida el archivo y devuelve una URL de prueba) |

El backend accede a Cloudinary por un puerto propio (`ImageStorage`) con dos adaptadores: Cloudinary y el falso.

#### 3.5.2 Foto de la recompensa (US-34)

- `PUT /api/recompensas/:id/foto` (A): sube o reemplaza. `200 { photoUrl }`. Audita `REWARD_UPDATED` con
  "Foto: Actualizada".
- `DELETE /api/recompensas/:id/foto` (A): `204`. Audita `REWARD_UPDATED` con "Foto: Quitada". Sin foto: `404`
  "La recompensa no tiene foto.".
- Recompensa dada de baja o inexistente: `404` "No existe la recompensa.". La foto de una dada de baja **no se
  borra** de Cloudinary: la siguen mostrando los canjes viejos.
- `photoUrl` viaja en todas las respuestas de `Reward` (listado, catálogo, mostrador, canjes).
- **Pantalla:** en el modal Crear / Editar, "Foto que verán los clientes" deja de decir "Próximamente": vista
  previa, "Elegir imagen" y "Quitar". Al crear, la foto se sube **después** del `POST` (con el id nuevo); si la
  subida falla, la recompensa queda creada sin foto y se avisa "La recompensa se guardó, pero no se pudo subir
  la foto.". Sin foto, todas las pantallas siguen con la imagen genérica.

#### 3.5.3 Foto de perfil del Cliente (FOTO-PERFIL, S5-1 y S5-23)

- `PUT /api/customers/me/foto` (Cl): `200 { photoUrl }`.
- `DELETE /api/customers/me/foto` (Cl): `204`. Sin foto: `404` "No tenés foto de perfil.".
- **No se audita** (lo que el cliente cambia en su perfil no se audita, regla del S3).
- **La ven el Cliente, el Cajero y el Administrador** (S5-23): `photoUrl` (URL firmada, `null` sin foto) se suma
  a `GET /customers/me`, `GET /customers/:id` y `GET /customers/by-document`.
- **Pantallas:** en Mi perfil, "Cambiar foto" (elegir, vista previa, "Quitar foto"); el avatar del encabezado del
  Cliente; la tarjeta del cliente en Caja → Buscar cliente; la ficha del cliente (Administrador). Sin foto: el
  avatar con las iniciales.

#### 3.5.4 Logo

**No se configura** (S5-35): la pantalla del logo se sacó de Configuración → Notificaciones. La aplicación y los
correos usan el logo fijo de Vitto Club (`frontend/src/assets/` en la app; el backend lo lleva en sus
recursos para los correos y el PDF). No hay endpoints de logo.

---

### 3.6 Mensajes automáticos y puntos de cumpleaños (US-14)

RF-012: "configurar el logo de la organización y los mensajes automáticos de notificación". El logo queda fijo
(S5-35, pendiente de ajustar el RF: [10](#10-pendientes)); se configuran los mensajes automáticos.

#### 3.6.1 `GET /api/configuracion/mensajes` (A)

```json
{
  "birthdayBonusPoints": 100,
  "messages": [
    { "type": "POINTS_EXPIRING", "active": true, "subject": "Tus puntos están por vencer", "body": "Hola {nombre}: tenés {puntos} pts que vencen el {fecha}. ¡Usalos antes de que caduquen!" },
    { "type": "BIRTHDAY", "active": true, "subject": "¡Feliz cumpleaños!", "body": "¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts para celebrar con nosotros." },
    { "type": "MISSION", "active": true, "subject": "¡Completaste una misión!", "body": "¡Bien, {nombre}! Completaste la misión {mision}. Entrá a Vitto Club para ver tu recompensa." }
  ]
}
```

Son los textos por defecto que carga BASE-5 (basados en los del prototipo). **`PROMOTION` no está**: cada
promoción se escribe desde cero ([3.7](#37-envío-de-promociones-us-15-us-49), S5-37).

**Variables por tipo**, que se reemplazan al enviar:

| Tipo | Variables |
|---|---|
| `POINTS_EXPIRING` | `{nombre}`, `{puntos}`, `{fecha}` |
| `BIRTHDAY` | `{nombre}`, `{puntos}` |
| `MISSION` | `{nombre}`, `{mision}` |
| `PROMOTION` (en cada envío) | `{nombre}` |

Una variable que no corresponde al tipo → `400` "La variable {variable} no se puede usar en este mensaje.".

#### 3.6.2 `PUT /api/configuracion/mensajes` (A)

Body `{ birthdayBonusPoints, messages: [{ type, active, subject, body }] }` con los **tres** tipos automáticos.
Un mensaje de tipo `PROMOTION` → `400` "Las promociones no tienen mensaje automático.".

| Campo | Regla y mensaje |
|---|---|
| `subject` | 1–120: "El asunto es obligatorio." / "El asunto no puede superar los 120 caracteres." |
| `body` | 1–1.000: "El mensaje es obligatorio." / "El mensaje no puede superar los 1.000 caracteres." |
| `birthdayBonusPoints` | Entero 0–10.000 (0 = no regala puntos): "Ingresá puntos enteros de 0 a 10.000." |

Éxito `200` (mismo cuerpo que el `GET`). Audita **una** entrada `LOGO_AND_MESSAGES_UPDATED` con una fila por
cambio ("Mensaje de cumpleaños: Modificado", "Vencimiento de puntos: Activado → Desactivado", "Puntos de
cumpleaños: 100 → 150"). Si no cambió nada: "Cambios: Se guardó sin modificar valores" (S3-24).

**Pantalla:** Configuración → **Notificaciones** (subtítulo "Mensajes que el sistema envía automáticamente a los
clientes, envío de promociones e historial de envíos."), pestaña **Mensajes**, de arriba abajo:

1. "Puntos de regalo por cumpleaños" (campo Puntos).
2. "Mensajes automáticos": una fila por tipo (**Vencimiento de puntos, Cumpleaños y Misiones**; Promociones no
   está) con el interruptor "Activa" / "Desactivada" y "Editar mensaje" (modal con Asunto, Mensaje, "Podés usar:
   …" y una vista previa con datos de ejemplo). Botones Descartar · "Guardar cambios".
3. La tarjeta **"Promociones"** ([3.7.5](#375-pantalla)).

No hay sección de logo (S5-35).

---

### 3.7 Envío de promociones (US-15, US-49)

RF-013: "definir promociones especiales aplicables al programa (por ejemplo, vinculadas a la pizza libre de los
viernes o a la merienda buffet de los domingos)". RF-052: "enviar notificaciones de promociones".

**Una promoción es un correo informativo** (S5-16): **no cambia los puntos** de ningún consumo. **No se guarda
como catálogo** (S5-36): no hay listado de promociones, ni edición, ni baja, ni tarjeta para el Cliente. Cada vez
que el Administrador quiere comunicar una promoción, escribe el asunto y el mensaje **desde cero** (S5-37), elige
**a quién** va (todos los clientes activos o los de un nivel) y **cuándo** sale (ahora o en una fecha y hora,
S5-39). Lo único que queda guardado es el **envío** (para poder programarlo) y, cuando sale, cada correo en el
historial de notificaciones.

#### 3.7.1 Tipo `PromotionSend`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | number | No | |
| `subject` | string | No | 1–120. Puede usar `{nombre}` |
| `body` | string | No | 1–1.000. Puede usar `{nombre}` |
| `level` | `"BRONZE"` \| `"SILVER"` \| `"GOLD"` | Sí | `null` = **todos los clientes activos**. Si tiene nivel, los clientes activos cuyo nivel **actual** es ese (calculado con `lifetimePoints` y los umbrales vigentes, como siempre) |
| `scheduledAt` | string | Sí | ISO UTC. `null` = se envió en el momento |
| `status` | `PromotionSendStatus` | No | [2.6.1](#261-promotionsendstatus--estado-de-un-envío-de-promoción-s5-36) |
| `recipients` | number | No | Clientes que lo reciben. En los `SCHEDULED`, la cuenta al momento de la consulta; al salir, la cuenta real |
| `sentAt` | string | Sí | Cuándo salió |
| `createdBy` | `{ id, firstName, lastName }` | No | El empleado que lo cargó |
| `createdAt` | string | No | |

#### 3.7.2 `GET /api/promociones/destinatarios` (A)

`?level=BRONZE|SILVER|GOLD` (sin valor = todos los clientes activos) → `{ count }`. Sirve para "Le llega a {n}
clientes activos." del modal. Nivel inválido → `400`.

#### 3.7.3 `POST /api/promociones/envios` (A) — enviar ahora o programar

Body `{ subject, body, level, scheduledAt }`.

| Campo | Regla y mensaje |
|---|---|
| `subject` | 1–120: "El asunto es obligatorio." / "El asunto no puede superar los 120 caracteres." |
| `body` | 1–1.000: "El mensaje es obligatorio." / "El mensaje no puede superar los 1.000 caracteres." |
| Variables | Solo `{nombre}`: "La variable {variable} no se puede usar en este mensaje." |
| `level` | `null` o `BRONZE` / `SILVER` / `GOLD` |
| `scheduledAt` | `null` = ahora. Si viene, tiene que ser **posterior a ahora**: "La fecha y hora tienen que ser posteriores a ahora." (en la pantalla, si eligió "Programar" y no completó la fecha: "Elegí la fecha y la hora del envío.") |

- **Ahora** (`scheduledAt = null`): se guarda el envío como `SENT`, se manda el correo `PROMOTION` a cada
  destinatario **en segundo plano** ([3.8.3](#383-cómo-se-envía)) y responde **`202 { id, queued: n }`**.
  Toast: "Se está enviando la promoción a {n} clientes.".
- **Programado**: se guarda `SCHEDULED` y responde **`201 PromotionSend`**. Toast: "Promoción programada para
  el {dd/mm/aaaa hh:mm} ({n} clientes).".
- Si no hay ningún destinatario, se guarda igual y el envío sale con 0 correos (no es error).
- Cada correo reemplaza `{nombre}` con el nombre del cliente y queda en el historial con `type = PROMOTION` y
  `dedupe_key` "promotion-send:{id}" (un solo correo por cliente y por envío).
- **No hay interruptor** para las promociones: el tipo `PROMOTION` no se desactiva (S5-37). El envío de correos
  apagado en el entorno registra `SKIPPED`, como siempre.
- **No se audita** (S5-28): queda en el historial.

#### 3.7.4 Programados

- `GET /api/promociones/envios` (A): los `SCHEDULED`, por `scheduledAt` ascendente (sin paginado). Respuesta
  `PromotionSend[]`.
- `PATCH /api/promociones/envios/:id/cancelar` (A): pasa a `CANCELLED` → `200 PromotionSend`. Inexistente:
  `404` "No existe el envío.". Si ya no está `SCHEDULED`: `409 PROMOTION_SEND_NOT_CANCELLABLE` "El envío ya
  salió o se canceló.". Toast: "Se canceló el envío programado.". No se audita.
- **Proceso de programados** (S5-39): corre **cada minuto**, con `@nestjs/schedule`, variable
  `PROMOTIONS_CRON_ENABLED` (prendida por defecto, `false` en los e2e) y comando `npm run promotions:send`. Toma
  los `SCHEDULED` con `scheduledAt <= ahora` (`FOR UPDATE SKIP LOCKED`), los pasa a `SENT` con `sentAt` y
  `recipients`, y manda los correos después del commit. Es idempotente: el `dedupe_key` evita correos repetidos.

#### 3.7.5 Pantalla

Configuración → Notificaciones → pestaña Mensajes, tarjeta **"Promociones"**: "Escribí el asunto y el mensaje de
cada promoción desde cero, elegí a quién va y si sale ahora o en una fecha y hora. No se guarda: solo quedan los
envíos en el historial." y el botón **"+ Enviar promoción"**.

- Si hay programados, debajo la lista **"Envíos programados"**: asunto, "Sale el {dd/mm/aaaa hh:mm}" ·
  "Todos los clientes" o "Nivel {Bronce / Plata / Oro}" · "{n} clientes", y el botón "Cancelar envío".
- **Modal "Enviar promoción"** (arranca **vacío**):
  - Asunto (placeholder "Ej: ¡Este viernes, pizza libre!") y Mensaje con contador "n/1000" (placeholder "Ej:
    Hola {nombre}: todos los viernes de 20:00 a 23:30, pizza libre para toda la mesa."); "Podés usar:
    {nombre}.".
  - **Cuándo se envía:** selector "Ahora" / "Programar"; con "Programar", un campo de fecha y hora (no se puede
    elegir una pasada).
  - **Destinatarios:** "Todos los clientes activos" · "Clientes de nivel Bronce" · "… Plata" · "… Oro"; debajo,
    "Le llega a {n} clientes activos." (con [3.7.2](#372-get-apipromocionesdestinatarios-a)).
  - Vista previa del correo con el logo fijo, el asunto y el mensaje ("Asunto de la promoción" y "Mensaje de la
    promoción." en gris mientras están vacíos) y "La promoción no se guarda: solo quedan los envíos en el
    historial.".
  - Botones Cancelar · **"Enviar ahora"** o **"Programar envío"** (según el selector).

---

### 3.8 Notificaciones (US-47 a US-50)

#### 3.8.1 Cuándo se envía cada una

| Tipo | Disparador | Destinatarios | Historia |
|---|---|---|---|
| `POINTS_EXPIRING` | Proceso diario a las **09:00** (hora de Argentina) | Clientes activos con lotes `ACTIVE` y saldo que vencen **dentro de 7 días** (S5-17). Un correo por cliente con el total (`{puntos}`) y la fecha más próxima (`{fecha}`); una sola vez por lote | US-47 |
| `BIRTHDAY` | Proceso diario a las **09:00** | Clientes activos cuyo `dateOfBirth` es hoy (día y mes). El 29/02 se toma el 28/02 en años no bisiestos | US-48 |
| `PROMOTION` | `POST /promociones/envios` (ahora) o el proceso de programados a la hora elegida ([3.7](#37-envío-de-promociones-us-15-us-49)) | Todos los clientes activos o los de un nivel | US-49 |
| `MISSION` | Al completar una misión ([3.2](#32-progreso-y-cumplimiento-us-30)), después del commit | El cliente | US-50 |

- Si el tipo está desactivado, no se envía y se registra `SKIPPED`. `PROMOTION` no tiene interruptor (S5-37).
- **No se repite:** el mismo tipo al mismo cliente por el mismo motivo (el mismo lote, el mismo cumpleaños, la
  misma misión del mes, el mismo envío de promoción) se envía una sola vez (índice único,
  [3.15](#315-modelo-de-datos-nuevo-base-5)).
- Proceso diario: `npm run notifications:send`, variable `NOTIFICATIONS_CRON_ENABLED` (prendida por defecto,
  `false` en los e2e). No corre al iniciar el servidor.

#### 3.8.2 Puntos de cumpleaños (US-48, S5-25)

El proceso diario de cumpleaños, por cada cliente que cumple años hoy y en su propia transacción:

1. Si `birthdayBonusPoints > 0` **y el tipo `BIRTHDAY` está activo**, acredita esos puntos (movimiento
   `BIRTHDAY_BONUS`, lote con la vigencia vigente, deuda primero; **no suma al nivel**) y audita
   `BIRTHDAY_BONUS_GRANTED` (Sistema) con "Puntos otorgados · Saldo resultante". Una sola vez por cliente y por
   año.
2. Después del commit, manda el correo con `{puntos}`.

Los puntos se acreditan aunque el envío de correos esté apagado en el entorno o el correo falle: el regalo no
depende del correo.

#### 3.8.3 Cómo se envía

- Proveedor: **Resend** (dependencia `resend`, autorizada; S5-10). Puerto `EmailSender` con dos adaptadores:
  Resend y uno que solo deja el envío en el log.
- Variables: `RESEND_API_KEY`, `NOTIFICATIONS_FROM` (remitente) y `NOTIFICATIONS_EMAIL_ENABLED`. **En
  desarrollo y en los e2e va en `false`**: no se manda nada, se registra `SKIPPED` y queda en el log.
- El correo lleva el logo fijo de Vitto Club ([3.5.4](#354-logo)), el asunto y el mensaje con las variables reemplazadas, y el pie
  fijo "Recibís este correo porque sos parte de Vitto Club.".
- El envío **nunca** va dentro de la transacción de negocio: un correo que falla no deshace un consumo, un
  reclamo ni un regalo de cumpleaños.
- Un correo que falla queda `FAILED` con el motivo. **No se reintenta solo**: el Administrador lo puede reenviar a
  mano ([3.8.5](#385-reenviar-un-correo-que-falló), S5-38).

#### 3.8.4 Registro (RF-050 a RF-053)

Cada notificación se guarda con **tipo, canal, fecha y destinatario** (lo que piden los RF), más el cliente, el
asunto, el mensaje, el estado, el motivo del error si falló y, si es un reenvío, el registro original. Solo inserción, como los movimientos de puntos.

`GET /api/notificaciones` (A): filtros `type`, `status`, `documentType` + `documentNumber` (parcial, como en
Canjes), `fromDate`, `toDate`; paginado de a 20, por fecha descendente. Respuesta `{ items, total, page, limit }`
con `{ id, createdAt, type, channel, recipient, customer: { id, firstName, lastName, documentType,
documentNumber }, subject, status, error, resentFromId, resent }`:

- `resentFromId` (`number | null`): si este registro es el reenvío de otro, el id del que había fallado.
- `resent` (`boolean`): `true` si este registro `FAILED` ya se reenvió (hay otro con `resentFromId` = su id).

**Pantalla:** Configuración → Notificaciones → pestaña **Historial**: filtros Tipo, Estado, documento del cliente
y **Fechas** (un solo campo con calendario para elegir inicio y fin, como el de Consumos, S5-40); columnas Fecha
y hora · Tipo (con el asunto debajo) · Cliente · Destinatario · Estado (con el error debajo si falló; "Reenvío
de un correo que falló." o "Ya se reenvió." según corresponda) · botón **"Reenviar"** solo en las `FAILED` que
todavía no se reenviaron. Vacío: "No hay notificaciones para los filtros seleccionados."

#### 3.8.5 Reenviar un correo que falló

`POST /api/notificaciones/:id/reenviar` (A, S5-38). Sin body.

1. Inexistente: `404` "No existe la notificación.".
2. Si no está `FAILED`: `409 NOTIFICATION_NOT_RESENDABLE` "Solo se pueden reenviar los correos que fallaron.".
3. Si ya se reenvió: `409 NOTIFICATION_NOT_RESENDABLE` "Este correo ya se reenvió.". Se reenvía **una sola vez**
   (índice único sobre `resent_from_id`).
4. Si el tipo está desactivado (`POINTS_EXPIRING`, `BIRTHDAY` o `MISSION`): `409 NOTIFICATION_DISABLED` "Las
   notificaciones de {tipo} están desactivadas.".
5. Inserta un registro **nuevo** con el mismo tipo, cliente, destinatario (el email **actual** del cliente) y
   asunto, y `resent_from_id` = el que falló; el que falló **queda como estaba** (solo inserción). Manda el
   correo en segundo plano, con el mismo texto que el original, y responde `202 { id, queued: 1 }`.
6. Toast: "Correo reenviado a {email}.". **No se audita** (S5-28). El nuevo registro puede quedar `SENT`,
   `FAILED` (y no se puede volver a reenviar) o `SKIPPED` (envío apagado en el entorno).

---

### 3.9 Estadísticas y reporte PDF (US-51 a US-55)

Todas son consultas (no se auditan), solo del Administrador. **El período es un mes** (S5-42): filtro común
`month` (`YYYY-MM`, obligatorio), en hora de Argentina; se toman los consumos y movimientos del día 1 a las
00:00 al último día a las 23:59:59 de ese mes.

| Caso | Respuesta |
|---|---|
| Falta `month` | `400` "Elegí un mes." |
| Formato inválido | `400` "El mes tiene que tener el formato AAAA-MM." |
| Mes futuro | `400` "No se puede elegir un mes que todavía no empezó." |
| Anterior a enero del año pasado | `400` "Elegí un mes desde enero de {año pasado}." (la pantalla ofrece el año actual y el anterior) |

El mes actual se puede elegir: trae lo que va del mes.

#### 3.9.1 `GET /api/estadisticas/clientes` (US-51, RF-054)

```json
{ "active": 184, "new": 23, "frequent": 70, "frequentMinConsumptions": 3, "last6Months": [{ "month": "2026-06", "new": 30, "withConsumptions": 169 }] }
```

- **Activos:** clientes no dados de baja al final del mes (o hoy, si es el mes actual).
- **Nuevos:** dados de alta en el mes.
- **Frecuentes:** con **al menos `frequentMinConsumptions`** consumos `REGISTERED` en el mes. El mínimo lo
  configura el Administrador (S5-22, [3.9.6](#396-mínimo-de-un-cliente-frecuente)).
- **`last6Months`:** los 6 meses que terminan en el mes elegido (incluido), en orden: clientes nuevos y
  clientes con al menos un consumo `REGISTERED` en cada mes.

#### 3.9.2 `GET /api/estadisticas/consumos` (US-52, RF-055)

Solo consumos `REGISTERED` del mes. **Ya no hay `groupBy` ni "por período"** (S5-42).

```json
{
  "total": { "count": 606, "amount": 9751700 },
  "byWeekday": [{ "weekday": 1, "count": 78, "amount": 1261100 }],
  "byTimeSlot": [{ "from": "08:00", "to": "12:00", "count": 145, "amount": 2340408 }]
}
```

**Franjas horarias** (S5-22): 00:00–08:00, 08:00–12:00, 12:00–16:00, 16:00–20:00 y 20:00–24:00, en hora de
Argentina. `byWeekday` trae los 7 días (1 = lunes … 7 = domingo) y `byTimeSlot` las 5 franjas, aunque alguna
tenga 0.

#### 3.9.3 `GET /api/estadisticas/puntos` (US-53, RF-056)

`{ awarded, bonus, missionRewards, birthdayBonus, redeemed, expired, voided }`, sumando los movimientos del mes
por tipo (valores absolutos): consumos (`EARNED`), bonificación por primer consumo, misiones, cumpleaños,
canjes usados, vencimientos y anulaciones. **Los ajustes no se muestran** (S5-42): no vienen en la respuesta.

#### 3.9.4 `GET /api/estadisticas/programa` (US-54, RF-057)

```json
{
  "levels": [{ "level": "BRONZE", "customers": 120 }, { "level": "SILVER", "customers": 50 }, { "level": "GOLD", "customers": 14 }],
  "levelUps": 17,
  "missions": { "assigned": 226, "inProgress": 133, "completed": 31, "claimed": 62, "expired": 0 },
  "topRewards": [{ "id": 1, "name": "Café + medialuna", "used": 72 }],
  "redemptionsUsed": 148
}
```

- **`levels`:** el nivel **actual** de los clientes activos.
- **`levelUps`** (S5-47): clientes activos cuyo nivel **al final del mes** (o hoy, si es el mes actual) es más
  alto que el que tenían **al empezar el mes**, a cualquier nivel. Se calcula con `lifetimePoints` antes y
  después (sumando los movimientos que lo cambian) y los umbrales de la configuración vigente en cada momento.
- **`missions`:** totales de las asignaciones **del mes**, por estado: `completed` = **Completadas sin
  reclamar** (no incluye las Reclamadas, que van en `claimed`). `assigned` = la suma de los cuatro.
  `inProgress` solo puede ser mayor que 0 en el mes actual; en un mes cerrado ya vencieron o se reclamaron.
- **`topRewards`:** las 10 recompensas con más canjes `USED` en el mes (incluye dadas de baja, con su nombre del
  snapshot). **`redemptionsUsed`:** el total de canjes `USED` del mes, para el porcentaje de cada una (S5-48).

#### 3.9.5 `GET /api/estadisticas/reporte.pdf` (US-55, RF-058)

`?month=YYYY-MM&sections=CUSTOMERS,CONSUMPTIONS,POINTS,PROGRAM` (S5-49):

- `sections`: una o más, separadas por coma, sin repetir. Falta o vacía: `400` "Elegí al menos una sección.".
  Un valor que no existe: `400`.
- Responde `application/pdf` con `Content-Disposition: attachment;
  filename="vitto-club-reporte-{YYYY-MM-01}-{YYYY-MM-último día}.pdf"`. Contenido: logo fijo, título "Reporte
  Vitto Club", el mes, la fecha de generación y **solo las secciones elegidas**, en el orden Clientes ·
  Consumos · Puntos · Programa, con tablas. Se arma con **PDFKit** (dependencia `pdfkit`, autorizada; S5-11).
  El frontend lo baja con `shared/api/download.ts`.

#### 3.9.6 Mínimo de un cliente frecuente

- `GET /api/loyalty/configuration/frequent-customers` (A) → `{ minConsumptions: 3 }`.
- `PUT /api/loyalty/configuration/frequent-customers` (A), body `{ minConsumptions }`: entero 1–100 ("Ingresá
  un número entero de 1 a 100."). Se guarda en la **versión** de la configuración del programa (RF-014). Audita
  `FREQUENT_CUSTOMERS_UPDATED` con "Mínimo de consumos: {antes} → {después}".
- **Pantalla:** Configuración → Puntos, tarjeta "Clientes frecuentes" ("Un cliente es frecuente si tiene al
  menos {n} consumos en el período. Se usa en Estadísticas y reportes."). En Estadísticas, "Frecuentes (al
  menos {n} consumos)".

#### 3.9.7 Pantalla

Administración → **Estadísticas y reportes**. Título y "Elegí el mes y el año para ver los números del
programa.". Arriba a la derecha: selectores **Mes** (enero a diciembre; los meses futuros del año actual,
deshabilitados) y **Año** (el actual y el anterior), por defecto el mes actual, y el botón **"Exportar reporte
PDF"**. Pestañas **Clientes · Consumos · Puntos · Programa** y "Período: {Mes año}" (más "(mes en curso)" si es
el actual). Carga: "Cargando…". Error: "No se pudieron cargar las estadísticas.".

**Gráficos** (S5-27, S5-46): todos con **CSS**, sin librería: barras con `div` y tortas con
`conic-gradient`. Paleta pastel de la gama del naranja con dos tonos de apoyo, en este orden: durazno
`#f0945e`, turquesa `#2aa0b8`, mostaza `#d6a23a`, lavanda `#b07ad0` y terracota `#c4604f` (validada para que se
distinga con daltonismo; como el contraste es bajo, **todos los valores van escritos** junto al gráfico).
Todos los números de la pantalla usan la misma letra (la del texto, en negrita y con cifras del mismo ancho).
Pasar el mouse por una barra o una fila muestra el detalle.

| Pestaña | Qué muestra |
|---|---|
| **Clientes** | Tarjetas Clientes activos · Clientes nuevos · Frecuentes. Torta "Clientes activos": Frecuentes (al menos {n} consumos) y Resto de los activos, con cantidad y %. Columnas "Últimos 6 meses": Con consumos y Nuevos por mes (`last6Months`) |
| **Consumos** | Tarjetas Consumos y Monto total ("Sin los consumos anulados"). Columnas "Por día de la semana" (Lun … Dom, con la cantidad arriba y el monto abajo; el día más fuerte resaltado y "Día más fuerte: {día}") y "Por franja horaria" (igual, con "Franja más fuerte: {franja}") |
| **Puntos** | Tarjetas Acreditados (`awarded + bonus + missionRewards + birthdayBonus`) · Canjeados · Vencidos · Anulados. Torta "De dónde salen los puntos" (Consumos, Bonificación por primer consumo, Misiones, Cumpleaños, con cantidad y %; en el centro el total y "pts acreditados") y "Los puntos de misiones y de cumpleaños no cuentan para el nivel.". Barras "Qué pasó con los puntos": Acreditados, Canjeados, Vencidos, Anulados, y "Usados del total acreditado" = canjeados ÷ acreditados, en % |
| **Programa** | Torta "Misiones asignadas" por estado, con cantidad y %: **En progreso solo si es el mes actual** (S5-50), Completada ("Falta que el cliente la reclame o la misión no tiene recompensa."), Reclamada ("Se acreditaron los puntos.") y Vencida. Torta "Clientes por nivel" (Bronce, Plata, Oro) y debajo **"Subieron de nivel en el mes: {%}"** = `levelUps` ÷ activos, con la barra y "{n} clientes pasaron a un nivel más alto, a cualquiera." (S5-47). Barras "Recompensas más canjeadas" con la cantidad y el **%** sobre `redemptionsUsed` (S5-48) |

Las sumas y porcentajes de esta tabla son **las únicas cuentas** que hace la pantalla con estos datos.

**Modal "Exportar reporte PDF"** (S5-49): "Elegí las secciones que van en el reporte de {Mes año}."; una casilla
por sección, todas marcadas al abrir: **Clientes** ("Activos, nuevos, frecuentes y últimos 6 meses") ·
**Consumos** ("Por día de la semana y por franja horaria") · **Puntos** ("Origen de los puntos y qué pasó con
ellos") · **Programa** ("Misiones, clientes por nivel y recompensas"). Botón **"Deseleccionar todo"**, que pasa a
**"Seleccionar todo"** cuando falta alguna. Sin ninguna marcada: "Elegí al menos una sección." y "Descargar PDF"
deshabilitado. Botones Cancelar · Descargar PDF.

---

### 3.10 Beneficios de los niveles (NIV-BEN)

RF-029: "consultar los niveles de fidelización (Bronce, Plata, Oro), su puntaje mínimo y sus beneficios
asociados". Pasan a este sprint (S5-2).

- Un beneficio es un **texto** de hasta 255 caracteres por nivel. **No cambia el cálculo de puntos**: es
  informativo (S5-26).
- `GET /loyalty/configuration/levels` suma `bronzeBenefit`, `silverBenefit` y `goldBenefit` (`string | null`).
- `PUT /loyalty/configuration/levels` los acepta (opcionales; vacío = `null`). Mensaje: "El beneficio no puede
  superar los 255 caracteres.". Se guardan en la **versión** de la configuración (RF-014).
- `LEVELS_UPDATED` suma una fila por beneficio que cambió: "Beneficio Plata: {antes} → {después}" (vacío "—").
- `level` de `GET /customers/me/puntos` y `/customers/:id/puntos` suma `benefit` y `nextBenefit` (`null` en Oro).
- **Pantalla:** Configuración → Puntos → Niveles suma un campo "Beneficio" por nivel (el prototipo lo llama
  "Observaciones": se usa "Beneficio"). En el Inicio del Cliente, debajo del nivel: "Tu beneficio: {texto}" y
  "Con {nivel siguiente}: {texto}" (solo si hay texto). En la ficha del cliente, junto al nivel.

---

### 3.11 Cuentas de los clientes (CTA-CLI)

RF-08: "visualizar la cuenta de acceso de un usuario, **cualquiera sea su rol**, incluyendo su nombre y
apellido, el rol asignado y el estado de su credencial". Hoy `/usuarios` solo muestra empleados (S5-3).
**Solo consulta** (S5-29).

#### 3.11.1 `GET /api/customers/:id/cuenta` (A)

```json
{ "accountId": 31, "email": "lucia@example.com", "role": "CUSTOMER", "active": true, "mustChangePassword": false, "firstName": "Lucía", "lastName": "Fernández", "createdAt": "2026-10-20T14:00:00.000Z" }
```

- Cliente sin cuenta (cargado antes de US-17-AJ y no migrado): `404` "El cliente no tiene cuenta.".
- Cliente inexistente: `404` "No existe el cliente.".
- No se audita (consulta).

**Pantalla:** en Clientes → "Ver más", una sección **"Cuenta de acceso"**: Email · Rol "Cliente" · Estado
("Activa" / "Dada de baja") · y, solo si `mustChangePassword`, "Contraseña inicial sin cambiar". Solo lectura.

---

### 3.12 Integración continua (CI)

El Seguimiento (§2.6) y la Definición del Producto (§10.1) declaran GitHub Actions (S5-30). Sin dependencias
nuevas.

- Archivo `.github/workflows/ci.yml`, que corre en cada Pull Request a `develop` y `main`.
- **Backend:** `npm ci`, `npm run lint`, `npm test` y `npm run build`.
- **Frontend:** `npm ci`, `npm run lint` y `npm run build`.
- Los **e2e no corren en el CI** (necesitan PostgreSQL): siguen en local antes del merge.
- **Vitest y Testing Library no se suman** (S5-30): se sacan del Seguimiento §2.6. El frontend se sigue
  verificando con el recorrido manual con mocks, registrado en cada historia.

---

### 3.13 Cambios en pantallas y endpoints existentes

| Dónde | Cambio |
|---|---|
| Menú de Administración | "Misiones" y "Estadísticas y reportes" dejan de estar deshabilitados |
| Configuración | "Notificaciones" deja de estar deshabilitada (mensajes, promociones e historial). **No hay opción "Promociones"** (S5-36). En "Puntos", la tarjeta "Clientes frecuentes" y el campo "Beneficio" en Niveles; las tarjetas de Puntos son **compactas**: menos aire entre el contenido, el botón y los bordes (S5-41) |
| Vista del Cliente | Pestaña "Misiones" habilitada; tarjeta Misiones en Inicio (**sin tarjeta de Promociones**, S5-36); beneficio del nivel; foto en el encabezado y en Mi perfil |
| Encabezado del Administrador | **Sin botón "Volver"** (S5-41). Todos los modales tienen su cruz para cerrar |
| Recompensas (Administrador) | Filtro **Orden**: Más recientes (por defecto) · Más antiguas (S5-45) |
| Cliente → Mis canjes | Filtro Fecha: Cualquiera · Hoy · Últimos 7 días · Este mes · **Elegir fechas** (calendario de inicio y fin, como Consumos; S5-41) |
| Auditoría | El módulo **Misiones** se puede elegir (sin "(Próximamente)"); acciones nuevas en el filtro: "Regaló puntos de cumpleaños" (Puntos) y "Modificó cliente frecuente" (Configuración); **no** está "Modificó promociones" |
| Consumo registrado | "¡{Nombre} completó la misión {misión}!" por cada `completedMissions` |
| Ficha del cliente (Administrador) | Pestaña "Misiones", foto y beneficio del nivel |
| Buscar cliente (Caja) | Foto en la tarjeta y "Misiones: {n} en progreso" |
| Clientes → Ver más | Sección "Cuenta de acceso" |
| Recompensas | Foto real en el listado, el catálogo, el mostrador y los canjes |
| Movimientos (todas las vistas) | Tipos `MISSION_REWARD` y `BIRTHDAY_BONUS` |
| `GET /movimientos-de-puntos` | Se elimina (S5-13) |

---

### 3.14 Auditoría del Sprint 5

#### 3.14.1 Qué se audita y qué no

| Acción | Actor | Se audita |
|---|---|---|
| Crear, editar y dar de baja misiones | Administrador | Sí (`MISSION_CREATED`, `MISSION_UPDATED`, `MISSION_DELETED`) |
| Completar una misión | Sistema | Sí (`MISSION_COMPLETED`) |
| Reclamar la recompensa (Cliente, fin de mes o baja de la misión) | **Sistema** | Sí (`MISSION_REWARD_CLAIMED`). El Cliente nunca es actor |
| Vencer las misiones del mes | Sistema | Sí (`MISSIONS_EXPIRED`, una por corrida) |
| Regalo de cumpleaños | Sistema | Sí (`BIRTHDAY_BONUS_GRANTED`) |
| Mensajes automáticos y puntos de cumpleaños | Administrador | Sí (`LOGO_AND_MESSAGES_UPDATED`) |
| Enviar, programar o cancelar una promoción | — | **No**: es un envío; queda en el historial (S5-28, S5-36) |
| Reenviar un correo que falló | — | **No**: queda en el historial (S5-38) |
| Mínimo de cliente frecuente | Administrador | Sí (`FREQUENT_CUSTOMERS_UPDATED`) |
| Beneficios de los niveles | Administrador | Sí (`LEVELS_UPDATED`) |
| Foto de la recompensa | Administrador | Sí (`REWARD_UPDATED`, "Foto: Actualizada / Quitada") |
| Foto de perfil del Cliente | — | **No** (perfil del cliente) |
| Envío de notificaciones (incluido el de una promoción) | — | **No**: quedan en el historial de notificaciones (S5-28) |
| Estadísticas, PDF, cuenta del cliente, quiénes completaron una misión | — | No (consultas) |

#### 3.14.2 `description` y `details`

| Acción | `description` | Cliente afectado | Código | `details` |
|---|---|---|---|---|
| `MISSION_CREATED` | Creó la misión "{nombre}" | — | — | Objetivo · Condición · Recompensa · Vigencia |
| `MISSION_UPDATED` | Editó la misión "{nombre}" | — | — | Una fila por campo que cambió · "Rige desde: {mes}" si aplica |
| `MISSION_DELETED` | Dio de baja la misión "{nombre}" | — | — | Vencidas: {n} · Reclamadas automáticamente: {n} (solo si n > 0) |
| `MISSION_COMPLETED` | Completó la misión "{nombre}" de {cliente} | Sí | — | Misión · Objetivo · Período |
| `MISSION_REWARD_CLAIMED` | Reclamó la recompensa de la misión "{nombre}" de {cliente} | Sí | — | Misión · Puntos otorgados · Saldo resultante · Reclamada por: Cliente / Automático |
| `MISSIONS_EXPIRED` | Venció las misiones del mes | — | — | Período · Misiones vencidas · Recompensas reclamadas automáticamente |
| `BIRTHDAY_BONUS_GRANTED` | Regaló puntos de cumpleaños a {cliente} | Sí | — | Puntos otorgados · Saldo resultante |
| `LOGO_AND_MESSAGES_UPDATED` | Modificó los mensajes automáticos | — | — | Una fila por cambio (mensajes, activación, puntos de cumpleaños) |
| `FREQUENT_CUSTOMERS_UPDATED` | Modificó el mínimo de cliente frecuente | — | — | Mínimo de consumos: {antes} → {después} |

En el filtro de Auditoría: `BIRTHDAY_BONUS_GRANTED` = "Regaló puntos de cumpleaños" (módulo Puntos) y
`FREQUENT_CUSTOMERS_UPDATED` = "Modificó cliente frecuente" (módulo Configuración). `PROMOTIONS_UPDATED` no
aparece (no se usa, S5-36).

> **Cambio respecto del contrato S3 §3.9.3:** allí `MISSION_COMPLETED` tenía "Misión · Puntos otorgados". Como
> los puntos se dan **al reclamar** (Definición del Producto §9), "Puntos otorgados" pasa a
> `MISSION_REWARD_CLAIMED` ([7](#7-cambios-respecto-del-sprint-4) #6).

---

### 3.15 Modelo de datos nuevo (BASE-5)

Lo construye **BASE-5** en una sola migración (`sprint5_base5_missions_notifications`), como BASE-4. Los
`CHECK` e índices parciales se escriben a mano y un test verifica que existan.

#### `Mission` → tabla `missions`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | serial | No | |
| `name` | varchar(80) | No | Único parcial `lower(trim(name)) WHERE status <> 'DELETED'` (`missions_active_name_key`) |
| `description` | varchar(255) | Sí | |
| `objective_type` | `MissionObjectiveType` | No | |
| `target` | decimal(12,2) | No | `CHECK target > 0`; entero si `CONSUMPTION_COUNT` |
| `days_of_week` | smallint[] | Sí | `CHECK` valores 1–7 |
| `time_from`, `time_to` | time | Sí | `CHECK` los dos o ninguno y `time_from < time_to` |
| `reward_points` | int | Sí | `CHECK NULL o 1–100000` |
| `start_month`, `end_month` | date (día 1) | `end_month` sí | `CHECK end_month >= start_month` |
| `pending_changes` | jsonb | Sí | Cambios que rigen desde `pending_changes.appliesFrom` |
| `status` | `MissionStatus` | No | Por defecto `ACTIVE` |
| `created_at`, `updated_at`, `deleted_at` | timestamp | `deleted_at` sí | `CHECK (status = 'DELETED') = (deleted_at IS NOT NULL)` |

#### `CustomerMission` → tabla `customer_missions`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | serial | No | |
| `mission_id` | int → `missions` | No | |
| `customer_id` | int → `customers` | No | `UNIQUE (mission_id, customer_id, period)` |
| `period` | date (día 1 del mes) | No | |
| `objective_type`, `target`, `days_of_week`, `time_from`, `time_to`, `reward_points` | | | **Snapshot** de la misión al asignar |
| `progress` | decimal(12,2) | No | `CHECK 0 <= progress <= target` |
| `status` | `CustomerMissionStatus` | No | |
| `completed_at`, `claimed_at`, `expired_at` | timestamp | Sí | `CHECK` coherentes con el estado |
| `claimed_by` | varchar(10) (`CUSTOMER` / `SYSTEM`) | Sí | `CHECK` solo en `CLAIMED` |
| `expiration_reason` | varchar(100) | Sí | "Fin de mes" o "Misión dada de baja"; `CHECK` solo en `EXPIRED` |

Índices: `(status, period)` para el proceso de fin de mes; `(customer_id, period)`.

#### `PointsMovement` — cambios

- Valores nuevos `MISSION_REWARD` y `BIRTHDAY_BONUS`.
- Columna `customer_mission_id` (FK, nullable) con `CHECK (type = 'MISSION_REWARD') = (customer_mission_id IS
  NOT NULL)` (`points_movements_mission_check`).

#### `LoyaltyProgramConfiguration` — columnas nuevas

`bronze_benefit`, `silver_benefit`, `gold_benefit` (varchar(255), nullable) y `frequent_min_consumptions` (int, por
defecto 3, `CHECK 1–100`).

#### `NotificationTemplate` → tabla `notification_templates`

Una fila por tipo **automático** (`POINTS_EXPIRING`, `BIRTHDAY`, `MISSION`; `CHECK type <> 'PROMOTION'`):
`type` (PK), `active`, `subject` (varchar 120), `body` (varchar 1000), `updated_at`. La migración carga los textos
de [3.6.1](#361-get-apiconfiguracionmensajes-a).

#### `NotificationSettings` → tabla `notification_settings` (fila única, `id = 1`)

`birthday_bonus_points` (int, por defecto 100, `CHECK 0–10000`) y `updated_at`. **Sin columnas de logo**
(S5-35).

#### `Notification` → tabla `notifications` (RF-050 a RF-053)

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | serial | No | |
| `type` | `NotificationType` | No | Tipo (RF) |
| `channel` | `NotificationChannel` | No | Canal (RF) |
| `recipient` | varchar(150) | No | Destinatario (RF): el email en ese momento |
| `customer_id` | int → `customers` | No | |
| `subject` | varchar(120) | No | Ya con las variables reemplazadas |
| `body` | varchar(1000) | No | El mensaje, ya con las variables reemplazadas (lo usa el reenvío) |
| `status` | `NotificationStatus` | No | |
| `error` | varchar(500) | Sí | `CHECK` solo en `FAILED` |
| `dedupe_key` | varchar(100) | No | `UNIQUE (type, customer_id, dedupe_key)`: "lot:{id}", "birthday:{año}", "mission:{customer_mission_id}", "promotion-send:{id}", "resend:{id del que falló}" |
| `promotion_send_id` | int → `promotion_sends` | Sí | Solo en `PROMOTION`; `CHECK (type = 'PROMOTION') = (promotion_send_id IS NOT NULL)` |
| `resent_from_id` | int → `notifications` | Sí | `UNIQUE` (se reenvía una sola vez). Si tiene valor, el original tiene que estar `FAILED` (lo valida el servicio) |
| `created_at` | timestamp | No | Fecha (RF) |

Solo inserción (trigger, como `audit_logs`).

#### `PromotionSend` → tabla `promotion_sends` (S5-36, S5-39)

No hay tabla `promotions`: la promoción no se guarda como catálogo, solo cada envío.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | serial | No | |
| `subject` | varchar(120) | No | Con `{nombre}` sin reemplazar |
| `body` | varchar(1000) | No | Con `{nombre}` sin reemplazar |
| `level` | varchar(10) | Sí | `CHECK level IN ('BRONZE', 'SILVER', 'GOLD')`. `null` = todos los clientes activos |
| `scheduled_at` | timestamp | Sí | `null` = salió en el momento |
| `status` | `PromotionSendStatus` | No | `CHECK` coherente: `SCHEDULED` con `scheduled_at` y sin `sent_at`; `SENT` con `sent_at` |
| `sent_at`, `cancelled_at` | timestamp | Sí | |
| `recipients` | int | Sí | Al salir |
| `created_by_employee_id` | int → `employees` | No | |
| `created_at` | timestamp | No | |

Índice `(status, scheduled_at)` para el proceso de programados.

#### Fotos (en Cloudinary)

No hay tabla de imágenes: `rewards` y `customers` suman `photo_public_id` y `photo_url` (nullable; `photo_url`
solo para las públicas). Para las fotos de perfil, la URL firmada se genera en cada respuesta con el
`photo_public_id`.

#### Relaciones

```
Mission         1 ── 0..N CustomerMission
Customer        1 ── 0..N CustomerMission
CustomerMission 1 ── 0..1 PointsMovement (MISSION_REWARD, solo si se reclamó)
Customer        1 ── 0..N Notification
PromotionSend   1 ── 0..N Notification (PROMOTION)
Notification    1 ── 0..1 Notification (reenvío)
Employee        1 ── 0..N PromotionSend
```

Todas con `onDelete: Restrict`.

---

## 4. Información general

Vale para **todo el sistema** (Sprints 1 a 5).

| | |
|---|---|
| **URL base** | `/api` relativa. En desarrollo, el proxy de Vite la manda a `http://localhost:3000`; en producción, un *rewrite* de Vercel a Render |
| **Formato** | JSON. En `POST`, `PUT` y `PATCH` con cuerpo: `Content-Type: application/json`. Las fotos: `multipart/form-data` |
| **Autenticación** | `Authorization: Bearer <accessToken>` (JWT de 15 minutos) en todos los endpoints salvo los públicos. El refresh token va en la cookie httpOnly `refresh_token`, `Path=/api`, `SameSite=Lax` (`withCredentials: true`) |
| **Públicos** | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/health` |
| **Autorización** | `@Roles(...)` por endpoint. **Un endpoint sin `@Roles` ni `@Public` queda cerrado para todos.** Las reglas por rol se validan en el backend. Los `403` no se auditan |
| **Campos desconocidos** | `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`: cualquier campo o query param de más → `400 property X should not exist` |
| **Fechas de entrada** | Días en `YYYY-MM-DD` y meses en `YYYY-MM`, en hora de Argentina (UTC−03:00). Fecha y hora (`scheduledAt`): ISO 8601 |
| **Fechas de salida** | ISO 8601 en UTC. Fechas sin hora en `YYYY-MM-DD`. Horas sin fecha en `HH:mm`. La pantalla muestra `dd/mm/aaaa hh:mm` en hora de Argentina |
| **Montos** | Número JSON con hasta 2 decimales. Sin código de moneda |
| **Puntos** | Siempre enteros. Con signo en los movimientos |
| **Paginación** | `page` (≥ 1, por defecto 1) y `limit` (1–100; por defecto 20, o el que diga cada endpoint). Respuesta `{ items, total, page, limit }` |
| **Orden de las rutas** | `/customers/me/…` antes que `/customers/:id/…`; las palabras fijas (`/recompensas/disponibles`) antes que `/:id` |
| **Transacciones** | Todo lo que escribe va en la transacción ambiente (`PrismaTransactionRunner`), con la auditoría y los eventos de dominio. Los correos, las subidas a Cloudinary y los PDF van **fuera** |
| **Bloqueos** | `customer_points` en todo lo que mueve puntos. Al usar un canje: recompensa → canje → saldo. Al confirmar un canje: la recompensa. Al reclamar una misión: asignación → saldo |
| **Procesos automáticos** | Seis, con `@nestjs/schedule`, cada uno con su variable (prendida por defecto, `false` en los e2e) y su comando: puntos (00:05), recompensas vencidas (00:05 y al iniciar), canjes vencidos (cada 5 min y al iniciar), **misiones (día 1, 00:10, y al iniciar)**, **notificaciones (09:00)** y **promociones programadas (cada minuto, `PROMOTIONS_CRON_ENABLED`, `npm run promotions:send`)** |
| **CORS** | Origen por variable de entorno `CORS_ORIGIN` (por defecto `http://localhost:5173`), con credenciales |
| **Correo** | Resend. `NOTIFICATIONS_EMAIL_ENABLED=false` en desarrollo y en los e2e |
| **Imágenes** | Cloudinary. `IMAGES_STORAGE_ENABLED=false` en los e2e y en desarrollo sin cuenta |
| **Dependencias autorizadas en el Sprint 5** | `resend`, `pdfkit` y `cloudinary` (S5-18, S5-24). Ninguna otra sin permiso |

### Matriz de permisos completa (Sprints 1 a 5)

| Endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/health` | público | público | público |
| `/mi-cuenta/password` | Sí | Sí | Sí |
| `/empleados/*` | Sí | No | No |
| `/usuarios/*` (cuentas de empleados, incluye `…/reactivate` y `empleado/:employeeId`) | Sí | No | No |
| `/loyalty/configuration/*` (equivalencia, vigencia, bonificación, niveles y beneficios, cliente frecuente, `current`) | Sí | No | No |
| `GET /customers`, `GET /customers/by-document`, `GET /customers/:id`, `GET /customers/:id/status-history`, `POST /customers` | Sí | Sí | No |
| `PATCH /customers/:id`, `PATCH /customers/:id/deactivate` | Sí | No | No |
| `GET /customers/:id/cuenta` | Sí | No | No |
| `GET /customers/:id/puntos`, `GET /customers/:id/misiones` | Sí | Sí | No |
| `GET /customers/:id/consumos`, `GET /customers/:id/movimientos` | Sí | Sí (últimas 24 h) | No |
| `POST /customers/:id/ajustes-de-puntos` | Sí | No | No |
| `GET`/`PATCH /customers/me`, `GET /customers/me/puntos`, `/consumos`, `/movimientos` | No | No | Sí |
| `PUT`/`DELETE /customers/me/foto` | No | No | Sí |
| `GET /customers/me/misiones`, `PATCH /customers/me/misiones/:id/reclamar` | No | No | Sí |
| `GET /customers/me/recompensas`, `GET`/`POST /customers/me/canjes`, `PATCH /customers/me/canjes/:code/cancelar` | No | No | Sí |
| `GET /consumos/preview`, `POST /consumos`, `PATCH /consumos/:code/anular` | Sí | Sí (anula solo los propios, < 24 h) | No |
| `GET /consumos`, `GET /consumos/:code` | Sí | No | No |
| `GET /auditoria`, `GET /auditoria/actores` | Sí | No | No |
| `/recompensas`, `/recompensas/:id` (`GET`, `POST`, `PATCH`, `…/activar`, `…/desactivar`, `…/eliminar`), `PUT`/`DELETE /recompensas/:id/foto` | Sí | No | No |
| `GET /recompensas/disponibles` | Sí | Sí | No |
| `GET /customers/:id/canjes`, `POST /customers/:id/canjes` | Sí | Sí | No |
| `GET /canjes` | Sí | No | No |
| `GET /canjes/:code`, `PATCH /canjes/:code/usar`, `PATCH /canjes/:code/rechazar` | Sí | Sí | No |
| `/misiones`, `/misiones/:id` (`GET`, `POST`, `PATCH`, `…/eliminar`, `…/completadas`) | Sí | No | No |
| `/configuracion/mensajes` | Sí | No | No |
| `/promociones/*` (`destinatarios`, `envios`, `envios/:id/cancelar`) | Sí | No | No |
| `GET /notificaciones`, `POST /notificaciones/:id/reenviar` | Sí | No | No |
| `/estadisticas/*` (incluye `reporte.pdf`) | Sí | No | No |

---

## 5. Convenciones de respuestas y códigos de error

Valen para **todo el sistema**.

**Éxito:**

| Operación | Código | Cuerpo |
|---|---|---|
| Consulta | `200` | El recurso o `{ items, total, page, limit }` |
| Alta (`POST`) | `201` | El recurso creado (y el resultado cuando lo hay: saldos, canje) |
| Modificación con resultado (`PATCH`, `PUT`) | `200` | El recurso actualizado o el resultado de la acción |
| Acción sin resultado (`PATCH /mi-cuenta/password`, `POST /auth/logout`, `PATCH /customers/:id/deactivate`, `PATCH /usuarios/:id/reactivate`, `DELETE …/foto`) | `204` | Sin cuerpo |
| Envío en segundo plano (`POST /promociones/envios` para "ahora", `POST /notificaciones/:id/reenviar`) | `202` | `{ id, queued }` |
| Envío programado (`POST /promociones/envios` con `scheduledAt`) | `201` | `PromotionSend` |
| Archivo (`GET /estadisticas/reporte.pdf`) | `200` | El PDF |

**Error** (todos los módulos, por su filtro de excepciones):

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "…",
  "path": "/api/misiones/3/eliminar",
  "timestamp": "2026-11-20T15:00:00.000Z",
  "code": "MISSION_NAME_IN_USE",
  "details": [{ "field": "name", "message": "…" }]
}
```

- **El frontend decide por `code`**, nunca por el texto. `message` es `string` o `string[]`.
- `details` marca el campo en los errores de reglas de dominio.
- Todos los mensajes nuevos van en castellano. Cada filtro de módulo conoce el `403` y deja pasar `code`.

### Todos los `code` del sistema

| HTTP | `code` | Cuándo | Desde |
|---|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Cualquier fallo de login (mensaje fijo) | S2 |
| 401 | `INVALID_SESSION` | Cualquier fallo de renovación | S2 |
| 401 | `UNAUTHENTICATED` | Sin token o vencido. El frontend renueva y repite una vez | S2 |
| 403 | `FORBIDDEN` | El rol no alcanza | S2 |
| 409 | `LAST_ADMIN` | Dejaría el sistema sin administrador disponible | S2 |
| 409 | `EMAIL_IN_USE` | Email en uso entre registros activos | S3 |
| 400 | `CURRENT_PASSWORD_INCORRECT` | Contraseña actual incorrecta | S3 |
| 400 | `PASSWORD_SAME_AS_CURRENT` | Nueva igual a la actual | S3 |
| 400 | `PASSWORD_SAME_AS_DOCUMENT` | Cliente: nueva igual a su documento | S3 |
| 429 | `TOO_MANY_ATTEMPTS` | Demasiadas contraseñas actuales incorrectas | S3 |
| 403 | `VOID_NOT_ALLOWED` | Cajero anulando un consumo ajeno o de más de 24 h | S3 |
| 409 | `CUSTOMER_INACTIVE` | Operar o editar un cliente dado de baja | S3 |
| 409 | `CONSUMPTION_ALREADY_VOIDED` | Anular un consumo ya anulado | S3 |
| 409 | `POINTS_EQUIVALENCE_NOT_CONFIGURED` | Registrar o previsualizar sin equivalencia | S3 |
| 409 | `INSUFFICIENT_BALANCE` | Ajuste "Restar" mayor que el saldo; usar un canje sin saldo | S3 / S4 |
| 409 | `REWARD_NAME_IN_USE` | Nombre de recompensa repetido | S4 |
| 409 | `STOCK_BELOW_CONFIRMED` | Stock menor que los canjes confirmados | S4 |
| 409 | `INVALID_REWARD_STATUS` | Activar o desactivar en un estado que no corresponde | S4 |
| 409 | `REWARD_NOT_AVAILABLE` | Confirmar o usar con la recompensa no disponible | S4 |
| 409 | `REDEMPTION_NOT_CONFIRMED` | El canje ya no está Confirmado | S4 |
| 409 | `REDEMPTION_EXPIRED` | El canje venció | S4 |
| 409 | `MISSION_NAME_IN_USE` | Nombre de misión repetido | **S5** |
| 409 | `MISSION_NOT_CLAIMABLE` | Reclamar una misión que no está Completada o no tiene recompensa | **S5** |
| 400 | `INVALID_IMAGE` | Imagen que no es JPG, PNG o WebP, o de más de 2 MB | **S5** |
| 409 | `NOTIFICATION_DISABLED` | Reenviar un correo de un tipo que está desactivado | **S5** |
| 409 | `NOTIFICATION_NOT_RESENDABLE` | Reenviar un correo que no falló o que ya se reenvió | **S5** |
| 409 | `PROMOTION_SEND_NOT_CANCELLABLE` | Cancelar un envío de promoción que ya salió o ya se canceló | **S5** |

> `PROMOTION_FINISHED` (v1) **ya no existe**: las promociones no tienen vigencia (S5-36).

> `FORBIDDEN_FIELD` (S3) **ya no se usa**: desde D-03 el documento no viaja en el DTO y un documento en el body
> responde `400 property documentType should not exist`. Se borra en el ARRASTRE-S4 (A4-12).

**`404` sin `code`** (nuevos): "No existe la misión.", "No existe el envío.", "No existe la notificación.", "El
cliente no tiene cuenta.", "La recompensa no tiene foto.", "No tenés foto de perfil.".

---

## 6. Códigos HTTP

| Código | Significado en el sistema |
|---|---|
| `200 OK` | Consulta o modificación correcta, con cuerpo; el PDF |
| `201 Created` | Alta: empleado, usuario, cliente, consumo, ajuste, recompensa, canje, misión, envío de promoción programado |
| `202 Accepted` | Envío de una promoción ahora o reenvío de un correo, en segundo plano |
| `204 No Content` | Acción correcta sin cuerpo |
| `400 Bad Request` | Formato o validación; campo desconocido; fechas inválidas o invertidas; mes que falta, futuro o muy viejo; sección del PDF que falta; contraseña actual incorrecta; imagen inválida; `q` junto con `name` o `documentNumber` |
| `401 Unauthorized` | Sin token o vencido (`UNAUTHENTICATED`), login fallido, sesión inválida. El frontend renueva y repite una sola vez |
| `403 Forbidden` | El rol no alcanza (`FORBIDDEN`) o regla de permiso de negocio (`VOID_NOT_ALLOWED`). No se reintenta ni se audita |
| `404 Not Found` | Recurso inexistente, dado de baja o de otro cliente; código de canje mal escrito; foto que no hay |
| `409 Conflict` | Estado incompatible (ver la tabla de [5](#5-convenciones-de-respuestas-y-códigos-de-error)) |
| `429 Too Many Requests` | Límite de intentos de contraseña |
| `500 Internal Server Error` | Inesperado. Mensaje genérico "Unexpected error." |

---

## 7. Cambios respecto del Sprint 4

| # | Dónde | Antes | Ahora |
|---|---|---|---|
| 1 | Misiones (menú, pestaña del Cliente) | "Próx." | Pantallas reales (US-28 a US-33) |
| 2 | Estadísticas | "Próx." | Pantalla y PDF (US-51 a US-55) |
| 3 | Configuración → Notificaciones | "Próx." | Mensajes automáticos, puntos de cumpleaños, envío de promociones e historial con reenvío (US-14, US-15, US-47 a US-50). El logo no se configura |
| 4 | `photoUrl` de `Reward` | Siempre `null` | La foto en Cloudinary, si tiene |
| 5 | `PointsMovementType` | Sin misiones ni cumpleaños | `MISSION_REWARD` y `BIRTHDAY_BONUS` |
| 6 | Auditoría de misiones (S3 §3.9.3) | `MISSION_COMPLETED` con "Puntos otorgados" | Los puntos van en `MISSION_REWARD_CLAIMED`; nuevas `BIRTHDAY_BONUS_GRANTED` y `FREQUENT_CUSTOMERS_UPDATED` |
| 7 | Niveles | Sin beneficios | Un texto por nivel (NIV-BEN) |
| 8 | Cuentas | Solo de empleados | El Administrador ve también la del cliente (CTA-CLI) |
| 9 | Procesos automáticos | Tres | Seis (+ misiones, notificaciones y promociones programadas) |
| 10 | `POST /consumos` y anulación | Puntos y nivel | + avance de misiones y `completedMissions` |
| 11 | `GET /movimientos-de-puntos` | Sin pantalla | Se elimina |
| 12 | CORS | Fijo | Por variable de entorno |
| 13 | Clientes (`/customers/me`, `/:id`, `by-document`) | Sin foto | `photoUrl` |
| 14 | Configuración del programa | — | Mínimo de cliente frecuente |
| 15 | Repositorio | Sin CI | GitHub Actions en cada PR |
| 16 | `GET /recompensas` | Orden por `updatedAt` | Parámetro `order` (Más recientes / Más antiguas, por fecha de alta) |
| 17 | Mis canjes del Cliente | Fecha: Día específico o Rango | "Elegir fechas" con calendario |
| 18 | Encabezado del Administrador | Botón "Volver" | Sin "Volver" |

---

## 8. Observaciones

### 8.1 Diferencias del prototipo que este contrato corrige

Las pantallas del Sprint 5 del prototipo v2 **se actualizaron a mano** el 11/11 y el 12/11/2026, a pedido de Deni
(`docs/prototipo/v2/LEEME.md`), y esta versión del contrato las toma: ya coinciden en pantallas, textos y
flujo. Lo que el prototipo hace y **no** es parte del diseño ni de este contrato:

| # | Prototipo | Contrato |
|---|---|---|
| 1 | Los números de las estadísticas, los destinatarios por nivel (120 / 50 / 14) y las listas son datos de ejemplo calculados en la pantalla | Los calcula el backend ([3.9](#39-estadísticas-y-reporte-pdf-us-51-a-us-55), [3.7.2](#372-get-apipromocionesdestinatarios-a)) |
| 2 | Botones "Simular fin de mes", "Simular envío de las 09:00" y "Simular: enviar los programados ahora" | Son los procesos automáticos ([3.4](#34-vencer-y-reiniciar-misiones-us-32), [3.8.1](#381-cuándo-se-envía-cada-una), [3.7.4](#374-programados)) |
| 3 | El reenvío y el envío de promociones dejan el registro `SENT` al instante | El correo sale en segundo plano y puede quedar `FAILED` o `SKIPPED` |
| 4 | El orden "Más recientes" usa el orden de alta de los datos de ejemplo | `order=RECENT` por `createdAt` |
| 5 | "Exportar reporte PDF" muestra un toast de descarga | Baja el archivo de [3.9.5](#395-get-apiestadisticasreportepdf-us-55-rf-058) |
| 6 | `ConfigPromociones.html` ya no existe y la tarjeta de promociones del Inicio del Cliente se sacó | Igual: no hay catálogo de promociones (S5-36) |

### 8.2 Reglas de negocio que el backend tiene que garantizar (no solo la pantalla)

- **Misiones:** el avance sale del consumo en la misma transacción; nunca pasa el objetivo; una Completada,
  Reclamada o Vencida no suma más; el snapshot de la asignación no cambia si se edita la misión.
- **Reclamo:** solo de una Completada con recompensa, del cliente del token, una sola vez (bloqueo). Los puntos
  no suman al nivel.
- **Fin de mes y baja de una misión:** las En progreso vencen; las Completadas con recompensa se reclaman
  solas. **Nunca se pierde una recompensa ganada.** Idempotente.
- **Cumpleaños:** los puntos se regalan una vez por año, aunque el correo falle; no suman al nivel.
- **Notificaciones:** se registran siempre (enviadas, fallidas u omitidas), una sola vez por motivo, fuera de la
  transacción de negocio. No se mandan correos desde desarrollo ni desde los e2e. Un correo fallido se reenvía
  una sola vez y solo a mano.
- **Promociones:** cada envío llega una sola vez a cada destinatario; un programado sale a su hora (o en la
  primera corrida después) y no sale si se canceló antes.
- **Imágenes:** se validan por contenido y tamaño en el backend antes de subirlas; las fotos de perfil solo se
  entregan con URL firmada.
- **Promociones y beneficios:** son informativos: no cambian el cálculo de puntos.
- **Estadísticas:** por mes; los totales por estado de las misiones, las subidas de nivel y el total de canjes
  usados salen del backend.
- **Auditoría y movimientos inalterables**, como en los sprints anteriores; el Cliente nunca es actor.

### 8.3 Decisiones del Sprint 5

| # | Tema | Decisión | Quién / cuándo |
|---|---|---|---|
| S5-1 | Foto de perfil del Cliente | **Entra en el Sprint 5** (no estaba en ningún sprint anterior). Hay que sumarla a RF-065 / US-59 en los documentos del producto | Deni, 09/11 |
| S5-2 | Beneficios de los niveles (RF-029) | **Entran en el Sprint 5**: no se hicieron en US-27 | Deni, 09/11 |
| S5-3 | Cuentas de los clientes (RF-08) | El Administrador **tiene que poder verlas** | Deni, 09/11 |
| S5-4 | Misión sin recompensa | **Completada es estado final** | Deni, 09/11 |
| S5-5 | Misión completada no reclamada a fin de mes | **Se reclama sola** (Sistema): si la terminó, no pierde la recompensa. Si la empezó y no la terminó, la pierde (Vencida) | Deni, 09/11 |
| S5-6 | Lo que no quedó hecho de los sprints anteriores | **Pasa al Sprint 5** | Deni, 09/11 |
| S5-7 | Generador de contraseñas de empleados | 8 caracteres (D-05; contrato S3 §3.11 corregido) | PO, 25/10 |
| S5-8 | Estados de la misión del cliente | Los del **cuadro** de la Definición del Producto §9 (las imágenes están desactualizadas) | Deni, 09/11 |
| S5-9 | Puntos de misión y de cumpleaños | No suman a los puntos acumulados (RF-028 y Glosario: el nivel sale de los consumos) | Plan de Proyecto |
| S5-10 | Canal de las notificaciones | Correo electrónico, con Resend | Seguimiento §2.6, Definición del Producto §10.1 |
| S5-11 | Reporte PDF | PDFKit | Seguimiento §2.6 |
| S5-12 | Dónde se guardan las imágenes (PD-1) | **Cloudinary** | Deni, 09/11 |
| S5-13 | `GET /movimientos-de-puntos` (PD-3) | **Se elimina** | Deni, 09/11 |
| S5-14 | Aviso de canje rechazado (PD-6) | **No** | Deni, 09/11 |
| S5-15 | Qué mide una misión (PD-7) | Cantidad de consumos o monto acumulado, con días y franja horaria opcionales | Deni, 09/11 |
| S5-16 | Promociones (PD-8) | **Solo informativas**: no cambian los puntos. Desde la v2 son solo un correo (S5-36) | Deni, 09/11 |
| S5-17 | Aviso de vencimiento de puntos (PD-10) | **7 días antes**, una vez por lote | Deni, 09/11 |
| S5-18 | Dependencias (PD-11) | `resend` y `pdfkit` **autorizadas** | Deni, 09/11 |
| S5-19 | Asignación de misiones (PD-14) | En el primer consumo o consulta del mes; sin mes de fin, se repite todos los meses | Deni, 09/11 |
| S5-20 | Editar o eliminar una misión con progreso (PD-15) | Editar: el objetivo y la recompensa rigen desde el mes siguiente. Eliminar: En progreso → Vencida; Completadas con recompensa → Reclamadas (Sistema) | Deni, 09/11 |
| S5-21 | Anular un consumo y las misiones (PD-13) | Resta el avance solo en las del mismo mes que sigan En progreso | Deni, 09/11 |
| S5-22 | Estadísticas (PD-9) | "Frecuente": el mínimo de consumos **se configura en Configuración del programa** (por defecto 3). Franjas de 4 horas. Activo = no dado de baja | Deni, 09/11 |
| S5-23 | Foto de perfil (PD-12) | La ven **el Cliente, el Cajero y el Administrador**. URL firmada de Cloudinary | Deni, 09/11 |
| S5-24 | Dependencia `cloudinary` | **Autorizada** | Deni, 09/11 |
| S5-25 | Cumpleaños (PD-18) | **Regala puntos**: configurable en Configuración → Notificaciones, por defecto 100 (0 = no regala) | Deni, 09/11 |
| S5-26 | Beneficio de un nivel (PD-20) | **Texto informativo**: no cambia los puntos | Deni, 09/11 |
| S5-27 | Gráficos (PD-19) | Con CSS, sin librería nueva. Desde la v2 también tortas con `conic-gradient` (S5-46) | Deni, 09/11 |
| S5-28 | Correos fallidos y auditoría de envíos (PD-16, PD-17) | Sin reintento **automático** (el reenvío manual es S5-38); los envíos no se auditan (quedan en el historial) | Deni, 09/11 |
| S5-29 | Cuenta del cliente (PD-21) | **Solo verla** | Deni, 09/11 |
| S5-30 | Tests del frontend y CI (PD-23) | **Se saca Vitest** del Seguimiento (estaba solo ahí). **Se hace el CI** con GitHub Actions (está en el Seguimiento y en la Definición del Producto) | Deni, 09/11 |
| S5-31 | Puntos de cumpleaños sin RF | Hay que sumarlos a RF-051 / US-48 en los documentos del producto | Consecuencia de S5-25 |
| S5-32 | Contrato del Sprint 5 | Pasa a v1: todas las propuestas del v0 quedan decididas | Deni, 09/11 |
| S5-33 | "Próximamente" | No queda nada para otro sprint: lo que no esté en el contrato ni en un RF se pregunta | Deni, 09/11 |
| S5-34 | Detalle y alta de misiones | Un clic en la misión abre su **detalle** con los clientes que la completaron este mes y "Editar misión". Crear y editar van en **dos modales**: Objetivo, y Recompensa y vigencia | Deni, 11/11 |
| S5-35 | Logo | **No se configura**: se sacó de Notificaciones. Se usa el logo fijo de Vitto Club. Sin endpoints de logo | Deni, 11/11 |
| S5-36 | Promociones | **No se guardan**: no hay catálogo, ni Configuración → Promociones, ni tarjeta del Cliente. Se escriben y se envían desde Notificaciones; solo se guarda el envío | Deni, 11/11 |
| S5-37 | Texto de las promociones | Asunto y mensaje **desde cero** en cada envío (sin plantilla `{promocion}` / `{descripcion}`). Promociones sale de los mensajes automáticos y no tiene interruptor | Deni, 12/11 |
| S5-38 | Correos que fallaron | Botón **"Reenviar"** en el historial: una vez por correo, a mano. No se audita | Deni, 11/11 |
| S5-39 | Cuándo y a quién va una promoción | **Ahora o programada** (fecha y hora) y a **todos los clientes activos o a los de un nivel**. Los programados se pueden cancelar; un proceso los manda cada minuto | Deni, 12/11 |
| S5-40 | Filtros de fecha | Como el de Consumos: un solo campo con calendario para inicio y fin (historial de notificaciones, Mis canjes) | Deni, 11/11 |
| S5-41 | Ajustes de pantalla | Tarjetas de Configuración → Puntos más compactas; sin "Volver" en el panel del Administrador; todos los modales con cruz; "Elegir fechas" en Mis canjes | Deni, 11/11 |
| S5-42 | Período de las estadísticas | **Un mes** (Mes y Año), sin fechas de inicio y fin. Consumos solo por día de la semana y franja horaria (sin Día / Semana / Mes). Puntos sin ajustes ni tabla por mes | Deni, 11/11 |
| S5-43 | Horario de una misión | Botón "Quitar horario" para borrarlo | Deni, 12/11 |
| S5-44 | Ayuda del tipo de objetivo | Un **?** que muestra la explicación al pasar el mouse (no un botón que despliega texto) | Deni, 12/11 |
| S5-45 | Orden de misiones y recompensas | Más recientes (por defecto) o Más antiguas, por fecha de alta | Deni, 12/11 |
| S5-46 | Gráficos de las estadísticas | Más gráficos (tortas y barras), paleta pastel de la gama del naranja con turquesa y lavanda de apoyo, todos los números con la misma letra | Deni, 11/11 y 12/11 |
| S5-47 | Subidas de nivel | Estadísticas → Programa muestra el % de clientes que **subieron de nivel** en el mes, a cualquier nivel | Deni, 12/11 |
| S5-48 | Recompensas más canjeadas | Con el **%** sobre el total de canjes usados del mes | Deni, 12/11 |
| S5-49 | Reporte PDF | Un modal elige las **secciones** (Clientes, Consumos, Puntos, Programa) con "Seleccionar todo" / "Deseleccionar todo" | Deni, 12/11 |
| S5-50 | Torta de misiones | Sin la aclaración "a fin de mes se reclama sola"; "En progreso" **solo en el mes en curso** | Deni, 12/11 |

### 8.4 Implementación sugerida

- **Módulos nuevos:**
  - `missions`: misiones, asignación, avance, reclamo y proceso de fin de mes.
  - `notifications`: plantillas, puntos de cumpleaños, envíos de promociones (ahora y programados), envío,
    registro y reenvío, y los procesos diario y de programados. Puerto `EmailSender` (Resend y log).
  - `statistics`: solo lectura; lee las tablas por Prisma sin importar los módulos de negocio, como `points` lee
    `customers`.
  - `images`: puerto `ImageStorage` (Cloudinary y falso), validación por contenido y URL firmadas. No es un
    módulo de negocio: vive en `shared/` o como módulo técnico sin dominio, como `prisma`.
- **Dependencias entre módulos** (sin ciclos):
  - `consumptions ──> missions` para el avance, en la misma transacción. `missions` **no** importa
    `consumptions`: recibe `{ customerId, consumptionId, amount, createdAt }`.
  - `missions ──> points` para acreditar (`PointsService.acreditarBonificacion({ type, … })` para
    `MISSION_REWARD` y `BIRTHDAY_BONUS`); `points` no importa `missions` ni `notifications`.
  - `missions` publica `mission.completed`; `notifications` lo atiende **después del commit** (`@OnEvent` con
    `async: true` o una cola en memoria: el correo no puede deshacer el consumo).
  - `notifications ──> points` (lotes por vencer y regalo de cumpleaños) y lectura de `customers` por Prisma.
  - `rewards` y `customers` usan `images`.
  - `statistics` no importa ningún módulo de negocio.
- **Hora:** `shared/time/argentina-date.ts` para meses, días de la semana y franjas.
- **Tests e2e mínimos:**
  - Crear, editar (con y sin asignaciones en el mes) y dar de baja misiones; nombre repetido; permisos.
  - Consumo que suma avance, que completa (con y sin recompensa) y que no cumple la condición (día u hora).
  - Anular un consumo con misión En progreso (resta) y Completada (no resta).
  - Reclamar: Completada con recompensa (`200`, lote `MISSION_REWARD`, `lifetimePoints` igual), sin
    recompensa, En progreso, Reclamada, ajena (`404`), dos reclamos en paralelo (uno `200`, otro `409`).
  - Fin de mes: En progreso → Vencida; Completada con recompensa → Reclamada (Sistema); sin recompensa queda;
    `pendingChanges` aplicados; idempotente; auditoría.
  - Fotos (con el adaptador falso): JPG, PNG, WebP, un PDF renombrado a `.jpg` (`400`), 2 MB + 1 byte (`400`),
    reemplazar, quitar; la foto de perfil en `/customers/:id` y `by-document`.
  - Notificaciones: no se repiten; tipo desactivado (`SKIPPED`); envío apagado; un fallo no deshace el consumo;
    cumpleaños con y sin puntos, una vez por año; reenvío de una `FAILED` (`202`), de una `SENT` o ya reenviada
    (`409`), con el tipo desactivado (`409`).
  - Promociones: enviar ahora a todos y a un nivel; programar (fecha pasada `400`); el proceso manda los
    vencidos una sola vez; cancelar un programado y uno ya enviado (`409`); `{nombre}` reemplazado.
  - Misiones: `order`; `GET /misiones/:id/completadas` con Completadas y Reclamadas, mes inválido (`400`).
  - Estadísticas: cada métrica con datos conocidos de un mes; mínimo de frecuente configurable; mes que falta,
    futuro y muy viejo; `levelUps`; totales de misiones por estado; `redemptionsUsed`; PDF con una y con todas
    las secciones, y sin secciones (`400`).
  - Beneficios: guardar, versión nueva, auditoría, `benefit` en el saldo.
  - Cuenta del cliente: con cuenta, sin cuenta, permisos.
  - `GET /movimientos-de-puntos` → `404` después de eliminarlo.

---

## 9. Resumen por historia

| US | Título | RF | Endpoints | Pantallas |
|---|---|---|---|---|
| US-14 | Configurar mensajes automáticos (el logo queda fijo, S5-35) | RF-012 | `GET`/`PUT /configuracion/mensajes` | Configuración → Notificaciones → Mensajes |
| US-15 | Configurar promociones especiales (escribirlas y elegir cuándo y a quién) | RF-013 | `GET /promociones/destinatarios`, `POST`/`GET /promociones/envios`, `PATCH …/cancelar` | Notificaciones → tarjeta Promociones |
| US-28 | Crear misión mensual | RF-031 | `POST /misiones`, `GET /misiones` | Misiones → "+ Crear misión mensual" |
| US-29 | Editar / dar de baja misión | RF-032 | `GET`/`PATCH /misiones/:id`, `GET …/completadas`, `PATCH …/eliminar` | Misiones → detalle → Editar misión |
| US-30 | Progreso y cumplimiento automático de misiones | RF-033 / RF-034 | Dentro de `POST /consumos` y de la anulación | "Consumo registrado"; Mis misiones |
| US-31 | Reclamar recompensa de misión | RF-035 | `PATCH /customers/me/misiones/:id/reclamar` | Cliente → Misiones |
| US-32 | Vencer y reiniciar misiones | RF-036 | Proceso de fin de mes | Auditoría |
| US-33 | Consultar misiones | RF-037 (y RF-017) | `GET /customers/me/misiones`, `GET /customers/:id/misiones` | Cliente → Misiones; Inicio; ficha; Caja |
| US-34 | Imagen de la recompensa | RF-038 | `PUT`/`DELETE /recompensas/:id/foto` | Modal de recompensa; catálogo; mostrador; canjes |
| US-47 | Notificar vencimiento de puntos | RF-050 | Proceso diario; `GET /notificaciones`, `POST …/reenviar` | Historial de notificaciones |
| US-48 | Notificar cumpleaños (con regalo de puntos) | RF-051 | Proceso diario, `birthdayBonusPoints` | Configuración → Notificaciones; historial |
| US-49 | Notificar promociones | RF-052 | `POST /promociones/envios` y el proceso de programados | Notificaciones → "+ Enviar promoción" |
| US-50 | Notificar avance de misiones | RF-053 | Al completar | Historial de notificaciones |
| US-51 | Estadísticas de clientes | RF-054 | `GET /estadisticas/clientes`, `/loyalty/configuration/frequent-customers` | Estadísticas; Configuración → Puntos |
| US-52 | Estadísticas de consumos por período (el mes, por día de la semana y franja horaria) | RF-055 | `GET /estadisticas/consumos` | Estadísticas |
| US-53 | Estadísticas de puntos | RF-056 | `GET /estadisticas/puntos` | Estadísticas |
| US-54 | Estadísticas de niveles, misiones y recompensas | RF-057 | `GET /estadisticas/programa` | Estadísticas |
| US-55 | Exportar reportes generados | RF-058 | `GET /estadisticas/reporte.pdf?month&sections` | Estadísticas → modal "Exportar reporte PDF" |
| — | FOTO-PERFIL: foto de perfil del Cliente (S5-1) | RF-065 (a ampliar) | `PUT`/`DELETE /customers/me/foto`; `photoUrl` en clientes | Mi perfil; encabezado; Caja; ficha |
| — | NIV-BEN: beneficios de los niveles (S5-2) | RF-029 | `/loyalty/configuration/levels`, `…/puntos` | Configuración → Niveles; Inicio; ficha |
| — | CTA-CLI: cuentas de los clientes (S5-3) | RF-08 | `GET /customers/:id/cuenta` | Clientes → Ver más |
| — | CI: integración continua (S5-30) | — | — | `.github/workflows/ci.yml` |
| — | ARRASTRE-S4 | — | Ver `CIERRE_SPRINT_4.md` §4 | — |

---

## 10. Pendientes

**Nada de esta lista bloquea el código.** Son cambios en los documentos del producto, fuera del repo.

| # | Pendiente | Dónde |
|---|---|---|
| PD-22 | Sumar la foto de perfil a RF-065 / US-59 (S5-1) y los puntos de cumpleaños a RF-051 / US-48 (S5-31) | Plan de Proyecto, Seguimiento, Definición del Producto |
| PD-22b | Marcar US-08 (RF-08) y US-27 (RF-029) como completas en parte y sumar CTA-CLI, NIV-BEN y CI al Story Map del Sprint 5 | Seguimiento |
| PD-22c | Máquina "Misión mensual": Completada también es final (sin recompensa), el reclamo automático de fin de mes y de baja de la misión (S5-4, S5-5, S5-20) | Definición del Producto §9 |
| PD-22d | Máquina "Recompensa": el encabezado dice tres estados finales; el cuadro tiene uno, "Dada de baja" | Definición del Producto §9 |
| PD-23 | Sacar "Vitest + React Testing Library" del framework de pruebas (S5-30) | Seguimiento §2.6 |
| PD-24 | Glosario: Misión mensual, Reclamo automático, Notificación, Promoción, Beneficio del nivel, Cliente frecuente | Plan de Proyecto §8 |
| PD-25 | RF-012 pide configurar el logo: queda fijo (S5-35). Ajustar el RF o dejarlo anotado como fuera de alcance | Plan de Proyecto, Seguimiento |
| PD-26 | RF-013 / US-15: las promociones no se guardan; se escriben y se envían (ahora o programadas, a todos o a un nivel) (S5-36, S5-39) | Plan de Proyecto, Seguimiento, Definición del Producto |
| PD-27 | Reenvío manual de correos fallidos (S5-38) y estadísticas por mes con subidas de nivel (S5-42, S5-47) | Seguimiento (Story Map, US-47 a US-55) |
