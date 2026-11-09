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
> niveles), **CTA-CLI** (cuentas de clientes, RF-08) y el **ARRASTRE-S4**.
>
> **Versión 0 (09/11/2026, borrador).** Es el borrador para el Planning del Sprint 5. Lo que tiene ✅ sale de
> una fuente o de una decisión de la PO. Lo que tiene 🟡 es una **propuesta técnica** que el equipo tiene que
> aprobar en el Planning antes de programar esa parte ([10](#10-pendientes)). **No se programa nada 🟡 sin la
> aprobación.**
>
> **Como es el último sprint**, las secciones [4](#4-información-general), [5](#5-convenciones-de-respuestas-y-códigos-de-error)
> y [6](#6-códigos-http) están **completas**: valen para todo el sistema y reemplazan a las de los contratos
> anteriores. El resto de los endpoints de los Sprints 1 a 4 no cambia: su detalle sigue en
> `docs/sprint-3/API_CONTRACT_SPRINT_3.md`, `docs/sprint-4/API_CONTRACT_SPRINT_4.md` y `docs/funcionalidades/`.
>
> **Si este contrato choca con `HISTORIAS_SPRINT_5.md`, manda el contrato.** Si choca con el prototipo, mirá
> la [8.1](#81-diferencias-del-prototipo-que-este-contrato-corrige).

**Convenciones de este documento**

- "UI" es el texto que muestra la pantalla. "API" es el valor que viaja en el JSON.
- Las decisiones se citan como "decisión S5-N" y están en la [8.3](#83-decisiones-del-sprint-5). Las de los
  sprints anteriores siguen valiendo ("decisión #N" del S3, "S4-N" del S4).
- **Marcas:** ✅ decidido, se programa así · 🟡 propuesta que se aprueba en el Planning (ver la PD que se cita).
- **Numeración de historias:** la del Seguimiento v1.5 (US-56 registrar auditoría, US-57 consultar,
  US-58 autorregistro, US-59 perfil).
- **Máquinas de estado:** los nombres salen de la sección 9 de la Definición del Producto. Misión mensual por
  cliente: **En progreso, Completada, Reclamada, Vencida**.

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
   - [3.6 Logo y mensajes automáticos (US-14)](#36-logo-y-mensajes-automáticos-us-14)
   - [3.7 Promociones especiales (US-15)](#37-promociones-especiales-us-15)
   - [3.8 Notificaciones (US-47 a US-50)](#38-notificaciones-us-47-a-us-50)
   - [3.9 Estadísticas y reporte PDF (US-51 a US-55)](#39-estadísticas-y-reporte-pdf-us-51-a-us-55)
   - [3.10 Beneficios de los niveles (NIV-BEN)](#310-beneficios-de-los-niveles-niv-ben)
   - [3.11 Cuentas de los clientes (CTA-CLI)](#311-cuentas-de-los-clientes-cta-cli)
   - [3.12 Cambios en pantallas y endpoints existentes](#312-cambios-en-pantallas-y-endpoints-existentes)
   - [3.13 Auditoría del Sprint 5](#313-auditoría-del-sprint-5)
   - [3.14 Modelo de datos nuevo (BASE-5)](#314-modelo-de-datos-nuevo-base-5)
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
| 1 | `GET` | `/misiones` | A | Listado de misiones, con búsqueda y filtro de estado | US-28, US-29 |
| 2 | `GET` | `/misiones/:id` | A | Datos para editar | US-29 |
| 3 | `POST` | `/misiones` | A | Crear misión mensual | US-28 |
| 4 | `PATCH` | `/misiones/:id` | A | Editar misión | US-29 |
| 5 | `PATCH` | `/misiones/:id/eliminar` | A | Dar de baja (lógica) | US-29 |
| 6 | `GET` | `/customers/me/misiones` | Cl | Misiones del mes con mi progreso | US-33 |
| 7 | `PATCH` | `/customers/me/misiones/:id/reclamar` | Cl | Reclamar la recompensa de una misión Completada | US-31 |
| 8 | `GET` | `/customers/:id/misiones` | A, C | Misiones del mes del cliente (ficha y panel de Caja, RF-017) | US-33 |
| 9 | `PUT` | `/recompensas/:id/foto` | A | Subir o reemplazar la foto | US-34 |
| 10 | `DELETE` | `/recompensas/:id/foto` | A | Quitar la foto | US-34 |
| 11 | `GET` | `/recompensas/:id/foto` | público | La imagen (para `<img src>`) | US-34 |
| 12 | `PUT` | `/customers/me/foto` | Cl | Subir o reemplazar mi foto de perfil | FOTO-PERFIL |
| 13 | `DELETE` | `/customers/me/foto` | Cl | Quitar mi foto | FOTO-PERFIL |
| 14 | `GET` | `/customers/:id/foto` | 🟡 ver [3.5.3](#353-foto-de-perfil-del-cliente) | La imagen del perfil | FOTO-PERFIL |
| 15 | `GET` | `/configuracion/mensajes` | A | Logo y mensajes automáticos | US-14 |
| 16 | `PUT` | `/configuracion/mensajes` | A | Guardar mensajes y activar/desactivar cada tipo | US-14 |
| 17 | `PUT` | `/configuracion/logo` | A | Subir o reemplazar el logo | US-14 |
| 18 | `GET` | `/configuracion/logo` | público | El logo (login y correos) | US-14 |
| 19 | `GET` | `/promociones` | A | Listado de promociones | US-15 |
| 20 | `POST` | `/promociones` | A | Crear promoción | US-15 |
| 21 | `PATCH` | `/promociones/:id` | A | Editar promoción | US-15 |
| 22 | `PATCH` | `/promociones/:id/eliminar` | A | Dar de baja una promoción | US-15 |
| 23 | `POST` | `/promociones/:id/enviar` | A | Enviar la notificación de la promoción | US-49 |
| 24 | `GET` | `/customers/me/promociones` | Cl | Promociones vigentes | US-15, US-49 |
| 25 | `GET` | `/notificaciones` | A | Historial de notificaciones enviadas | US-47 a US-50 |
| 26 | `GET` | `/estadisticas/clientes` | A | Clientes activos, frecuentes y nuevos | US-51 |
| 27 | `GET` | `/estadisticas/consumos` | A | Consumos por período, día de la semana y franja horaria | US-52 |
| 28 | `GET` | `/estadisticas/puntos` | A | Puntos otorgados, canjeados y vencidos | US-53 |
| 29 | `GET` | `/estadisticas/programa` | A | Niveles, misiones y recompensas más canjeadas | US-54 |
| 30 | `GET` | `/estadisticas/reporte.pdf` | A | Exportar el reporte en PDF | US-55 |
| 31 | `GET` | `/customers/:id/cuenta` | A | Cuenta de acceso del cliente (RF-08) | CTA-CLI |

### Existentes que cambian en este sprint

| Método | Ruta | Qué cambia |
|---|---|---|
| `GET`/`PUT` | `/loyalty/configuration/levels` | Suma los **beneficios** de cada nivel ([3.10](#310-beneficios-de-los-niveles-niv-ben)) |
| `GET` | `/customers/me/puntos`, `/customers/:id/puntos` | `level` suma `benefit` ([3.10](#310-beneficios-de-los-niveles-niv-ben)) |
| `GET` | `/customers/me` | Suma `photoUrl` ([3.5.3](#353-foto-de-perfil-del-cliente)) |
| — | Tipo `Reward` | `photoUrl` deja de venir siempre en `null` ([3.5.2](#352-foto-de-la-recompensa-us-34)) |
| `POST` | `/consumos` | Suma avance de misiones en la misma transacción ([3.2](#32-progreso-y-cumplimiento-us-30)) |
| `PATCH` | `/consumos/:code/anular` | 🟡 Resta el avance de las misiones En progreso (PD-13) |
| `GET` | `/customers/:id/movimientos`, `/customers/me/movimientos` | Aparece el tipo `MISSION_REWARD` |
| `GET` | `/auditoria` | Se habilita el módulo `MISSIONS` y las acciones de [3.13](#313-auditoría-del-sprint-5) |

### Existentes que se eliminan

| Método | Ruta | Motivo |
|---|---|---|
| `GET` | `/movimientos-de-puntos` | 🟡 Se quedó sin pantalla el 25/10 y el frontend borró la página el 09/11 (`d427f5e`). Las estadísticas de puntos de US-53 lo reemplazan. Propuesta: eliminarlo (PD-3) |

---

## 2. Enumerados

Los existentes de los Sprints 1 a 4 no cambian, salvo `PointsMovementType` y los de auditoría. La lista
completa está en `docs/database/modelo-de-datos.md`.

### 2.1 `CustomerMissionStatus` — estado de la misión de un cliente ✅

Sale de la máquina "Misión mensual" (Definición del Producto §9, cuadro) y de las decisiones S5-4 y S5-5.

| API | UI | Final | Cómo llega |
|---|---|---|---|
| `IN_PROGRESS` | En progreso | No | `asignar()` (nace así) y `registrarAvance()` |
| `COMPLETED` | Completada | **Sí, si la misión no tiene recompensa** (S5-4) | `completar()` al llegar al objetivo |
| `CLAIMED` | Reclamada | Sí | `reclamar()` del Cliente, o el reclamo automático de fin de mes (S5-5) |
| `EXPIRED` | Vencida | Sí | `vencer()` a fin de mes, solo desde En progreso |

### 2.2 `MissionStatus` — estado de la misión (catálogo) 🟡

La Definición del Producto no tiene máquina de la misión en sí, solo la del cliente. RF-032 pide "modificar o
dar de baja lógicamente".

| API | UI | Cuándo |
|---|---|---|
| `ACTIVE` | Activa | Al crearla. Se asigna a los clientes en los meses que dura |
| `DELETED` | Dada de baja | El Administrador la elimina (estado final). El botón dice "Eliminar", como en Recompensas |

> Una misión sin meses por delante (todos sus meses ya pasaron) se muestra como **"Finalizada"**: se calcula
> con la fecha, no es un estado guardado (PD-15).

### 2.3 `MissionObjectiveType` — qué mide la misión 🟡 (PD-7)

RF-031 pide un "objetivo medible" y RF-033 que el avance salga "de sus consumos y operaciones registradas".
El prototipo tiene el objetivo como texto libre ("3 visitas en el mes"), que no se puede medir. Propuesta:

| API | UI | `target` | Cómo suma |
|---|---|---|---|
| `CONSUMPTION_COUNT` | Cantidad de consumos | Entero 1–100 | +1 por cada consumo que cumpla la condición |
| `CONSUMPTION_AMOUNT` | Monto acumulado | Monto 1–1.000.000 | + el monto de cada consumo que cumpla la condición |

**Condición opcional** (las dos combinables, del ejemplo del prototipo "Probá el brunch de domingo" 09:00–13:00):
días de la semana (`daysOfWeek`) y franja horaria (`timeFrom`, `timeTo`), en hora de Argentina.

### 2.4 `NotificationType` ✅ (RF-050 a RF-053)

| API | UI | RF | Historia |
|---|---|---|---|
| `POINTS_EXPIRING` | Vencimiento de puntos | RF-050 | US-47 |
| `BIRTHDAY` | Cumpleaños | RF-051 | US-48 |
| `PROMOTION` | Promociones | RF-052 | US-49 |
| `MISSION` | Misiones | RF-053 | US-50 |

> El aviso de **canje rechazado** (PD-6 del S4) no tiene RF. Propuesta: no se agrega (PD-6).

### 2.5 `NotificationChannel` ✅

| API | UI |
|---|---|
| `EMAIL` | Correo electrónico |

Es el único canal: el Seguimiento (§2.6) y la Definición del Producto (§10.1) fijan el correo con Resend, y el
correo es obligatorio para todo cliente (RF-015).

### 2.6 `NotificationStatus` 🟡

| API | UI | Cuándo |
|---|---|---|
| `SENT` | Enviada | El proveedor aceptó el correo |
| `FAILED` | Falló | El proveedor respondió error. Se guarda el motivo y **no se reintenta** (PD-16) |
| `SKIPPED` | No enviada | El tipo estaba desactivado o el envío está apagado en el entorno ([4](#4-información-general)) |

### 2.7 `PointsMovementType` — valor nuevo ✅

| API | UI (movimientos) | Cuándo |
|---|---|---|
| `MISSION_REWARD` | "Recompensa de misión: {misión}" (Cliente: "Ganaste {n} pts por la misión {misión}") | Al reclamar (Cliente o Sistema). Crea un lote con la vigencia vigente |

**No suma a los puntos acumulados** (`lifetimePoints`): el nivel se calcula "según sus puntos acumulados por
consumos" (RF-028 y Glosario del Plan de Proyecto, "Puntos acumulados").

### 2.8 `ImageOwnerType` 🟡 (PD-1)

`REWARD`, `CUSTOMER`, `LOGO`. Solo existe si las imágenes se guardan en la base ([3.5.1](#351-reglas-comunes-de-las-imágenes)).

### 2.9 Auditoría: cambios en los enums existentes ✅

- `AuditModule.MISSIONS` deja de mostrarse "(Próximamente)" en el filtro de Auditoría.
- Se empiezan a usar `MISSION_CREATED`, `MISSION_UPDATED`, `MISSION_DELETED`, `MISSION_COMPLETED`,
  `MISSION_REWARD_CLAIMED`, `MISSIONS_EXPIRED`, `LOGO_AND_MESSAGES_UPDATED` y `PROMOTIONS_UPDATED` (ya
  existen en la base desde el Sprint 3).
- 🟡 Se agregan `PROMOTION_SENT` (Admin) y `NOTIFICATIONS_SENT` (Sistema)? **No:** propuesta de no auditar
  los envíos, porque quedan en el historial de notificaciones (RF-050 a RF-053) (PD-17).

---

## 3. Endpoints

### 3.1 Misiones del Administrador (US-28, US-29)

#### 3.1.1 Tipo `Mission`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | number | No | |
| `name` | string | No | 1–80, único entre las no dadas de baja (sin distinguir mayúsculas), como las recompensas 🟡 |
| `description` | string | Sí | Hasta 255 |
| `objectiveType` | `MissionObjectiveType` | No | [2.3](#23-missionobjectivetype--qué-mide-la-misión--pd-7) |
| `target` | number | No | Objetivo (entero para `CONSUMPTION_COUNT`; monto con 2 decimales para `CONSUMPTION_AMOUNT`) |
| `daysOfWeek` | number[] | Sí | 1 (lunes) a 7 (domingo). `null` = todos los días |
| `timeFrom`, `timeTo` | string | Sí | `HH:mm`, hora de Argentina. Los dos o ninguno; `timeFrom < timeTo` |
| `rewardPoints` | number | Sí | 1–100.000. `null` = **sin recompensa** (RF-031: "opcionalmente") |
| `startMonth` | string | No | `YYYY-MM`. Primer mes en que se asigna. No puede ser anterior al mes actual al crear |
| `endMonth` | string | Sí | `YYYY-MM`. Último mes. `null` = se repite todos los meses mientras esté activa 🟡 (PD-14) |
| `status` | `MissionStatus` | No | |
| `isRunning` | boolean | No | Calculado: `ACTIVE` y el mes actual está entre `startMonth` y `endMonth` |
| `completedCount` | number | No | Clientes que la completaron **este mes** (Completada + Reclamada) |
| `createdAt`, `updatedAt` | string | No | ISO UTC |

#### 3.1.2 `GET /api/misiones` — listado

| Query | Regla |
|---|---|
| `q` | Parte del nombre, sin mayúsculas ni tildes (máx. 80) |
| `status` | `RUNNING` (en curso este mes) · `UPCOMING` (empiezan más adelante) · `FINISHED` · sin valor = todas menos las dadas de baja 🟡 |
| `page` / `limit` | 1 / 10, máximo 100 |

Orden: `updatedAt` descendente. Respuesta `{ items: Mission[], total, page, limit }`.

**Pantalla** (prototipo, "Misiones mensuales"): columnas Nombre · Objetivo (texto armado: "3 consumos",
"$ 20.000 en consumos", más "los domingos de 09:00 a 13:00" si tiene condición) · Recompensa ("50 pts" o
"Sin recompensa") · Vigencia ("Noviembre 2026 – Diciembre 2026" o "Desde noviembre 2026") · Completadas este
mes · Estado (badge). **Como en Recompensas (S4-19), la fila no tiene botones: un clic abre el modal de
edición** 🟡. Botón "+ Crear misión mensual". Vacío: "No hay misiones para los filtros seleccionados."

#### 3.1.3 `POST /api/misiones` — crear (US-28)

Body: `name`, `description`, `objectiveType`, `target`, `daysOfWeek`, `timeFrom`, `timeTo`, `rewardPoints`,
`startMonth`, `endMonth`. El servidor pone `status`, fechas e `id` (campos de más → `400`).

| Campo | Mensaje |
|---|---|
| `name` vacío / > 80 | "El nombre es obligatorio." / "El nombre no puede superar los 80 caracteres." |
| `description` > 255 | "La descripción no puede superar los 255 caracteres." |
| `target` | "Ingresá un objetivo mayor a 0." · "El objetivo máximo es {máx}." · "Ingresá un número entero." (solo `CONSUMPTION_COUNT`) |
| `rewardPoints` | "Ingresá puntos enteros mayores a 0." · "El máximo es 100.000 puntos." |
| `daysOfWeek` | "Elegí al menos un día o marcá «Todos los días»." |
| `timeFrom`/`timeTo` | "Completá las dos horas o ninguna." · "La hora de inicio tiene que ser anterior a la de fin." |
| `startMonth` | "El mes de inicio no puede ser anterior al mes actual." |
| `endMonth` | "El mes de fin no puede ser anterior al de inicio." |

| HTTP | `code` | Cuándo | Mensaje |
|---|---|---|---|
| 409 | `MISSION_NAME_IN_USE` | Nombre repetido entre las no dadas de baja | "Ya existe una misión con ese nombre." |

Éxito: `201` con `Mission`. Audita `MISSION_CREATED`.

**Modal** (prototipo, secciones Misión · Vigencia · Período): se reemplazan "Objetivo" (texto) y "Período"
(Días/Semanas/Meses) por: Tipo de objetivo (Cantidad de consumos / Monto acumulado) · Objetivo · Días
(Todos / elegir) · Horario (opcional) · Recompensa (puntos, con la casilla "Sin recompensa") · Mes de inicio ·
Mes de fin (con la casilla "Se repite todos los meses") ([8.1](#81-diferencias-del-prototipo-que-este-contrato-corrige) #2). Botones Cancelar · Guardar misión. Toast "Misión guardada.".

#### 3.1.4 `PATCH /api/misiones/:id` — editar (US-29) 🟡 (PD-15)

Mismos campos y mensajes que crear, todos opcionales (al menos uno).

- `name` y `description` se pueden cambiar siempre.
- **Objetivo, condición y recompensa** (`objectiveType`, `target`, `daysOfWeek`, `timeFrom`, `timeTo`,
  `rewardPoints`): si la misión **ya está en curso este mes**, el cambio rige **desde el mes siguiente**; el
  progreso del mes actual sigue con los valores con los que se asignó (snapshot en `customer_missions`,
  [3.14](#314-modelo-de-datos-nuevo-base-5)), igual que el canje guarda los puntos de la recompensa (RF-014).
  La respuesta trae `{ mission, appliesFrom: "YYYY-MM" }` y la pantalla avisa: "Los cambios del objetivo y la
  recompensa se aplican desde {mes}. Este mes sigue igual para los clientes."
- `startMonth` solo se puede cambiar si todavía no empezó.
- Una dada de baja → `404` "No existe la misión.".

Éxito `200`. Audita `MISSION_UPDATED` con una fila por campo que cambió.

#### 3.1.5 `PATCH /api/misiones/:id/eliminar` — dar de baja (US-29)

- Pasa a `DELETED` (final). Libera el nombre.
- **Qué pasa con el mes en curso** 🟡 (PD-15): los clientes que la tienen **En progreso** la pierden
  (pasa a Vencida con el motivo "Misión dada de baja"); las **Completadas con recompensa** se **reclaman solas**
  en ese momento, para que nadie pierda una recompensa ganada (misma regla que S5-5).
- La pantalla avisa antes: '¿Eliminar la misión "{nombre}"? Los clientes que la tienen en progreso este mes la
  pierden. Los que ya la completaron reciben su recompensa.' Botones Cancelar · Eliminar.
- Éxito `200` con `{ expired, claimed }`. Audita `MISSION_DELETED` (Admin) y un `MISSION_REWARD_CLAIMED`
  (Sistema) por cada reclamo automático.

#### 3.1.6 `GET /api/misiones/:id`

`Mission`. Una dada de baja o inexistente: `404` "No existe la misión.".

---

### 3.2 Progreso y cumplimiento (US-30)

No tiene endpoint propio. Corre **dentro de la transacción de `POST /consumos`** (RF-033: "a partir de sus
consumos"), después de acreditar los puntos:

1. Para cada misión **en curso este mes** (`ACTIVE` y el mes dentro de su vigencia):
   - si el cliente **no la tiene asignada** este mes, se le asigna (`asignar()` → En progreso) 🟡 (PD-14:
     se asigna en el primer consumo del mes o al consultar, no a todos los clientes de antemano);
   - si el consumo cumple la condición (días y franja horaria del momento del consumo, en hora de
     Argentina), `registrarAvance()`: +1 o + el monto;
   - si el progreso llega al objetivo: `completar()` → **Completada**, con `completedAt`. Audita
     `MISSION_COMPLETED` (Sistema) y dispara la notificación `MISSION` (US-50) **después del commit**
     ([3.8](#38-notificaciones-us-47-a-us-50)).
2. Las Completadas, Reclamadas y Vencidas **no suman más** (el progreso queda en el objetivo).
3. Si la misión **no tiene recompensa**, queda Completada (final, S5-4).
4. Si algo falla, se deshace el consumo entero (misma transacción).

La respuesta de `POST /consumos` suma 🟡 `completedMissions: [{ id, name }]` para que "Consumo registrado"
muestre "¡{Nombre} completó la misión {misión}!" (como `levelUp`).

**Anular un consumo** 🟡 (PD-13): resta su avance solo en las misiones del mismo mes que sigan **En
progreso**. Si la misión ya está Completada o Reclamada, **no se revierte** (la recompensa no se quita).

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
| `canClaim` | boolean | No | `true` solo si está Completada y tiene recompensa |
| `endsAt` | string | No | Último día del mes, `YYYY-MM-DD` (para "Termina el {día}") |

#### 3.3.2 `GET /api/customers/me/misiones` — Mis misiones (US-33)

- Devuelve las misiones **del mes actual**: las asignadas y las en curso que todavía no tiene asignadas (se
  asignan en ese momento, PD-14), por estado (En progreso, Completada, Reclamada) y después por nombre.
- `?period=YYYY-MM` 🟡: meses anteriores, para ver el historial (Vencidas y Reclamadas). Máximo 12 meses atrás.
- Respuesta `CustomerMission[]` (sin paginado: son pocas).

**Pantalla** (Cliente → pestaña **Misiones**, que deja de decir "Próx."): título "Misiones del mes" y "Termina
el {día}". Por misión, una tarjeta: nombre, descripción, barra de progreso "2 / 3 consumos" o "$ 12.000 /
$ 20.000", recompensa ("50 pts" o "Sin recompensa"), estado y, si `canClaim`, el botón **"Reclamar
recompensa"**. Vacío: "No hay misiones este mes. ¡Volvé pronto!" 🟡. En **Inicio**, la tarjeta "Misiones"
muestra cuántas tiene en progreso y lleva a la pestaña.

#### 3.3.3 `PATCH /api/customers/me/misiones/:id/reclamar` (US-31)

1. Bloquea la asignación (`FOR UPDATE`). Si no es del cliente del token: `404` "No existe la misión.".
2. Si no está Completada: `409 MISSION_NOT_CLAIMABLE` "La misión todavía no está completada." (En progreso) o
   "La recompensa de esta misión ya se reclamó." (Reclamada) o "La misión venció." (Vencida).
3. Si no tiene recompensa: `409 MISSION_NOT_CLAIMABLE` "Esta misión no tiene recompensa.".
4. Acredita `rewardPoints` con `PointsService` (movimiento `MISSION_REWARD`, lote con la vigencia vigente; si
   hay deuda, la cancela primero, como cualquier acreditación). **No toca `lifetimePoints`.**
5. Pasa a **Reclamada** con `claimedAt` y `claimedBy = CUSTOMER`.
6. Audita `MISSION_REWARD_CLAIMED` a nombre del **Sistema** (el Cliente nunca es actor de la auditoría).
7. Responde `200 { customerMission, balanceAfter }`. Toast: "¡Sumaste {n} pts!".

Cliente dado de baja con token vivo: `401`, como el resto de `/customers/me`.

#### 3.3.4 `GET /api/customers/:id/misiones` (A, C)

Lo mismo que 3.3.2 para un cliente identificado (RF-017: "consultar… misiones vigentes con su progreso"). Lo
usan la ficha del Administrador (pestaña nueva "Misiones" 🟡) y el panel de Caja (línea "Misiones: {n} en
progreso" 🟡). Sin `canClaim` (el reclamo es solo del Cliente). Cliente inexistente: `404` "No existe el
cliente.". Dado de baja: `[]`.

---

### 3.4 Vencer y reiniciar misiones (US-32)

Proceso automático, sin endpoint (RF-036). Corre el **día 1 de cada mes a las 00:10, hora de Argentina** 🟡
(después del vencimiento de puntos de las 00:05), una vez al iniciar el servidor y a demanda con
`npm run missions:expire`. Variable `MISSIONS_EXPIRATION_CRON_ENABLED` (prendida por defecto, `false` en los
e2e), igual que los otros tres procesos.

Para cada asignación de un mes **ya terminado**, en su propia transacción (`FOR UPDATE SKIP LOCKED`):

| Estado | Pasa a | Qué hace |
|---|---|---|
| En progreso | **Vencida** (`vencer()`) | Nada más: el cliente pierde la misión (S5-5) |
| Completada con recompensa | **Reclamada** (reclamo automático) | Acredita los puntos como 3.3.3, con `claimedBy = SYSTEM`. Audita `MISSION_REWARD_CLAIMED` (Sistema) |
| Completada sin recompensa | (queda igual) | Es final (S5-4) |

Al terminar, **una** entrada `MISSIONS_EXPIRED` (Sistema) con "Período · Misiones vencidas · Recompensas
reclamadas automáticamente". Si no venció nada, no se audita 🟡.

**"Habilitar las del nuevo período"** (RF-036): las misiones activas que siguen vigentes el mes nuevo se
asignan solas en el primer consumo o consulta de cada cliente (PD-14). No hace falta copiar nada.

Es idempotente: correrlo dos veces no cambia nada.

---

### 3.5 Fotos: recompensa (US-34) y perfil del Cliente (FOTO-PERFIL)

#### 3.5.1 Reglas comunes de las imágenes

Punto de partida: S4 §3.3 (versión 1 de ese contrato).

| Regla | Valor |
|---|---|
| Formato | `multipart/form-data`, campo `photo` (`logo` para el logo) |
| Tipos | JPG, PNG o WebP, **validados por el contenido** del archivo, no por la extensión |
| Tamaño | Hasta 2 MB |
| Error | `400 INVALID_IMAGE` "Usá una imagen JPG, PNG o WebP de hasta 2 MB." |
| Dónde se guardan | 🟡 **En la base** (tabla `images`, `bytea`), porque el disco de Render es efímero (PD-1). Alternativa: un servicio de archivos externo (dependencia nueva) |
| URL | `photoUrl = "/api/{recurso}/{id}/foto?v={n}"`: `v` cambia con cada subida, para que el navegador no muestre la vieja |
| Respuesta del `GET` | La imagen con su `Content-Type` y `Cache-Control: public, max-age=31536000, immutable`; `404` si no hay foto |

#### 3.5.2 Foto de la recompensa (US-34)

- `PUT /api/recompensas/:id/foto` (A): sube o reemplaza. `200 { photoUrl }`. Audita `REWARD_UPDATED` con
  "Foto: Actualizada".
- `DELETE /api/recompensas/:id/foto` (A): `204`. Audita `REWARD_UPDATED` con "Foto: Quitada".
- `GET /api/recompensas/:id/foto`: **público** (`<img src>` no manda el token).
- Recompensa dada de baja o inexistente: `404` "No existe la recompensa." (salvo el `GET`, que sigue sirviendo
  la foto de una dada de baja para los canjes viejos 🟡).
- **Pantalla:** en el modal Crear / Editar, "Foto que verán los clientes" deja de decir "Próximamente": vista
  previa, "Elegir imagen" y "Quitar". Al crear, la foto se sube **después** del `POST` (con el id nuevo). Sin
  foto, todas las pantallas siguen con la imagen genérica.

#### 3.5.3 Foto de perfil del Cliente (FOTO-PERFIL, decisión S5-1)

- `PUT /api/customers/me/foto` (Cl): `200 { photoUrl }`.
- `DELETE /api/customers/me/foto` (Cl): `204`.
- **No se audita** (lo que el cliente cambia en su perfil no se audita, regla de auditoría del S3).
- `GET /customers/me` suma `photoUrl` (`null` sin foto).
- `GET /api/customers/:id/foto`: 🟡 (PD-12). Opciones: (a) **pública** con la URL versionada, como las
  recompensas (simple, pero cualquiera con el id y la versión la ve); (b) con token: el frontend la pide con
  Axios y la muestra como `blob:` (más privada). Propuesta: (b).
- **Quién la ve** 🟡 (PD-12): el Cliente en Mi perfil y en el encabezado; propuesta de mostrarla también al
  Cajero en la tarjeta de "Buscar cliente" y al Administrador en la ficha (ayuda a identificarlo en caja).
- **Pantalla:** en Mi perfil, "Cambiar foto" deja de estar deshabilitado; el avatar del encabezado muestra la
  foto. Sin foto: el avatar con las iniciales.

---

### 3.6 Logo y mensajes automáticos (US-14)

RF-012: "configurar el logo de la organización y los mensajes automáticos de notificación".

#### 3.6.1 `GET /api/configuracion/mensajes` (A)

```json
{
  "logoUrl": "/api/configuracion/logo?v=3",
  "messages": [
    { "type": "POINTS_EXPIRING", "active": true, "subject": "Tus puntos están por vencer", "body": "Tus puntos están por vencer. ¡Usalos antes de que caduquen!" },
    { "type": "BIRTHDAY", "active": true, "subject": "¡Feliz cumpleaños!", "body": "¡Feliz cumpleaños! Te regalamos puntos extra para celebrar con nosotros." },
    { "type": "PROMOTION", "active": true, "subject": "{promocion}", "body": "{descripcion}" },
    { "type": "MISSION", "active": false, "subject": "¡Completaste una misión!", "body": "Completaste la misión {mision}. Entrá a Vitto Club para reclamar tu recompensa." }
  ]
}
```

Los textos por defecto de `BIRTHDAY` y `POINTS_EXPIRING` salen del prototipo; los otros son 🟡.

**Variables** que se reemplazan al enviar 🟡: `{nombre}` (del cliente), `{puntos}` y `{fecha}` (vencimiento),
`{mision}`, `{promocion}`, `{descripcion}`. Una variable que no corresponde al tipo → `400` "La variable
{variable} no se puede usar en este mensaje.".

> El prototipo dice "Te regalamos puntos extra" en el cumpleaños, pero **ningún RF** da puntos por cumpleaños.
> Propuesta: el mensaje es solo un saludo; si se quieren regalar puntos, es una promoción o un RF nuevo (PD-18).

#### 3.6.2 `PUT /api/configuracion/mensajes` (A)

Body `{ messages: [{ type, active, subject, body }] }` (los cuatro). `subject` 1–120, `body` 1–1.000.
Éxito `200` (mismo cuerpo que el `GET`). Audita **una** entrada `LOGO_AND_MESSAGES_UPDATED` con una fila por
cambio ("Mensaje de cumpleaños: Modificado", "Vencimiento de puntos: Activado → Desactivado"). Si no cambió
nada: "Cambios: Se guardó sin modificar valores" (S3-24).

**Pantalla:** Configuración → **Notificaciones** deja de decir "Próx.": arriba el logo (vista previa, "Elegir
imagen"), abajo una fila por tipo con interruptor Activa y "Editar mensaje" (modal con Asunto, Mensaje, las
variables que se pueden usar y una vista previa).

#### 3.6.3 Logo

- `PUT /api/configuracion/logo` (A): mismas reglas que las fotos ([3.5.1](#351-reglas-comunes-de-las-imágenes)).
  `200 { logoUrl }`. Audita `LOGO_AND_MESSAGES_UPDATED` con "Logo: Actualizado".
- `GET /api/configuracion/logo`: **público** (lo usan el login y los correos). Sin logo cargado, devuelve el
  logo de marca del repo (`frontend/public/…`) 🟡 o `404` y la pantalla usa el suyo.

---

### 3.7 Promociones especiales (US-15)

RF-013: "definir promociones especiales aplicables al programa (por ejemplo, vinculadas a la pizza libre de los
viernes o a la merienda buffet de los domingos)". RF-052: "enviar notificaciones de promociones".

> 🟡 **PD-8 es la decisión más importante del sprint:** ¿una promoción **cambia los puntos** de un consumo
> (por ejemplo, "doble de puntos los viernes") o es **solo informativa** (se muestra y se avisa por correo)?
> El RF dice "aplicables al programa", que se puede leer de las dos formas. **Este contrato propone la opción
> informativa**, porque no toca el cálculo de puntos (RF-020) que ya está probado. Si se elige la otra, hay
> que agregar un multiplicador o puntos extra en la vista previa y el registro del consumo.

#### 3.7.1 Tipo `Promotion` 🟡

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | number | No | |
| `title` | string | No | 1–80 ("Pizza libre de los viernes") |
| `description` | string | No | 1–500 |
| `daysOfWeek` | number[] | Sí | 1–7. `null` = todos los días |
| `timeFrom`, `timeTo` | string | Sí | `HH:mm` |
| `validFrom` | string | No | `YYYY-MM-DD` |
| `validTo` | string | Sí | `YYYY-MM-DD`. `null` = sin fecha de fin |
| `status` | `"ACTIVE"` \| `"DELETED"` | No | |
| `isCurrent` | boolean | No | Calculado: activa y hoy dentro de la vigencia |
| `lastSentAt` | string | Sí | Último envío por correo |

#### 3.7.2 Endpoints (A)

- `GET /api/promociones?status=CURRENT|UPCOMING|FINISHED&page&limit` → `{ items, total, page, limit }`.
- `POST /api/promociones` → `201`. `PATCH /api/promociones/:id` → `200`. `PATCH …/eliminar` → `200`.
- Mensajes: "El título es obligatorio.", "El título no puede superar los 80 caracteres.", "La descripción es
  obligatoria.", "La descripción no puede superar los 500 caracteres.", "La fecha de fin no puede ser anterior a
  la de inicio.", más los de días y horas de las misiones.
- Cada alta, edición o baja audita `PROMOTIONS_UPDATED`: "Creó la promoción "…"", "Editó la promoción "…""
  (una fila por campo) o "Dio de baja la promoción "…"".

#### 3.7.3 `POST /api/promociones/:id/enviar` (A, US-49)

Manda el correo `PROMOTION` a **todos los clientes activos** con la promoción vigente o futura. Responde
`202 { queued: n }` y el envío sigue en segundo plano ([3.8.3](#383-cómo-se-envía)). Si el tipo `PROMOTION`
está desactivado: `409 NOTIFICATION_DISABLED` "Las notificaciones de promociones están desactivadas.". Si la
promoción ya terminó: `409 PROMOTION_FINISHED` "La promoción ya terminó.". La pantalla pide confirmación:
'¿Enviar "{título}" a {n} clientes por correo?'.

#### 3.7.4 `GET /api/customers/me/promociones` (Cl)

Las vigentes y las que empiezan en los próximos 7 días 🟡, por `validFrom`. En **Inicio** del Cliente, una
tarjeta "Promociones" con la próxima o la de hoy.

---

### 3.8 Notificaciones (US-47 a US-50)

#### 3.8.1 Cuándo se envía cada una

| Tipo | Disparador | Destinatarios | Historia |
|---|---|---|---|
| `POINTS_EXPIRING` | Proceso diario a las **09:00** 🟡 | Clientes activos con lotes que vencen en **7 días** 🟡 (PD-10). Un correo por cliente con el total y la fecha más próxima | US-47 |
| `BIRTHDAY` | Proceso diario a las **09:00** 🟡 | Clientes activos cuyo `dateOfBirth` es hoy (día y mes). El 29/02 se envía el 28/02 en años no bisiestos 🟡 | US-48 |
| `PROMOTION` | `POST /promociones/:id/enviar` | Clientes activos | US-49 |
| `MISSION` | Al completar una misión ([3.2](#32-progreso-y-cumplimiento-us-30)), después del commit | El cliente | US-50 |

- Si el tipo está desactivado en [3.6](#36-logo-y-mensajes-automáticos-us-14), no se envía y se registra
  `SKIPPED`.
- **No se repite:** el mismo tipo al mismo cliente por el mismo motivo (el mismo lote, el mismo cumpleaños, la
  misma misión del mes, la misma promoción y envío) se envía una sola vez (índice único,
  [3.14](#314-modelo-de-datos-nuevo-base-5)).
- Los procesos diarios: `npm run notifications:send`, variable `NOTIFICATIONS_CRON_ENABLED`.

#### 3.8.2 Registro (RF-050 a RF-053) ✅

Cada notificación se guarda con **tipo, canal, fecha y destinatario** (los cuatro datos que piden los RF), más
el cliente, el asunto, el estado ([2.6](#26-notificationstatus--)) y el motivo del error si falló. Solo
inserción, como los movimientos de puntos.

`GET /api/notificaciones` (A) 🟡: filtros `type`, `status`, `documentType` + `documentNumber`, `fromDate`,
`toDate`; paginado de a 20. Pantalla: Configuración → Notificaciones → pestaña "Historial" (Fecha y hora ·
Tipo · Cliente · Destinatario · Estado).

#### 3.8.3 Cómo se envía 🟡 (PD-11)

- Proveedor: **Resend** (Seguimiento §2.6 y Definición del Producto §10.1). Es una **dependencia nueva**
  (`resend`) y pide permiso (regla 5 de `CLAUDE.md`).
- Variables: `RESEND_API_KEY`, `NOTIFICATIONS_FROM` (remitente) y `NOTIFICATIONS_EMAIL_ENABLED`. **En
  desarrollo y en los e2e va en `false`**: no se manda nada, se registra `SKIPPED` y se deja en el log.
- El correo lleva el logo ([3.6.3](#363-logo)), el asunto y el mensaje con las variables reemplazadas, y un pie
  fijo: "Recibís este correo porque sos parte de Vitto Club." 🟡
- El envío **nunca** va dentro de la transacción de negocio: un correo que falla no deshace un consumo ni un
  reclamo.

---

### 3.9 Estadísticas y reporte PDF (US-51 a US-55)

Todas son consultas (no se auditan), solo del Administrador. Filtros comunes: `fromDate` y `toDate`
(`YYYY-MM-DD`, hora de Argentina, obligatorios, máximo 366 días 🟡). Rango invertido: `400` "fromDate no puede
ser posterior a toDate". Más de 366 días: `400` "El período no puede superar un año.".

#### 3.9.1 `GET /api/estadisticas/clientes` (US-51, RF-054) 🟡 (PD-9)

```json
{ "active": 184, "new": 23, "frequent": 41, "frequentThreshold": 3, "byMonth": [{ "month": "2026-10", "new": 12, "withConsumptions": 97 }] }
```

- **Activos:** clientes no dados de baja al final del período.
- **Nuevos:** dados de alta en el período.
- **Frecuentes:** con **3 o más** consumos `REGISTERED` en el período (`frequentThreshold`, PD-9).

#### 3.9.2 `GET /api/estadisticas/consumos` (US-52, RF-055)

`?groupBy=day|week|month` para "por período". Respuesta:

```json
{
  "total": { "count": 612, "amount": 9845000 },
  "byPeriod": [{ "period": "2026-10-01", "count": 21, "amount": 340000 }],
  "byWeekday": [{ "weekday": 1, "count": 80, "amount": 1200000 }],
  "byTimeSlot": [{ "from": "08:00", "to": "12:00", "count": 150, "amount": 2100000 }]
}
```

Solo consumos `REGISTERED`. **Franjas horarias** 🟡 (PD-9): 08–12, 12–16, 16–20, 20–24 y 00–08.

#### 3.9.3 `GET /api/estadisticas/puntos` (US-53, RF-056)

`{ awarded, bonus, missionRewards, redeemed, expired, adjustedAdd, adjustedSubtract, voided, byMonth: [...] }`,
sumando los movimientos del período por tipo (valores absolutos).

#### 3.9.4 `GET /api/estadisticas/programa` (US-54, RF-057)

```json
{
  "levels": [{ "level": "BRONZE", "customers": 120 }, { "level": "SILVER", "customers": 50 }, { "level": "GOLD", "customers": 14 }],
  "missions": [{ "id": 3, "name": "Vení 3 veces", "assigned": 90, "completed": 30, "claimed": 28, "expired": 60 }],
  "topRewards": [{ "id": 1, "name": "Merienda gratis", "used": 58 }]
}
```

Niveles con el nivel **actual** de los clientes activos. Recompensas más canjeadas: por canjes `USED` en el
período, las 10 primeras.

#### 3.9.5 `GET /api/estadisticas/reporte.pdf` (US-55, RF-058) 🟡 (PD-11)

Mismos filtros. Responde `application/pdf` con `Content-Disposition: attachment;
filename="vitto-club-reporte-{fromDate}-{toDate}.pdf"`. Contenido: logo, título "Reporte Vitto Club", período,
fecha de generación y las cuatro secciones en tablas. Se arma con **PDFKit** (Seguimiento §2.6): dependencia
nueva, pide permiso. El frontend lo baja con `shared/api/download.ts`.

#### 3.9.6 Pantalla

Administración → **Estadísticas y reportes** deja de decir "Próx.". Arriba: período (calendario de un día o
rango, como Canjes) y "Exportar reporte PDF". Cuatro bloques: Clientes · Consumos · Puntos · Programa, con
tarjetas de totales y tablas. 🟡 **Gráficos** (PD-19): no hay librería de gráficos instalada; propuesta de
mostrar tablas y barras hechas con CSS, sin dependencia nueva.

---

### 3.10 Beneficios de los niveles (NIV-BEN)

RF-029: "consultar los niveles de fidelización (Bronce, Plata, Oro), su puntaje mínimo y sus beneficios
asociados". El contrato S3 §3.7 los había dejado "pendientes de definir"; pasan a este sprint (S5-2).

- 🟡 Un beneficio es un **texto** de hasta 255 caracteres por nivel (el prototipo lo muestra como texto:
  "5% de puntos extra por consumo"). **No cambia el cálculo de puntos**: es informativo (PD-20).
- `GET /loyalty/configuration/levels` suma `bronzeBenefit`, `silverBenefit` y `goldBenefit` (`string | null`).
- `PUT /loyalty/configuration/levels` los acepta (opcionales; vacío = `null`). Mensaje: "El beneficio no puede
  superar los 255 caracteres.". Se guardan en la **versión** de la configuración (RF-014), como los umbrales.
- `LEVELS_UPDATED` suma una fila por beneficio que cambió: "Beneficio Plata: {antes} → {después}" (vacío "—").
- `level` de `GET /customers/me/puntos` y `/customers/:id/puntos` suma `benefit` y `nextBenefit`.
- **Pantalla:** Configuración → Puntos → Niveles suma un campo "Beneficio" por nivel (el prototipo lo llama
  "Observaciones": se usa "Beneficio", [8.1](#81-diferencias-del-prototipo-que-este-contrato-corrige) #4).
  En el Inicio del Cliente, debajo del nivel: "Tu beneficio: {texto}" y "Con {nivel siguiente}: {texto}".

---

### 3.11 Cuentas de los clientes (CTA-CLI)

RF-08: "visualizar la cuenta de acceso de un usuario, **cualquiera sea su rol**, incluyendo su nombre y
apellido, el rol asignado y el estado de su credencial". Hoy `/usuarios` solo muestra empleados (S5-3).

#### 3.11.1 `GET /api/customers/:id/cuenta` (A)

```json
{ "accountId": 31, "email": "lucia@example.com", "role": "CUSTOMER", "active": true, "mustChangePassword": false, "firstName": "Lucía", "lastName": "Fernández", "createdAt": "2026-10-20T14:00:00.000Z" }
```

- Cliente sin cuenta (cargado antes de US-17-AJ y no migrado): `404` "El cliente no tiene cuenta.".
- Cliente inexistente: `404` "No existe el cliente.".
- 🟡 **Solo consulta** (RF-08). El Administrador no cambia la contraseña de un cliente ni la reactiva (RF-06 y
  RF-07 son de empleados). Si hace falta resetearla, es un pendiente nuevo (PD-21).

**Pantalla:** en Clientes → "Ver más", una sección **"Cuenta de acceso"**: Email · Rol "Cliente" · Estado
("Activa" / "Dada de baja") · "Contraseña inicial sin cambiar" (solo si `mustChangePassword`).

---

### 3.12 Cambios en pantallas y endpoints existentes

| Dónde | Cambio |
|---|---|
| Menú de Administración | "Misiones" y "Estadísticas y reportes" dejan de estar deshabilitados |
| Configuración | "Notificaciones" deja de estar deshabilitada |
| Vista del Cliente | Pestaña "Misiones" habilitada; tarjetas de Misiones y Promociones en Inicio; foto en el encabezado |
| Consumo registrado | "¡{Nombre} completó la misión {misión}!" si `completedMissions` no está vacío |
| Ficha del cliente (Administrador) | Pestaña "Misiones" 🟡 y foto 🟡 |
| Buscar cliente (Caja) | Foto en la tarjeta 🟡 y "Misiones: {n} en progreso" 🟡 |
| Recompensas | Foto real en el listado, el catálogo, el mostrador y los canjes |
| Movimientos (todas las vistas) | Tipo `MISSION_REWARD` |
| `GET /movimientos-de-puntos` | 🟡 Se elimina (PD-3) |

---

### 3.13 Auditoría del Sprint 5

#### 3.13.1 Qué se audita y qué no

| Acción | Actor | Se audita |
|---|---|---|
| Crear, editar y dar de baja misiones | Administrador | Sí (`MISSION_CREATED`, `MISSION_UPDATED`, `MISSION_DELETED`) |
| Completar una misión | Sistema | Sí (`MISSION_COMPLETED`) |
| Reclamar la recompensa (Cliente o automático) | **Sistema** | Sí (`MISSION_REWARD_CLAIMED`). El Cliente nunca es actor |
| Vencer las misiones del mes | Sistema | Sí (`MISSIONS_EXPIRED`, una por corrida) |
| Logo y mensajes | Administrador | Sí (`LOGO_AND_MESSAGES_UPDATED`) |
| Promociones (alta, edición, baja) | Administrador | Sí (`PROMOTIONS_UPDATED`) |
| Foto de la recompensa | Administrador | Sí (`REWARD_UPDATED`, "Foto: Actualizada / Quitada") |
| Foto de perfil del Cliente | — | **No** (perfil del cliente) |
| Envío de notificaciones | — | 🟡 No: quedan en el historial de notificaciones (PD-17) |
| Estadísticas, PDF, cuenta del cliente | — | No (consultas) |

#### 3.13.2 `description` y `details`

| Acción | `description` | Cliente afectado | Código | `details` |
|---|---|---|---|---|
| `MISSION_CREATED` | Creó la misión "{nombre}" | — | — | Objetivo · Condición · Recompensa · Vigencia |
| `MISSION_UPDATED` | Editó la misión "{nombre}" | — | — | Una fila por campo que cambió · "Rige desde: {mes}" si aplica |
| `MISSION_DELETED` | Dio de baja la misión "{nombre}" | — | — | Vencidas: {n} · Reclamadas automáticamente: {n} (solo si n > 0) |
| `MISSION_COMPLETED` | Completó la misión "{nombre}" de {cliente} | Sí | — | Misión · Objetivo · Período |
| `MISSION_REWARD_CLAIMED` | Reclamó la recompensa de la misión "{nombre}" de {cliente} | Sí | — | Misión · Puntos otorgados · Saldo resultante · Reclamada por: Cliente / Automático |
| `MISSIONS_EXPIRED` | Venció las misiones del mes | — | — | Período · Misiones vencidas · Recompensas reclamadas automáticamente |
| `LOGO_AND_MESSAGES_UPDATED` | Modificó el logo y los mensajes automáticos | — | — | Una fila por cambio |
| `PROMOTIONS_UPDATED` | Creó / Editó / Dio de baja la promoción "{título}" | — | — | Campos (alta) o una fila por cambio |

> **Cambio respecto del contrato S3 §3.9.3:** allí `MISSION_COMPLETED` tenía "Misión · Puntos otorgados".
> Como los puntos se dan **al reclamar** (Definición del Producto §9), "Puntos otorgados" pasa a
> `MISSION_REWARD_CLAIMED` ([7](#7-cambios-respecto-del-sprint-4) #6).

---

### 3.14 Modelo de datos nuevo (BASE-5)

Lo construye **BASE-5** en una sola migración (`sprint5_base5_missions_notifications`), como BASE-4. Los
`CHECK` e índices parciales se escriben a mano y un test verifica que existan. Todo es 🟡 hasta el Planning,
salvo lo marcado ✅.

#### `Mission` → tabla `missions`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | serial | No | |
| `name` | varchar(80) | No | Único parcial `lower(trim(name)) WHERE status <> 'DELETED'` |
| `description` | varchar(255) | Sí | |
| `objective_type` | `MissionObjectiveType` | No | |
| `target` | decimal(12,2) | No | `CHECK target > 0`; entero si `CONSUMPTION_COUNT` |
| `days_of_week` | smallint[] | Sí | `CHECK` valores 1–7 |
| `time_from`, `time_to` | time | Sí | `CHECK` los dos o ninguno, `time_from < time_to` |
| `reward_points` | int | Sí | `CHECK NULL o 1–100000` |
| `start_month`, `end_month` | date (día 1) | `end_month` sí | `CHECK end_month >= start_month` |
| `status` | `MissionStatus` | No | Por defecto `ACTIVE` |
| `created_at`, `updated_at`, `deleted_at` | timestamp | `deleted_at` sí | `CHECK (status = 'DELETED') = (deleted_at IS NOT NULL)` |

#### `CustomerMission` → tabla `customer_missions` ✅ (la pide la máquina "por cliente")

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
| `claimed_by` | `"CUSTOMER"` \| `"SYSTEM"` | Sí | Solo en `CLAIMED` |
| `expiration_reason` | varchar(100) | Sí | "Fin de mes" o "Misión dada de baja" |

Índices: `(status, period)` para el proceso de fin de mes; `(customer_id, period)`.

#### `PointsMovement` — cambios ✅

- Nuevo valor `MISSION_REWARD`.
- Columna `customer_mission_id` (FK, nullable) con `CHECK (type = 'MISSION_REWARD') = (customer_mission_id IS NOT NULL)`.

#### `LoyaltyProgramConfiguration` — columnas nuevas

`bronze_benefit`, `silver_benefit`, `gold_benefit`: varchar(255), nullable.

#### `NotificationTemplate` → tabla `notification_templates`

Una fila por `NotificationType`: `type` (PK), `active`, `subject` (varchar 120), `body` (varchar 1000),
`updated_at`. La migración carga los textos por defecto de [3.6.1](#361-get-apiconfiguracionmensajes-a).

#### `Notification` → tabla `notifications` ✅ (RF-050 a RF-053)

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | serial | No | |
| `type` | `NotificationType` | No | Tipo (RF) |
| `channel` | `NotificationChannel` | No | Canal (RF) |
| `recipient` | varchar(150) | No | Destinatario (RF): el email en ese momento |
| `customer_id` | int → `customers` | No | |
| `subject` | varchar(120) | No | Ya con las variables reemplazadas |
| `status` | `NotificationStatus` | No | |
| `error` | varchar(500) | Sí | Solo en `FAILED` |
| `dedupe_key` | varchar(100) | No | `UNIQUE (type, customer_id, dedupe_key)`: "lot:{id}", "birthday:{año}", "mission:{customer_mission_id}", "promotion:{id}:{envío}" |
| `created_at` | timestamp | No | Fecha (RF) |

Solo inserción (trigger, como `audit_logs`).

#### `Promotion` → tabla `promotions`

Columnas de [3.7.1](#371-tipo-promotion-), más `last_sent_at`, `created_at`, `updated_at`, `deleted_at`.

#### `Image` → tabla `images` (si PD-1 elige la base)

`id`, `owner_type` (`ImageOwnerType`), `owner_id` (null para el logo), `mime_type`, `size_bytes`
(`CHECK <= 2097152`), `data` (`bytea`), `version`, `created_at`. `UNIQUE (owner_type, owner_id)`. Las tablas
`rewards` y `customers` suman `photo_version` (int, nullable) para armar `photoUrl` sin leer la imagen.

#### Relaciones

```
Mission        1 ── 0..N CustomerMission
Customer       1 ── 0..N CustomerMission
CustomerMission 1 ── 0..1 PointsMovement (MISSION_REWARD, solo si se reclamó)
Customer       1 ── 0..N Notification
Promotion      (sin FK a notifications: se referencia en dedupe_key)
Reward / Customer 1 ── 0..1 Image
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
| **Públicos** | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/health`, `GET /recompensas/:id/foto`, `GET /configuracion/logo` (y `GET /customers/:id/foto` si PD-12 elige la opción a) |
| **Autorización** | `@Roles(...)` por endpoint. **Un endpoint sin `@Roles` ni `@Public` queda cerrado para todos.** Las reglas por rol se validan en el backend. Los `403` no se auditan |
| **Campos desconocidos** | `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`: cualquier campo o query param de más → `400 property X should not exist` |
| **Fechas de entrada** | Filtros por día en `YYYY-MM-DD` y meses en `YYYY-MM`, en hora de Argentina (UTC−03:00) |
| **Fechas de salida** | ISO 8601 en UTC. Fechas sin hora en `YYYY-MM-DD`. Horas sin fecha en `HH:mm`. La pantalla muestra `dd/mm/aaaa hh:mm` en hora de Argentina |
| **Montos** | Número JSON con hasta 2 decimales. Sin código de moneda |
| **Puntos** | Siempre enteros. Con signo en los movimientos |
| **Paginación** | `page` (≥ 1, por defecto 1) y `limit` (1–100; por defecto 20, o el que diga cada endpoint). Respuesta `{ items, total, page, limit }` |
| **Orden de las rutas** | `/customers/me/…` antes que `/customers/:id/…`; las palabras fijas (`/recompensas/disponibles`) antes que `/:id` |
| **Transacciones** | Todo lo que escribe va en la transacción ambiente (`PrismaTransactionRunner`), con la auditoría y los eventos de dominio. Los correos y los PDF, **fuera** |
| **Bloqueos** | `customer_points` primero en todo lo que mueve puntos. Al usar un canje: recompensa → canje → saldo. Al reclamar una misión: asignación → saldo |
| **Procesos automáticos** | Cinco, con `@nestjs/schedule`, cada uno con su variable (prendida por defecto, `false` en los e2e) y su comando a demanda: puntos (00:05), recompensas vencidas (00:05 y al iniciar), canjes vencidos (cada 5 min y al iniciar), **misiones (día 1, 00:10)** y **notificaciones (09:00)** |
| **CORS** | Origen por variable de entorno (`CORS_ORIGIN`, por defecto `http://localhost:5173`), con credenciales (arrastre B7) |
| **Correo** | Resend, apagado con `NOTIFICATIONS_EMAIL_ENABLED=false` en desarrollo y e2e |

### Matriz de permisos completa (Sprints 1 a 5)

| Endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`, `/health` | público | público | público |
| `GET /recompensas/:id/foto`, `GET /configuracion/logo` | público | público | público |
| `/mi-cuenta/password` | Sí | Sí | Sí |
| `/empleados/*` | Sí | No | No |
| `/usuarios/*` (cuentas de empleados, incluye `…/reactivate` y `empleado/:employeeId`) | Sí | No | No |
| `/loyalty/configuration/*` (equivalencia, vigencia, bonificación, niveles y beneficios, `current`) | Sí | No | No |
| `GET /customers`, `GET /customers/by-document`, `GET /customers/:id`, `GET /customers/:id/status-history`, `POST /customers` | Sí | Sí | No |
| `PATCH /customers/:id`, `PATCH /customers/:id/deactivate` | Sí | No | No |
| `GET /customers/:id/cuenta` | Sí | No | No |
| `GET /customers/:id/puntos`, `GET /customers/:id/misiones` | Sí | Sí | No |
| `GET /customers/:id/consumos`, `GET /customers/:id/movimientos` | Sí | Sí (últimas 24 h) | No |
| `POST /customers/:id/ajustes-de-puntos` | Sí | No | No |
| `GET /customers/:id/foto` | 🟡 Sí | 🟡 Sí | No (la suya, por `me`) |
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
| Archivo (`GET …/foto`, `GET /configuracion/logo`, `GET /estadisticas/reporte.pdf`) | `200` | El archivo con su `Content-Type` |

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
| 403 | `FORBIDDEN_FIELD` | Cambiar el documento (desde D-03 ya no viaja en el DTO; queda sin uso, ver deuda técnica) | S3 |
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

**`404` sin `code`** (nuevos): "No existe la misión.", "No existe la promoción.", "El cliente no tiene
cuenta.", y `404` sin cuerpo en `GET …/foto` sin foto.

---

## 6. Códigos HTTP

| Código | Significado en el sistema |
|---|---|
| `200 OK` | Consulta o modificación correcta, con cuerpo; archivos |
| `201 Created` | Alta: empleado, usuario, cliente, consumo, ajuste, recompensa, canje, misión, promoción |
| `202 Accepted` | Envío de una promoción en segundo plano |
| `204 No Content` | Acción correcta sin cuerpo |
| `400 Bad Request` | Formato o validación; campo desconocido; fechas inválidas o invertidas; contraseña actual incorrecta; imagen inválida; `q` junto con `name` o `documentNumber` |
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
| 3 | Configuración → Notificaciones | "Próx." | Logo, mensajes, historial (US-14, US-47 a US-50) |
| 4 | `photoUrl` de `Reward` | Siempre `null` | La foto, si tiene |
| 5 | `PointsMovementType` | Sin misiones | `MISSION_REWARD` |
| 6 | Auditoría de misiones (S3 §3.9.3) | `MISSION_COMPLETED` con "Puntos otorgados" | Los puntos van en `MISSION_REWARD_CLAIMED` |
| 7 | Niveles | Sin beneficios | Un texto por nivel (NIV-BEN) |
| 8 | Cuentas | Solo de empleados | El Administrador ve también la del cliente (CTA-CLI) |
| 9 | Procesos automáticos | Tres | Cinco (+ misiones y notificaciones) |
| 10 | `POST /consumos` | Puntos y nivel | + avance de misiones y `completedMissions` |
| 11 | `GET /movimientos-de-puntos` | Sin pantalla | 🟡 Se elimina (PD-3) |
| 12 | CORS | Fijo | Por variable de entorno |

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
| 6 | Notificaciones: solo vencimiento, cumpleaños y misiones | + promociones (RF-052) y el historial de envíos (RF-050 a RF-053) |
| 7 | No hay pantalla de promociones ni de logo | Se agregan (RF-012, RF-013) |
| 8 | "Te regalamos puntos extra" en el cumpleaños | Ningún RF da puntos por cumpleaños (PD-18) |
| 9 | No hay foto de perfil, ni beneficios en el Inicio, ni cuenta del cliente en "Ver más" | Se agregan (S5-1, S5-2, S5-3) |

### 8.2 Reglas de negocio que el backend tiene que garantizar (no solo la pantalla)

- **Misiones:** el avance sale del consumo en la misma transacción; nunca pasa el objetivo; una Completada,
  Reclamada o Vencida no suma más; el snapshot de la asignación no cambia si se edita la misión.
- **Reclamo:** solo de una Completada con recompensa, del cliente del token, una sola vez (bloqueo). Los
  puntos no suman al nivel.
- **Fin de mes:** las En progreso vencen; las Completadas con recompensa se reclaman solas. **Nunca se pierde
  una recompensa ganada.** Idempotente.
- **Notificaciones:** se registran siempre (enviadas, fallidas u omitidas), una sola vez por motivo, fuera de
  la transacción de negocio. No se mandan correos desde desarrollo ni desde los e2e.
- **Imágenes:** se validan por contenido y tamaño en el backend, no solo en la pantalla.
- **Auditoría y movimientos inalterables**, como en los sprints anteriores; el Cliente nunca es actor.

### 8.3 Decisiones del Sprint 5

| # | Tema | Decisión | Quién / cuándo |
|---|---|---|---|
| S5-1 | Foto de perfil del Cliente | **Entra en el Sprint 5** (no estaba en ningún sprint anterior). Hay que sumarla a RF-065 / US-59 en el Plan, el Seguimiento y la Definición del Producto | Deni, 09/11 |
| S5-2 | Beneficios de los niveles (RF-029) | **Entran en el Sprint 5**: no se hicieron en US-27 | Deni, 09/11 |
| S5-3 | Cuentas de los clientes (RF-08) | El Administrador **tiene que poder verlas**. Entra en el Sprint 5 | Deni, 09/11 |
| S5-4 | Misión sin recompensa | **Completada es estado final** | Deni, 09/11 |
| S5-5 | Misión completada no reclamada a fin de mes | **Se reclama sola** (Sistema) al vencer el mes: si la terminó, no pierde la recompensa. Si la empezó y no la terminó, la pierde (Vencida) | Deni, 09/11 |
| S5-6 | Lo que no quedó hecho de los sprints anteriores | **Pasa al Sprint 5** | Deni, 09/11 |
| S5-7 | Generador de contraseñas de empleados | 8 caracteres (D-05, ya corregido en el contrato S3 §3.11) | PO, 25/10; contrato, 09/11 |
| S5-8 | Estados de la misión del cliente | Los del **cuadro** de la Definición del Producto §9 (las imágenes están desactualizadas) | Deni, 09/11 |
| S5-9 | Puntos de una misión y nivel | No suman a los puntos acumulados (RF-028 y Glosario: el nivel sale de los consumos) | Plan de Proyecto |
| S5-10 | Canal de las notificaciones | Correo electrónico, con Resend | Seguimiento §2.6, Definición del Producto §10.1 |
| S5-11 | Reporte PDF | PDFKit | Seguimiento §2.6 |

### 8.4 Implementación sugerida

- **Módulos nuevos:**
  - `missions`: misiones, asignación, avance, reclamo y proceso de fin de mes.
  - `notifications`: plantillas, logo, envío, registro y procesos diarios. Puerto `EmailSender` con dos
    adaptadores: Resend y uno que solo deja en el log (desarrollo y e2e).
  - `promotions`: promociones (puede vivir dentro de `notifications` si el equipo prefiere).
  - `statistics`: solo lectura; lee las tablas por Prisma sin importar los módulos de negocio, como `points`
    lee `customers`.
  - `images`: guardar y servir imágenes (lo usan `rewards`, `customers` y `notifications`).
- **Dependencias entre módulos** (sin ciclos):
  - `consumptions ──> missions` para el avance, en la misma transacción. `missions` **no** importa
    `consumptions`: recibe `{ customerId, amount, createdAt }`.
  - `missions ──> points` para acreditar (`PointsService.acreditarRecompensaDeMision`); `points` no importa
    `missions`.
  - `missions` publica `mission.completed` y `notifications` escucha **después del commit** (no dentro de la
    transacción: el correo no puede deshacer el consumo).
  - `notifications ──> customers` (datos y email) y `notifications ──> points` (lotes por vencer), por lectura.
  - `statistics` no importa ningún módulo de negocio.
- **Hora:** `shared/time/argentina-date.ts` para meses, días de la semana y franjas.
- **Tests e2e mínimos:**
  - Crear, editar (con y sin progreso en el mes) y dar de baja misiones; nombre repetido; permisos.
  - Consumo que suma avance, que completa (con y sin recompensa) y que no cumple la condición (día u hora).
  - Reclamar: Completada con recompensa (`200`, lote `MISSION_REWARD`, `lifetimePoints` igual), sin
    recompensa, En progreso, Reclamada, ajena (`404`), dos reclamos en paralelo (uno `200`, otro `409`).
  - Fin de mes: En progreso → Vencida; Completada con recompensa → Reclamada (Sistema); sin recompensa queda;
    idempotente; auditoría.
  - Fotos: JPG, PNG, WebP, un PDF renombrado a `.jpg` (`400`), 2 MB + 1 byte (`400`), reemplazar, quitar,
    `GET` público.
  - Notificaciones: no se repiten; tipo desactivado (`SKIPPED`); envío apagado; un fallo no deshace el consumo.
  - Estadísticas: cada métrica con datos conocidos; rango invertido; más de un año.
  - Beneficios: guardar, versión nueva, auditoría, `benefit` en el saldo.
  - Cuenta del cliente: con cuenta, sin cuenta, permisos.

---

## 9. Resumen por historia

| US | Título | RF | Endpoints | Pantallas |
|---|---|---|---|---|
| US-14 | Configurar imagen y mensajes automáticos | RF-012 | `GET`/`PUT /configuracion/mensajes`, `PUT`/`GET /configuracion/logo` | Configuración → Notificaciones |
| US-15 | Configurar promociones especiales | RF-013 | `/promociones`, `GET /customers/me/promociones` | Configuración → Promociones 🟡; Inicio del Cliente |
| US-28 | Crear misión mensual | RF-031 | `POST /misiones`, `GET /misiones` | Misiones → "+ Crear misión mensual" |
| US-29 | Editar / dar de baja misión | RF-032 | `GET`/`PATCH /misiones/:id`, `PATCH …/eliminar` | Misiones → clic en la fila |
| US-30 | Progreso y cumplimiento automático de misiones | RF-033 / RF-034 | Dentro de `POST /consumos` | "Consumo registrado"; Mis misiones |
| US-31 | Reclamar recompensa de misión | RF-035 | `PATCH /customers/me/misiones/:id/reclamar` | Cliente → Misiones |
| US-32 | Vencer y reiniciar misiones | RF-036 | Proceso de fin de mes | Auditoría |
| US-33 | Consultar misiones | RF-037 (y RF-017) | `GET /customers/me/misiones`, `GET /customers/:id/misiones` | Cliente → Misiones; Inicio; ficha; Caja |
| US-34 | Imagen de la recompensa | RF-038 | `PUT`/`DELETE`/`GET /recompensas/:id/foto` | Modal de recompensa; catálogo; mostrador |
| US-47 | Notificar vencimiento de puntos | RF-050 | Proceso diario | Historial de notificaciones |
| US-48 | Notificar cumpleaños | RF-051 | Proceso diario | Historial de notificaciones |
| US-49 | Notificar promociones | RF-052 | `POST /promociones/:id/enviar` | Promociones → Enviar |
| US-50 | Notificar avance de misiones | RF-053 | Al completar | Historial de notificaciones |
| US-51 | Estadísticas de clientes | RF-054 | `GET /estadisticas/clientes` | Estadísticas |
| US-52 | Estadísticas de consumos por período | RF-055 | `GET /estadisticas/consumos` | Estadísticas |
| US-53 | Estadísticas de puntos | RF-056 | `GET /estadisticas/puntos` | Estadísticas |
| US-54 | Estadísticas de niveles, misiones y recompensas | RF-057 | `GET /estadisticas/programa` | Estadísticas |
| US-55 | Exportar reportes generados | RF-058 | `GET /estadisticas/reporte.pdf` | Estadísticas → Exportar reporte PDF |
| — | FOTO-PERFIL: foto de perfil del Cliente (S5-1) | RF-065 (a ampliar) | `PUT`/`DELETE /customers/me/foto`, `GET /customers/:id/foto` | Mi perfil; encabezado |
| — | NIV-BEN: beneficios de los niveles (S5-2) | RF-029 | `/loyalty/configuration/levels`, `…/puntos` | Configuración → Niveles; Inicio |
| — | CTA-CLI: cuentas de los clientes (S5-3) | RF-08 | `GET /customers/:id/cuenta` | Clientes → Ver más |
| — | ARRASTRE-S4 | — | Ver `CIERRE_SPRINT_4.md` §4 | — |

---

## 10. Pendientes

**Se deciden en el Planning del Sprint 5.** Cada uno bloquea solo la parte que se indica.

| # | Pendiente | Bloquea | Propuesta |
|---|---|---|---|
| PD-1 | Dónde se guardan las imágenes (recompensas, perfil, logo) | US-34, FOTO-PERFIL, US-14 | En la base (`images`, `bytea`): el disco de Render es efímero y no suma servicios. Alternativa: almacenamiento externo (dependencia y cuenta nuevas) |
| PD-3 | `GET /movimientos-de-puntos` sin pantalla | Nada | Eliminarlo: el frontend ya borró su página y US-53 lo reemplaza |
| PD-6 | ¿Se avisa al Cliente cuando se rechaza su canje? | Nada | No: ningún RF lo pide; lo ve en Mis canjes |
| PD-7 | Qué mide una misión | US-28 a US-30 | `CONSUMPTION_COUNT` y `CONSUMPTION_AMOUNT`, con días y franja horaria opcionales ([2.3](#23-missionobjectivetype--qué-mide-la-misión--pd-7)) |
| PD-8 | ¿Una promoción cambia los puntos o es informativa? | US-15, US-49 | Informativa ([3.7](#37-promociones-especiales-us-15)) |
| PD-9 | Definiciones de las estadísticas: "frecuente", franjas horarias, "activo" | US-51, US-52 | Frecuente = 3 o más consumos en el período; franjas de 4 horas; activo = no dado de baja |
| PD-10 | Con cuánta anticipación se avisa el vencimiento de puntos | US-47 | 7 días antes, una sola vez por lote |
| PD-11 | Dependencias nuevas: `resend` y `pdfkit` | US-47 a US-50, US-55 | Autorizarlas (ya figuran en el Seguimiento §2.6). Las fotos usan `multer`, que ya viene con `@nestjs/platform-express` |
| PD-12 | Foto de perfil: ¿pública o con token? ¿La ven el Cajero y el Administrador? | FOTO-PERFIL | Con token (`blob:`); la ven el Cliente, el Cajero en caja y el Administrador en la ficha |
| PD-13 | ¿Anular un consumo resta avance de misión? | US-30 | Sí, solo en las misiones En progreso del mismo mes |
| PD-14 | Cómo se asignan las misiones y si se repiten | US-30, US-32, US-33 | Se asignan en el primer consumo o consulta del mes; una misión sin mes de fin se repite todos los meses |
| PD-15 | Editar o eliminar una misión con progreso en el mes | US-29 | Editar: el objetivo y la recompensa rigen desde el mes siguiente. Eliminar: En progreso → Vencida, Completadas → Reclamadas (Sistema) |
| PD-16 | ¿Se reintenta un correo que falló? | US-47 a US-50 | No: queda `FAILED` en el historial |
| PD-17 | ¿Se audita el envío de notificaciones? | US-47 a US-50 | No: ya queda en el historial de notificaciones |
| PD-18 | "Te regalamos puntos extra" en el cumpleaños del prototipo | US-48 | Solo saludo. Regalar puntos sería un RF nuevo |
| PD-19 | Gráficos en Estadísticas | US-51 a US-54 | Tablas y barras con CSS, sin librería nueva |
| PD-20 | ¿El beneficio de un nivel cambia los puntos? | NIV-BEN | No: es un texto informativo |
| PD-21 | ¿El Administrador puede resetear la contraseña de un cliente? | CTA-CLI | No en este sprint: RF-08 pide solo visualizar |
| PD-22 | Documentos del producto: sumar la foto a RF-065 / US-59; marcar US-08 y US-27 como completas en parte; Completada como estado final y el reclamo automático en la máquina de Misión; los estados finales de la máquina Recompensa | Nada (solo docs) | Actualizar Plan de Proyecto, Seguimiento y Definición del Producto |
| PD-23 | Tests del frontend (Vitest) y CI (GitHub Actions): el Seguimiento los declara, la Definición del Producto ya no lista Vitest | ARRASTRE-S4 | Decidir si entran (dependencias nuevas) o se sacan del Seguimiento |
