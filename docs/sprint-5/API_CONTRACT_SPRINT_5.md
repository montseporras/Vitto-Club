# Contrato de API — Sprint 5 · Vitto Club

> **Alcance:** todo lo que el backend tiene que exponer para el **Sprint 5, el último** (Misiones,
> Notificaciones, Estadísticas, Configuración de logo, mensajes y promociones, y fotos), armado a partir de:
> - el Story Map del Sprint 5 del *Seguimiento del Proyecto* v1.7 (09/11/2026);
> - los RF-012, RF-013, RF-029, RF-031 a RF-038, RF-050 a RF-058 y RF-065 del *Plan de Proyecto* v1.6;
> - la sección 9 de la *Definición del Producto* v1.4 (máquina de estados "Misión mensual", **los cuadros**,
>   no las imágenes);
> - lo que los contratos de los Sprints 3 y 4 dejaron anotado para el Sprint 5 (§3.9.2 del S3 y §3.3 y §10 del
>   S4);
> - las decisiones de Deni del 09/11/2026 ([8.3](#83-decisiones-del-sprint-5));
> - el estado de `develop` al cierre del Sprint 4 (`docs/sprint-5/CIERRE_SPRINT_4.md`).
>
> **Historias:** US-14, US-15, US-28 a US-33, US-34 (imagen), US-47 a US-55, más los ítems que pasan al
> Sprint 5 porque no quedaron hechos antes (decisión S5-6): **FOTO-PERFIL**, **NIV-BEN** (beneficios de los
> niveles), **CTA-CLI** (cuentas de clientes, RF-08), **CI** (integración continua) y el **ARRASTRE-S4**.
>
> **Versión 1 (09/11/2026).** Incorpora las decisiones de Deni del 09/11 sobre todas las propuestas del
> borrador v0 (S5-12 a S5-33). **Todo está decidido (✅)**: lo único que queda abierto es documentación fuera
> del repo ([10](#10-pendientes)).
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
   - [3.5 Fotos: recompensa (US-34), perfil del Cliente (FOTO-PERFIL) y logo](#35-fotos-recompensa-us-34-perfil-del-cliente-foto-perfil-y-logo)
   - [3.6 Logo, mensajes automáticos y puntos de cumpleaños (US-14)](#36-logo-mensajes-automáticos-y-puntos-de-cumpleaños-us-14)
   - [3.7 Promociones especiales (US-15)](#37-promociones-especiales-us-15)
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
| 1 | `GET` | `/misiones` | A | Listado de misiones, con búsqueda y filtro | US-28, US-29 |
| 2 | `GET` | `/misiones/:id` | A | Datos para editar | US-29 |
| 3 | `POST` | `/misiones` | A | Crear misión mensual | US-28 |
| 4 | `PATCH` | `/misiones/:id` | A | Editar misión | US-29 |
| 5 | `PATCH` | `/misiones/:id/eliminar` | A | Dar de baja (lógica) | US-29 |
| 6 | `GET` | `/customers/me/misiones` | Cl | Misiones del mes con mi progreso | US-33 |
| 7 | `PATCH` | `/customers/me/misiones/:id/reclamar` | Cl | Reclamar la recompensa de una misión Completada | US-31 |
| 8 | `GET` | `/customers/:id/misiones` | A, C | Misiones del mes del cliente (ficha y Caja, RF-017) | US-33 |
| 9 | `PUT` | `/recompensas/:id/foto` | A | Subir o reemplazar la foto | US-34 |
| 10 | `DELETE` | `/recompensas/:id/foto` | A | Quitar la foto | US-34 |
| 11 | `PUT` | `/customers/me/foto` | Cl | Subir o reemplazar mi foto de perfil | FOTO-PERFIL |
| 12 | `DELETE` | `/customers/me/foto` | Cl | Quitar mi foto | FOTO-PERFIL |
| 13 | `GET` | `/configuracion/mensajes` | A | Logo, mensajes automáticos y puntos de cumpleaños | US-14 |
| 14 | `PUT` | `/configuracion/mensajes` | A | Guardar mensajes, activar/desactivar y puntos de cumpleaños | US-14, US-48 |
| 15 | `PUT` | `/configuracion/logo` | A | Subir o reemplazar el logo | US-14 |
| 16 | `GET` | `/configuracion/logo` | público | Redirige al logo (login y correos) | US-14 |
| 17 | `GET` | `/promociones` | A | Listado de promociones | US-15 |
| 18 | `POST` | `/promociones` | A | Crear promoción | US-15 |
| 19 | `PATCH` | `/promociones/:id` | A | Editar promoción | US-15 |
| 20 | `PATCH` | `/promociones/:id/eliminar` | A | Dar de baja una promoción | US-15 |
| 21 | `POST` | `/promociones/:id/enviar` | A | Enviar la notificación de la promoción | US-49 |
| 22 | `GET` | `/customers/me/promociones` | Cl | Promociones vigentes y próximas | US-15 |
| 23 | `GET` | `/notificaciones` | A | Historial de notificaciones enviadas | US-47 a US-50 |
| 24 | `GET`/`PUT` | `/loyalty/configuration/frequent-customers` | A | Mínimo de consumos de un "cliente frecuente" | US-51 |
| 25 | `GET` | `/estadisticas/clientes` | A | Clientes activos, frecuentes y nuevos | US-51 |
| 26 | `GET` | `/estadisticas/consumos` | A | Consumos por período, día de la semana y franja horaria | US-52 |
| 27 | `GET` | `/estadisticas/puntos` | A | Puntos otorgados, canjeados y vencidos | US-53 |
| 28 | `GET` | `/estadisticas/programa` | A | Niveles, misiones y recompensas más canjeadas | US-54 |
| 29 | `GET` | `/estadisticas/reporte.pdf` | A | Exportar el reporte en PDF | US-55 |
| 30 | `GET` | `/customers/:id/cuenta` | A | Cuenta de acceso del cliente (RF-08) | CTA-CLI |

### Existentes que cambian en este sprint

| Método | Ruta | Qué cambia |
|---|---|---|
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
| `FAILED` | Falló | El proveedor respondió error. Se guarda el motivo y **no se reintenta** (S5-28) |
| `SKIPPED` | No enviada | El tipo estaba desactivado o el envío de correos está apagado en el entorno ([4](#4-información-general)) |

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
  `MISSION_REWARD_CLAIMED`, `MISSIONS_EXPIRED`, `LOGO_AND_MESSAGES_UPDATED` y `PROMOTIONS_UPDATED` (ya existen
  en la base desde el Sprint 3). `AuditModule.MISSIONS` deja de mostrarse "(Próximamente)".
- **Nuevos:** `BIRTHDAY_BONUS_GRANTED` (módulo `POINTS`, actor Sistema) y `FREQUENT_CUSTOMERS_UPDATED`
  (módulo `CONFIGURATION`, actor Administrador).
- Los **envíos de notificaciones no se auditan**: quedan en el historial de notificaciones (S5-28).

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
| `page` / `limit` | 1 / 10, máximo 100 |

Orden: `updatedAt` descendente. Respuesta `{ items: Mission[], total, page, limit }`.

**Pantalla** (Administración → Misiones): título "Misiones mensuales", debajo "Hacé clic en una misión para
editarla o eliminarla.". Buscador por nombre y filtro En curso · Próximas · Finalizadas. Columnas: Nombre ·
Objetivo (texto armado: "3 consumos", "$ 20.000 en consumos", más "los domingos de 09:00 a 13:00" si tiene
condición) · Recompensa ("50 pts" o "Sin recompensa") · Vigencia ("Noviembre 2026 – Diciembre 2026" o "Desde
noviembre 2026") · Completadas este mes · Estado (badge) · chevron (›). **La fila no tiene botones: un clic abre
el modal de edición** (como Recompensas, S4-19). Botón "+ Crear misión mensual". Paginado de a 10: "Mostrando
1–10 de N". Vacío: "No hay misiones para los filtros seleccionados."

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

**Modal** "Crear misión mensual" / "Editar misión", con las secciones **Misión** (Nombre; Descripción con
contador "n/255"), **Objetivo** (Tipo de objetivo: Cantidad de consumos / Monto acumulado; Objetivo; Días:
"Todos los días" o elegir; Horario opcional "Desde" / "Hasta"), **Recompensa** (Puntos, con la casilla "Sin
recompensa") y **Vigencia** (Mes de inicio; Mes de fin, con la casilla "Se repite todos los meses"). Abajo:
Eliminar (solo al editar) · Cancelar · Guardar misión. Toast "Misión guardada.".

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

#### 3.1.6 `GET /api/misiones/:id`

`Mission`. Dada de baja o inexistente: `404` "No existe la misión.".

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

### 3.5 Fotos: recompensa (US-34), perfil del Cliente (FOTO-PERFIL) y logo

#### 3.5.1 Reglas comunes de las imágenes (S5-12)

| Regla | Valor |
|---|---|
| Formato del pedido | `multipart/form-data`, campo `photo` (`logo` para el logo). `multer` viene con `@nestjs/platform-express` |
| Tipos | JPG, PNG o WebP, **validados por el contenido** del archivo, no por la extensión |
| Tamaño | Hasta 2 MB |
| Error | `400 INVALID_IMAGE` "Usá una imagen JPG, PNG o WebP de hasta 2 MB." |
| Dónde se guardan | **Cloudinary** (dependencia `cloudinary`, autorizada). El backend sube el archivo y guarda el `public_id` y la URL; nunca guarda la imagen |
| Carpetas | `vitto-club/rewards`, `vitto-club/customers`, `vitto-club/logo` |
| Recompensas y logo | Entrega **pública** (`type: upload`). `photoUrl` / `logoUrl` = la `secure_url` de Cloudinary |
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

- `PUT /api/configuracion/logo` (A): mismas reglas. `200 { logoUrl }`. Audita `LOGO_AND_MESSAGES_UPDATED` con
  "Logo: Actualizado".
- `GET /api/configuracion/logo`: **público**. Responde `302` a la `logoUrl`. Sin logo cargado, `404` y el
  frontend usa el logo del repo (`frontend/src/assets/`).

---

### 3.6 Logo, mensajes automáticos y puntos de cumpleaños (US-14)

RF-012: "configurar el logo de la organización y los mensajes automáticos de notificación".

#### 3.6.1 `GET /api/configuracion/mensajes` (A)

```json
{
  "logoUrl": "https://res.cloudinary.com/…/vitto-club/logo/…",
  "birthdayBonusPoints": 100,
  "messages": [
    { "type": "POINTS_EXPIRING", "active": true, "subject": "Tus puntos están por vencer", "body": "Hola {nombre}: tenés {puntos} pts que vencen el {fecha}. ¡Usalos antes de que caduquen!" },
    { "type": "BIRTHDAY", "active": true, "subject": "¡Feliz cumpleaños!", "body": "¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts para celebrar con nosotros." },
    { "type": "PROMOTION", "active": true, "subject": "{promocion}", "body": "{descripcion}" },
    { "type": "MISSION", "active": true, "subject": "¡Completaste una misión!", "body": "¡Bien, {nombre}! Completaste la misión {mision}. Entrá a Vitto Club para ver tu recompensa." }
  ]
}
```

Son los textos por defecto que carga BASE-5 (basados en los del prototipo).

**Variables por tipo**, que se reemplazan al enviar:

| Tipo | Variables |
|---|---|
| `POINTS_EXPIRING` | `{nombre}`, `{puntos}`, `{fecha}` |
| `BIRTHDAY` | `{nombre}`, `{puntos}` |
| `PROMOTION` | `{nombre}`, `{promocion}`, `{descripcion}` |
| `MISSION` | `{nombre}`, `{mision}` |

Una variable que no corresponde al tipo → `400` "La variable {variable} no se puede usar en este mensaje.".

#### 3.6.2 `PUT /api/configuracion/mensajes` (A)

Body `{ birthdayBonusPoints, messages: [{ type, active, subject, body }] }` (los cuatro tipos).

| Campo | Regla y mensaje |
|---|---|
| `subject` | 1–120: "El asunto es obligatorio." / "El asunto no puede superar los 120 caracteres." |
| `body` | 1–1.000: "El mensaje es obligatorio." / "El mensaje no puede superar los 1.000 caracteres." |
| `birthdayBonusPoints` | Entero 0–10.000 (0 = no regala puntos): "Ingresá puntos enteros de 0 a 10.000." |

Éxito `200` (mismo cuerpo que el `GET`). Audita **una** entrada `LOGO_AND_MESSAGES_UPDATED` con una fila por
cambio ("Mensaje de cumpleaños: Modificado", "Vencimiento de puntos: Activado → Desactivado", "Puntos de
cumpleaños: 100 → 150"). Si no cambió nada: "Cambios: Se guardó sin modificar valores" (S3-24).

**Pantalla:** Configuración → **Notificaciones**, pestaña **Mensajes**: arriba el logo (vista previa, "Elegir
imagen"); debajo "Puntos de regalo por cumpleaños"; después una fila por tipo con el interruptor "Activa" y
"Editar mensaje" (modal con Asunto, Mensaje, "Podés usar: …" y una vista previa con datos de ejemplo). Botón
"Guardar cambios".

---

### 3.7 Promociones especiales (US-15)

RF-013: "definir promociones especiales aplicables al programa (por ejemplo, vinculadas a la pizza libre de los
viernes o a la merienda buffet de los domingos)". RF-052: "enviar notificaciones de promociones".

**Una promoción es informativa** (S5-16): se muestra al Cliente y se avisa por correo. **No cambia los puntos**
de ningún consumo.

#### 3.7.1 Tipo `Promotion`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | number | No | |
| `title` | string | No | 1–80 ("Pizza libre de los viernes") |
| `description` | string | No | 1–500 |
| `daysOfWeek` | number[] | Sí | 1–7. `null` = todos los días |
| `timeFrom`, `timeTo` | string | Sí | `HH:mm`. Los dos o ninguno |
| `validFrom` | string | No | `YYYY-MM-DD` |
| `validTo` | string | Sí | `YYYY-MM-DD`. `null` = sin fecha de fin |
| `status` | `"ACTIVE"` \| `"DELETED"` | No | |
| `phase` | `"CURRENT"` \| `"UPCOMING"` \| `"FINISHED"` | No | Calculado con la fecha de hoy en Argentina |
| `lastSentAt` | string | Sí | Último envío por correo |
| `createdAt`, `updatedAt` | string | No | |

#### 3.7.2 Endpoints (A)

- `GET /api/promociones?phase=CURRENT|UPCOMING|FINISHED&page&limit` → `{ items, total, page, limit }` (10 por
  página, por `validFrom` descendente).
- `POST /api/promociones` → `201`. `PATCH /api/promociones/:id` → `200`. `PATCH /api/promociones/:id/eliminar`
  → `200`. Dada de baja o inexistente: `404` "No existe la promoción.".
- Mensajes: "El título es obligatorio.", "El título no puede superar los 80 caracteres.", "La descripción es
  obligatoria.", "La descripción no puede superar los 500 caracteres.", "Elegí una fecha de inicio.", "La fecha
  de fin no puede ser anterior a la de inicio.", más los de días y horas de las misiones.
- Cada alta, edición o baja audita `PROMOTIONS_UPDATED`: "Creó la promoción "…"" (con sus campos), "Editó la
  promoción "…"" (una fila por campo) o "Dio de baja la promoción "…"".

**Pantalla:** Configuración → **Promociones** (opción nueva). Tabla Título · Días y horario · Vigencia · Último
envío · Estado (Vigente / Próxima / Terminada). Un clic en la fila abre el modal (Título, Descripción con
"n/500", Días, Horario, Desde, Hasta con la casilla "Sin fecha de fin"; abajo Eliminar · Cancelar · Guardar
promoción). Botón "+ Crear promoción". Vacío: "No hay promociones para los filtros seleccionados."

#### 3.7.3 `POST /api/promociones/:id/enviar` (A, US-49)

Manda el correo `PROMOTION` a **todos los clientes activos**. Responde `202 { queued: n }` y el envío sigue en
segundo plano ([3.8.3](#383-cómo-se-envía)).

| HTTP | `code` | Cuándo | Mensaje |
|---|---|---|---|
| 409 | `NOTIFICATION_DISABLED` | El tipo `PROMOTION` está desactivado | "Las notificaciones de promociones están desactivadas." |
| 409 | `PROMOTION_FINISHED` | La promoción ya terminó | "La promoción ya terminó." |

La pantalla pide confirmación: '¿Enviar "{título}" a {n} clientes por correo?' (el `n` sale de
`GET /customers?active=true&limit=1`, `total`). Toast: "Se están enviando {n} correos.".

#### 3.7.4 `GET /api/customers/me/promociones` (Cl)

Las vigentes hoy y las que empiezan en los próximos 7 días, por `validFrom`. Respuesta `Promotion[]` (sin
`lastSentAt`). En **Inicio**, la tarjeta "Promociones" muestra la de hoy (o la próxima, con "Desde el {fecha}").
Sin ninguna, la tarjeta no aparece.

---

### 3.8 Notificaciones (US-47 a US-50)

#### 3.8.1 Cuándo se envía cada una

| Tipo | Disparador | Destinatarios | Historia |
|---|---|---|---|
| `POINTS_EXPIRING` | Proceso diario a las **09:00** (hora de Argentina) | Clientes activos con lotes `ACTIVE` y saldo que vencen **dentro de 7 días** (S5-17). Un correo por cliente con el total (`{puntos}`) y la fecha más próxima (`{fecha}`); una sola vez por lote | US-47 |
| `BIRTHDAY` | Proceso diario a las **09:00** | Clientes activos cuyo `dateOfBirth` es hoy (día y mes). El 29/02 se toma el 28/02 en años no bisiestos | US-48 |
| `PROMOTION` | `POST /promociones/:id/enviar` | Clientes activos | US-49 |
| `MISSION` | Al completar una misión ([3.2](#32-progreso-y-cumplimiento-us-30)), después del commit | El cliente | US-50 |

- Si el tipo está desactivado, no se envía y se registra `SKIPPED`.
- **No se repite:** el mismo tipo al mismo cliente por el mismo motivo (el mismo lote, el mismo cumpleaños, la
  misma misión del mes, la misma promoción y envío) se envía una sola vez (índice único,
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
- El correo lleva el logo ([3.5.4](#354-logo)), el asunto y el mensaje con las variables reemplazadas, y el pie
  fijo "Recibís este correo porque sos parte de Vitto Club.".
- El envío **nunca** va dentro de la transacción de negocio: un correo que falla no deshace un consumo, un
  reclamo ni un regalo de cumpleaños.
- Un correo que falla queda `FAILED` con el motivo y **no se reintenta** (S5-28).

#### 3.8.4 Registro (RF-050 a RF-053)

Cada notificación se guarda con **tipo, canal, fecha y destinatario** (lo que piden los RF), más el cliente, el
asunto, el estado y el motivo del error si falló. Solo inserción, como los movimientos de puntos.

`GET /api/notificaciones` (A): filtros `type`, `status`, `documentType` + `documentNumber` (parcial, como en
Canjes), `fromDate`, `toDate`; paginado de a 20, por fecha descendente. Respuesta `{ items, total, page, limit }`
con `{ id, createdAt, type, channel, recipient, customer: { id, firstName, lastName, documentType,
documentNumber }, subject, status, error }`.

**Pantalla:** Configuración → Notificaciones → pestaña **Historial**: filtros Tipo, Estado, documento del cliente
y fechas; columnas Fecha y hora · Tipo · Cliente · Destinatario · Estado (con el error en un tooltip si falló).
Vacío: "No hay notificaciones para los filtros seleccionados."

---

### 3.9 Estadísticas y reporte PDF (US-51 a US-55)

Todas son consultas (no se auditan), solo del Administrador. Filtros comunes: `fromDate` y `toDate`
(`YYYY-MM-DD`, hora de Argentina, obligatorios, máximo 366 días). Faltan: `400` "Elegí un período.". Rango
invertido: `400` "fromDate no puede ser posterior a toDate". Más de 366 días: `400` "El período no puede superar
un año.".

#### 3.9.1 `GET /api/estadisticas/clientes` (US-51, RF-054)

```json
{ "active": 184, "new": 23, "frequent": 41, "frequentMinConsumptions": 3, "byMonth": [{ "month": "2026-10", "new": 12, "withConsumptions": 97 }] }
```

- **Activos:** clientes no dados de baja al final del período.
- **Nuevos:** dados de alta en el período.
- **Frecuentes:** con **al menos `frequentMinConsumptions`** consumos `REGISTERED` en el período. El mínimo lo
  configura el Administrador (S5-22, [3.9.6](#396-mínimo-de-un-cliente-frecuente)).

#### 3.9.2 `GET /api/estadisticas/consumos` (US-52, RF-055)

`?groupBy=day|week|month` (por defecto `month`) para "por período". Solo consumos `REGISTERED`.

```json
{
  "total": { "count": 612, "amount": 9845000 },
  "byPeriod": [{ "period": "2026-10-01", "count": 21, "amount": 340000 }],
  "byWeekday": [{ "weekday": 1, "count": 80, "amount": 1200000 }],
  "byTimeSlot": [{ "from": "08:00", "to": "12:00", "count": 150, "amount": 2100000 }]
}
```

**Franjas horarias** (S5-22): 00:00–08:00, 08:00–12:00, 12:00–16:00, 16:00–20:00 y 20:00–24:00, en hora de
Argentina. `byWeekday` trae los 7 días aunque alguno tenga 0.

#### 3.9.3 `GET /api/estadisticas/puntos` (US-53, RF-056)

`{ awarded, bonus, missionRewards, birthdayBonus, redeemed, expired, adjustedAdd, adjustedSubtract, voided, byMonth:
[{ month, awarded, redeemed, expired }] }`, sumando los movimientos del período por tipo (valores absolutos).

#### 3.9.4 `GET /api/estadisticas/programa` (US-54, RF-057)

```json
{
  "levels": [{ "level": "BRONZE", "customers": 120 }, { "level": "SILVER", "customers": 50 }, { "level": "GOLD", "customers": 14 }],
  "missions": [{ "id": 3, "name": "Vení 3 veces", "assigned": 90, "completed": 30, "claimed": 28, "expired": 60 }],
  "topRewards": [{ "id": 1, "name": "Merienda gratis", "used": 58 }]
}
```

Niveles: el nivel **actual** de los clientes activos. Misiones: las asignaciones de los meses del período
(completadas cuenta Completada + Reclamada). Recompensas más canjeadas: por canjes `USED` en el período, las 10
primeras (incluye dadas de baja, con su nombre del snapshot).

#### 3.9.5 `GET /api/estadisticas/reporte.pdf` (US-55, RF-058)

Mismos filtros. Responde `application/pdf` con `Content-Disposition: attachment;
filename="vitto-club-reporte-{fromDate}-{toDate}.pdf"`. Contenido: logo, título "Reporte Vitto Club", período,
fecha de generación y las cuatro secciones en tablas. Se arma con **PDFKit** (dependencia `pdfkit`, autorizada;
S5-11). El frontend lo baja con `shared/api/download.ts`.

#### 3.9.6 Mínimo de un cliente frecuente

- `GET /api/loyalty/configuration/frequent-customers` (A) → `{ minConsumptions: 3 }`.
- `PUT /api/loyalty/configuration/frequent-customers` (A), body `{ minConsumptions }`: entero 1–100 ("Ingresá
  un número entero de 1 a 100."). Se guarda en la **versión** de la configuración del programa (RF-014). Audita
  `FREQUENT_CUSTOMERS_UPDATED` con "Mínimo de consumos: {antes} → {después}".
- **Pantalla:** Configuración → Puntos, tarjeta nueva "Clientes frecuentes" ("Un cliente es frecuente si tiene
  al menos {n} consumos en el período."). En Estadísticas, el bloque Clientes dice "Frecuentes (al menos {n}
  consumos)".

#### 3.9.7 Pantalla

Administración → **Estadísticas y reportes**. Arriba: período con calendario (un día o un rango, como Canjes;
por defecto el mes actual) y "Exportar reporte PDF". Cuatro bloques: **Clientes** · **Consumos** (con el
selector Día / Semana / Mes) · **Puntos** · **Programa**, con tarjetas de totales, tablas y barras hechas con
CSS (sin librería de gráficos, S5-27). Carga: "Cargando…". Error: "No se pudieron cargar las estadísticas.".

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
| Configuración | "Notificaciones" deja de estar deshabilitada; se agrega "Promociones"; en "Puntos", la tarjeta "Clientes frecuentes" y el campo "Beneficio" en Niveles |
| Vista del Cliente | Pestaña "Misiones" habilitada; tarjetas Misiones y Promociones en Inicio; beneficio del nivel; foto en el encabezado y en Mi perfil |
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
| Logo, mensajes y puntos de cumpleaños | Administrador | Sí (`LOGO_AND_MESSAGES_UPDATED`) |
| Promociones (alta, edición, baja) | Administrador | Sí (`PROMOTIONS_UPDATED`) |
| Mínimo de cliente frecuente | Administrador | Sí (`FREQUENT_CUSTOMERS_UPDATED`) |
| Beneficios de los niveles | Administrador | Sí (`LEVELS_UPDATED`) |
| Foto de la recompensa | Administrador | Sí (`REWARD_UPDATED`, "Foto: Actualizada / Quitada") |
| Foto de perfil del Cliente | — | **No** (perfil del cliente) |
| Envío de notificaciones (incluido el de una promoción) | — | **No**: quedan en el historial de notificaciones (S5-28) |
| Estadísticas, PDF, cuenta del cliente | — | No (consultas) |

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
| `LOGO_AND_MESSAGES_UPDATED` | Modificó el logo y los mensajes automáticos | — | — | Una fila por cambio |
| `PROMOTIONS_UPDATED` | Creó / Editó / Dio de baja la promoción "{título}" | — | — | Campos (alta) o una fila por cambio |
| `FREQUENT_CUSTOMERS_UPDATED` | Modificó el mínimo de cliente frecuente | — | — | Mínimo de consumos: {antes} → {después} |

En el filtro de Auditoría: `BIRTHDAY_BONUS_GRANTED` = "Regaló puntos de cumpleaños" (módulo Puntos) y
`FREQUENT_CUSTOMERS_UPDATED` = "Modificó cliente frecuente" (módulo Configuración).

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

Una fila por `NotificationType`: `type` (PK), `active`, `subject` (varchar 120), `body` (varchar 1000), `updated_at`.
La migración carga los textos de [3.6.1](#361-get-apiconfiguracionmensajes-a).

#### `NotificationSettings` → tabla `notification_settings` (fila única, `id = 1`)

`birthday_bonus_points` (int, por defecto 100, `CHECK 0–10000`), `logo_public_id` y `logo_url` (nullable),
`updated_at`.

#### `Notification` → tabla `notifications` (RF-050 a RF-053)

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | serial | No | |
| `type` | `NotificationType` | No | Tipo (RF) |
| `channel` | `NotificationChannel` | No | Canal (RF) |
| `recipient` | varchar(150) | No | Destinatario (RF): el email en ese momento |
| `customer_id` | int → `customers` | No | |
| `subject` | varchar(120) | No | Ya con las variables reemplazadas |
| `status` | `NotificationStatus` | No | |
| `error` | varchar(500) | Sí | `CHECK` solo en `FAILED` |
| `dedupe_key` | varchar(100) | No | `UNIQUE (type, customer_id, dedupe_key)`: "lot:{id}", "birthday:{año}", "mission:{customer_mission_id}", "promotion:{id}:{envío}" |
| `created_at` | timestamp | No | Fecha (RF) |

Solo inserción (trigger, como `audit_logs`).

#### `Promotion` → tabla `promotions`

Columnas de [3.7.1](#371-tipo-promotion), más `last_sent_at`, `created_at`, `updated_at`, `deleted_at` (`CHECK`
coherente con `status`) y `send_count` (int, para el `dedupe_key` de cada envío).

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
```

Todas con `onDelete: Restrict`.

---

## 4. Información general

Vale para **todo el sistema** (Sprints 1 a 5).

| | |
|---|---|
| **URL base** | `/api` relativa. En desarrollo, el proxy de Vite la manda a `http://localhost:3000`; en producción, un *rewrite* de Vercel a Render |
| **Formato** | JSON. En `POST`, `PUT` y `PATCH` con cuerpo: `Content-Type: application/json`. Las fotos y el logo: `multipart/form-data` |
| **Autenticación** | `Authorization: Bearer <accessToken>` (JWT de 15 minutos) en todos los endpoints salvo los públicos. El refresh token va en la cookie httpOnly `refresh_token`, `Path=/api`, `SameSite=Lax` (`withCredentials: true`) |
| **Públicos** | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/health`, `GET /configuracion/logo` |
| **Autorización** | `@Roles(...)` por endpoint. **Un endpoint sin `@Roles` ni `@Public` queda cerrado para todos.** Las reglas por rol se validan en el backend. Los `403` no se auditan |
| **Campos desconocidos** | `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`: cualquier campo o query param de más → `400 property X should not exist` |
| **Fechas de entrada** | Días en `YYYY-MM-DD` y meses en `YYYY-MM`, en hora de Argentina (UTC−03:00) |
| **Fechas de salida** | ISO 8601 en UTC. Fechas sin hora en `YYYY-MM-DD`. Horas sin fecha en `HH:mm`. La pantalla muestra `dd/mm/aaaa hh:mm` en hora de Argentina |
| **Montos** | Número JSON con hasta 2 decimales. Sin código de moneda |
| **Puntos** | Siempre enteros. Con signo en los movimientos |
| **Paginación** | `page` (≥ 1, por defecto 1) y `limit` (1–100; por defecto 20, o el que diga cada endpoint). Respuesta `{ items, total, page, limit }` |
| **Orden de las rutas** | `/customers/me/…` antes que `/customers/:id/…`; las palabras fijas (`/recompensas/disponibles`) antes que `/:id` |
| **Transacciones** | Todo lo que escribe va en la transacción ambiente (`PrismaTransactionRunner`), con la auditoría y los eventos de dominio. Los correos, las subidas a Cloudinary y los PDF van **fuera** |
| **Bloqueos** | `customer_points` en todo lo que mueve puntos. Al usar un canje: recompensa → canje → saldo. Al confirmar un canje: la recompensa. Al reclamar una misión: asignación → saldo |
| **Procesos automáticos** | Cinco, con `@nestjs/schedule`, cada uno con su variable (prendida por defecto, `false` en los e2e) y su comando: puntos (00:05), recompensas vencidas (00:05 y al iniciar), canjes vencidos (cada 5 min y al iniciar), **misiones (día 1, 00:10, y al iniciar)** y **notificaciones (09:00)** |
| **CORS** | Origen por variable de entorno `CORS_ORIGIN` (por defecto `http://localhost:5173`), con credenciales |
| **Correo** | Resend. `NOTIFICATIONS_EMAIL_ENABLED=false` en desarrollo y en los e2e |
| **Imágenes** | Cloudinary. `IMAGES_STORAGE_ENABLED=false` en los e2e y en desarrollo sin cuenta |
| **Dependencias autorizadas en el Sprint 5** | `resend`, `pdfkit` y `cloudinary` (S5-18, S5-24). Ninguna otra sin permiso |

### Matriz de permisos completa (Sprints 1 a 5)

| Endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/health`, `GET /configuracion/logo` | público | público | público |
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
| `GET /customers/me/promociones` | No | No | Sí |
| `GET /consumos/preview`, `POST /consumos`, `PATCH /consumos/:code/anular` | Sí | Sí (anula solo los propios, < 24 h) | No |
| `GET /consumos`, `GET /consumos/:code` | Sí | No | No |
| `GET /auditoria`, `GET /auditoria/actores` | Sí | No | No |
| `/recompensas`, `/recompensas/:id` (`GET`, `POST`, `PATCH`, `…/activar`, `…/desactivar`, `…/eliminar`), `PUT`/`DELETE /recompensas/:id/foto` | Sí | No | No |
| `GET /recompensas/disponibles` | Sí | Sí | No |
| `GET /customers/:id/canjes`, `POST /customers/:id/canjes` | Sí | Sí | No |
| `GET /canjes` | Sí | No | No |
| `GET /canjes/:code`, `PATCH /canjes/:code/usar`, `PATCH /canjes/:code/rechazar` | Sí | Sí | No |
| `/misiones`, `/misiones/:id` (`GET`, `POST`, `PATCH`, `…/eliminar`) | Sí | No | No |
| `/configuracion/mensajes`, `PUT /configuracion/logo` | Sí | No | No |
| `/promociones/*` (incluye `…/enviar`) | Sí | No | No |
| `GET /notificaciones` | Sí | No | No |
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
| Envío en segundo plano (`POST /promociones/:id/enviar`) | `202` | `{ queued }` |
| Redirección (`GET /configuracion/logo`) | `302` | — |
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
| 409 | `NOTIFICATION_DISABLED` | Enviar una promoción con el tipo desactivado | **S5** |
| 409 | `PROMOTION_FINISHED` | Enviar una promoción que ya terminó | **S5** |

> `FORBIDDEN_FIELD` (S3) **ya no se usa**: desde D-03 el documento no viaja en el DTO y un documento en el body
> responde `400 property documentType should not exist`. Se borra en el ARRASTRE-S4 (A4-12).

**`404` sin `code`** (nuevos): "No existe la misión.", "No existe la promoción.", "El cliente no tiene cuenta.",
"La recompensa no tiene foto.", "No tenés foto de perfil.".

---

## 6. Códigos HTTP

| Código | Significado en el sistema |
|---|---|
| `200 OK` | Consulta o modificación correcta, con cuerpo; el PDF |
| `201 Created` | Alta: empleado, usuario, cliente, consumo, ajuste, recompensa, canje, misión, promoción |
| `202 Accepted` | Envío de una promoción en segundo plano |
| `204 No Content` | Acción correcta sin cuerpo |
| `302 Found` | `GET /configuracion/logo` |
| `400 Bad Request` | Formato o validación; campo desconocido; fechas inválidas o invertidas; período que falta o de más de un año; contraseña actual incorrecta; imagen inválida; `q` junto con `name` o `documentNumber` |
| `401 Unauthorized` | Sin token o vencido (`UNAUTHENTICATED`), login fallido, sesión inválida. El frontend renueva y repite una sola vez |
| `403 Forbidden` | El rol no alcanza (`FORBIDDEN`) o regla de permiso de negocio (`VOID_NOT_ALLOWED`). No se reintenta ni se audita |
| `404 Not Found` | Recurso inexistente, dado de baja o de otro cliente; código de canje mal escrito; foto o logo que no hay |
| `409 Conflict` | Estado incompatible (ver la tabla de [5](#5-convenciones-de-respuestas-y-códigos-de-error)) |
| `429 Too Many Requests` | Límite de intentos de contraseña |
| `500 Internal Server Error` | Inesperado. Mensaje genérico "Unexpected error." |

---

## 7. Cambios respecto del Sprint 4

| # | Dónde | Antes | Ahora |
|---|---|---|---|
| 1 | Misiones (menú, pestaña del Cliente) | "Próx." | Pantallas reales (US-28 a US-33) |
| 2 | Estadísticas | "Próx." | Pantalla y PDF (US-51 a US-55) |
| 3 | Configuración → Notificaciones | "Próx." | Logo, mensajes, puntos de cumpleaños, historial (US-14, US-47 a US-50) |
| 4 | `photoUrl` de `Reward` | Siempre `null` | La foto en Cloudinary, si tiene |
| 5 | `PointsMovementType` | Sin misiones ni cumpleaños | `MISSION_REWARD` y `BIRTHDAY_BONUS` |
| 6 | Auditoría de misiones (S3 §3.9.3) | `MISSION_COMPLETED` con "Puntos otorgados" | Los puntos van en `MISSION_REWARD_CLAIMED`; nuevas `BIRTHDAY_BONUS_GRANTED` y `FREQUENT_CUSTOMERS_UPDATED` |
| 7 | Niveles | Sin beneficios | Un texto por nivel (NIV-BEN) |
| 8 | Cuentas | Solo de empleados | El Administrador ve también la del cliente (CTA-CLI) |
| 9 | Procesos automáticos | Tres | Cinco (+ misiones y notificaciones) |
| 10 | `POST /consumos` y anulación | Puntos y nivel | + avance de misiones y `completedMissions` |
| 11 | `GET /movimientos-de-puntos` | Sin pantalla | Se elimina |
| 12 | CORS | Fijo | Por variable de entorno |
| 13 | Clientes (`/customers/me`, `/:id`, `by-document`) | Sin foto | `photoUrl` |
| 14 | Configuración del programa | — | Mínimo de cliente frecuente |
| 15 | Repositorio | Sin CI | GitHub Actions en cada PR |

---

## 8. Observaciones

### 8.1 Diferencias del prototipo que este contrato corrige

Las pantallas del Sprint 5 del prototipo son **de la primera versión** (antes del Sprint 3): tienen la
numeración vieja de historias y RF en las notas, datos fijos y formularios que no se pueden medir. Hay que
actualizarlas con `PROMPT_PROTOTIPO_SPRINT_5.md` antes de programar el frontend.

| # | Prototipo | Contrato |
|---|---|---|
| 1 | Notas con numeración vieja (US-48 a US-51 para notificaciones, US-56 para el PDF, RF-030 a RF-036 para misiones) | Numeración del Seguimiento v1.5 ([9](#9-resumen-por-historia)) |
| 2 | Misión con "Objetivo" en texto libre y "Período" Días / Semanas / Meses con fechas desde y hasta | Tipo de objetivo medible, mes de inicio y de fin (misión **mensual**, RF-031) |
| 3 | Estado de la misión del cliente "En curso" y de la misión "Inactiva" | "En progreso" (Definición del Producto §9); la misión se "Elimina" |
| 4 | El beneficio del nivel se llama "Observaciones" | "Beneficio" (RF-029) |
| 5 | Estadísticas con cuatro números fijos | Cuatro bloques con período y tablas (RF-054 a RF-057) |
| 6 | Notificaciones: solo vencimiento, cumpleaños y misiones | + promociones (RF-052), puntos de cumpleaños y el historial de envíos (RF-050 a RF-053) |
| 7 | No hay pantalla de promociones, de logo ni de cliente frecuente | Se agregan (RF-012, RF-013, S5-22) |
| 8 | No hay foto de perfil, ni beneficios en el Inicio, ni cuenta del cliente en "Ver más" | Se agregan (S5-1, S5-2, S5-3) |

### 8.2 Reglas de negocio que el backend tiene que garantizar (no solo la pantalla)

- **Misiones:** el avance sale del consumo en la misma transacción; nunca pasa el objetivo; una Completada,
  Reclamada o Vencida no suma más; el snapshot de la asignación no cambia si se edita la misión.
- **Reclamo:** solo de una Completada con recompensa, del cliente del token, una sola vez (bloqueo). Los puntos
  no suman al nivel.
- **Fin de mes y baja de una misión:** las En progreso vencen; las Completadas con recompensa se reclaman
  solas. **Nunca se pierde una recompensa ganada.** Idempotente.
- **Cumpleaños:** los puntos se regalan una vez por año, aunque el correo falle; no suman al nivel.
- **Notificaciones:** se registran siempre (enviadas, fallidas u omitidas), una sola vez por motivo, fuera de la
  transacción de negocio. No se mandan correos desde desarrollo ni desde los e2e.
- **Imágenes:** se validan por contenido y tamaño en el backend antes de subirlas; las fotos de perfil solo se
  entregan con URL firmada.
- **Promociones y beneficios:** son informativos: no cambian el cálculo de puntos.
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
| S5-16 | Promociones (PD-8) | **Solo informativas**: no cambian los puntos | Deni, 09/11 |
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
| S5-27 | Gráficos (PD-19) | Tablas y barras con CSS, sin librería nueva | Deni, 09/11 |
| S5-28 | Correos fallidos y auditoría de envíos (PD-16, PD-17) | Sin reintento; los envíos no se auditan (quedan en el historial) | Deni, 09/11 |
| S5-29 | Cuenta del cliente (PD-21) | **Solo verla** | Deni, 09/11 |
| S5-30 | Tests del frontend y CI (PD-23) | **Se saca Vitest** del Seguimiento (estaba solo ahí). **Se hace el CI** con GitHub Actions (está en el Seguimiento y en la Definición del Producto) | Deni, 09/11 |
| S5-31 | Puntos de cumpleaños sin RF | Hay que sumarlos a RF-051 / US-48 en los documentos del producto | Consecuencia de S5-25 |
| S5-32 | Contrato del Sprint 5 | Pasa a v1: todas las propuestas del v0 quedan decididas | Deni, 09/11 |
| S5-33 | "Próximamente" | No queda nada para otro sprint: lo que no esté en el contrato ni en un RF se pregunta | Deni, 09/11 |

### 8.4 Implementación sugerida

- **Módulos nuevos:**
  - `missions`: misiones, asignación, avance, reclamo y proceso de fin de mes.
  - `notifications`: plantillas, ajustes (logo y puntos de cumpleaños), promociones, envío y registro, y el
    proceso diario. Puerto `EmailSender` (Resend y log).
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
  - `rewards`, `customers` y `notifications` usan `images`.
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
    cumpleaños con y sin puntos, una vez por año.
  - Estadísticas: cada métrica con datos conocidos; mínimo de frecuente configurable; rango invertido; más de un
    año; período que falta.
  - Beneficios: guardar, versión nueva, auditoría, `benefit` en el saldo.
  - Cuenta del cliente: con cuenta, sin cuenta, permisos.
  - `GET /movimientos-de-puntos` → `404` después de eliminarlo.

---

## 9. Resumen por historia

| US | Título | RF | Endpoints | Pantallas |
|---|---|---|---|---|
| US-14 | Configurar imagen y mensajes automáticos | RF-012 | `GET`/`PUT /configuracion/mensajes`, `PUT`/`GET /configuracion/logo` | Configuración → Notificaciones |
| US-15 | Configurar promociones especiales | RF-013 | `/promociones`, `GET /customers/me/promociones` | Configuración → Promociones; Inicio del Cliente |
| US-28 | Crear misión mensual | RF-031 | `POST /misiones`, `GET /misiones` | Misiones → "+ Crear misión mensual" |
| US-29 | Editar / dar de baja misión | RF-032 | `GET`/`PATCH /misiones/:id`, `PATCH …/eliminar` | Misiones → clic en la fila |
| US-30 | Progreso y cumplimiento automático de misiones | RF-033 / RF-034 | Dentro de `POST /consumos` y de la anulación | "Consumo registrado"; Mis misiones |
| US-31 | Reclamar recompensa de misión | RF-035 | `PATCH /customers/me/misiones/:id/reclamar` | Cliente → Misiones |
| US-32 | Vencer y reiniciar misiones | RF-036 | Proceso de fin de mes | Auditoría |
| US-33 | Consultar misiones | RF-037 (y RF-017) | `GET /customers/me/misiones`, `GET /customers/:id/misiones` | Cliente → Misiones; Inicio; ficha; Caja |
| US-34 | Imagen de la recompensa | RF-038 | `PUT`/`DELETE /recompensas/:id/foto` | Modal de recompensa; catálogo; mostrador; canjes |
| US-47 | Notificar vencimiento de puntos | RF-050 | Proceso diario | Historial de notificaciones |
| US-48 | Notificar cumpleaños (con regalo de puntos) | RF-051 | Proceso diario, `birthdayBonusPoints` | Configuración → Notificaciones; historial |
| US-49 | Notificar promociones | RF-052 | `POST /promociones/:id/enviar` | Promociones → Enviar por correo |
| US-50 | Notificar avance de misiones | RF-053 | Al completar | Historial de notificaciones |
| US-51 | Estadísticas de clientes | RF-054 | `GET /estadisticas/clientes`, `/loyalty/configuration/frequent-customers` | Estadísticas; Configuración → Puntos |
| US-52 | Estadísticas de consumos por período | RF-055 | `GET /estadisticas/consumos` | Estadísticas |
| US-53 | Estadísticas de puntos | RF-056 | `GET /estadisticas/puntos` | Estadísticas |
| US-54 | Estadísticas de niveles, misiones y recompensas | RF-057 | `GET /estadisticas/programa` | Estadísticas |
| US-55 | Exportar reportes generados | RF-058 | `GET /estadisticas/reporte.pdf` | Estadísticas → Exportar reporte PDF |
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
