# Contrato de API — Sprint 4 · Vitto Club

> **Alcance:** todo lo que el backend tiene que exponer para el Sprint 4 (**Recompensas y Canjes**), armado a
> partir de:
> - el prototipo *Vitto Club Prototipo v2* con las pantallas del Sprint 4 (`docs/prototipo/v2/`, 25/10/2026);
> - `PROMPT_PROTOTIPO_SPRINT_4.md` (lo que la PO aprobó para cada pantalla);
> - las decisiones de la PO del 25/10/2026 (`DECISIONES_PO_2026-10-25.md`);
> - la sección 9 de la *Definición del Producto* (máquinas de estado de Canje y Recompensa);
> - el contrato del Sprint 3, que ya dejó definidas las acciones de auditoría del Sprint 4.
>
> **Historias:** US-34 a US-45. Además:
> - **dos ajustes de navegación** del 25/10: "Buscar cliente" y "Canjes por código" solo en Caja, y
>   "Movimientos de puntos" fuera del menú de Administración ([3.13](#313-cambios-en-pantallas-y-endpoints-existentes));
> - el efecto de la **baja de un cliente** sobre sus canjes ([3.13](#313-cambios-en-pantallas-y-endpoints-existentes)).
>
> **Versión 1.1 (27/10/2026):** la foto de la recompensa pasa al Sprint 5; las filas de Recompensas y Canjes
> se abren con un clic (sin botones); los filtros de cliente de Canjes y de Clientes son por tipo y número de
> documento; el filtro de recompensa de Canjes es por nombre (decisiones S4-17 a S4-20).
>
> **Versión 1 (25/10/2026).** Reemplaza las secciones 4 a 10 del borrador v0 de este archivo. Las secciones 1
> a 3 y 12-A del borrador (estado de `develop`, verificación del Sprint 3 y arrastre) **no son contrato del
> Sprint 4**: se mueven a `docs/sprint-4/CIERRE_SPRINT_3.md`.
>
> **Si este contrato choca con `HISTORIAS_SPRINT_4.md`, manda el contrato.** Si choca con el prototipo, mirá
> la [8.1](#81-diferencias-del-prototipo-que-este-contrato-corrige).

**Convenciones de este documento**

- "UI" es el texto que muestra el prototipo. "API" es el valor que viaja en el JSON.
- Las decisiones se citan como "decisión S4-N" y están todas en la [8.3](#83-decisiones-del-sprint-4).
- **Marcas:** ✅ decidido, se programa así · 🟡 propuesta técnica que el equipo tiene que aprobar en el
  Planning antes de programar esa parte ([10](#10-pendientes)).
- **Máquinas de estado:** los nombres de los estados salen de la sección 9 de la Definición del Producto.
  Canje: Confirmado, Utilizado, Rechazado, Cancelado, Vencido (**no existe "Pendiente" ni "Solicitado"**).
  Recompensa: Activa, Deshabilitada, Inactiva y **Dada de baja** (el botón que ve el Administrador dice
  "Eliminar").

**Las cinco reglas que ordenan todo el sprint** (decisión S4-1, "opción B"):

1. El canje **nace Confirmado** cuando lo confirma el Cliente desde la app o el Cajero desde la caja.
2. **Confirmar no descuenta nada**: ni puntos ni stock.
3. El canje **dura 15 minutos** desde que se confirma.
4. **Puntos y stock se descuentan al registrar el uso**, y ahí se valida de verdad contra la base.
5. Cancelar, rechazar y vencer **no reintegran nada**, porque no se había descontado nada.

---

## Tabla de contenido

1. [Resumen de endpoints](#1-resumen-de-endpoints)
2. [Enumerados](#2-enumerados)
3. [Endpoints](#3-endpoints)
   - [3.1 Tipo `Reward`](#31-tipo-reward)
   - [3.2 Recompensas del Administrador (US-34, US-35, US-36, US-38)](#32-recompensas-del-administrador-us-34-us-35-us-36-us-38)
   - [3.3 Foto de la recompensa: Sprint 5](#33-foto-de-la-recompensa-sprint-5)
   - [3.4 Disponibilidad automática (US-37)](#34-disponibilidad-automática-us-37)
   - [3.5 Catálogo (US-39)](#35-catálogo-us-39)
   - [3.6 Tipo `Redemption` y código de canje](#36-tipo-redemption-y-código-de-canje)
   - [3.7 Confirmar canje (US-40)](#37-confirmar-canje-us-40)
   - [3.8 Canjes por código (US-41)](#38-canjes-por-código-us-41)
   - [3.9 Registrar uso (US-42)](#39-registrar-uso-us-42)
   - [3.10 Rechazar y cancelar (US-43)](#310-rechazar-y-cancelar-us-43)
   - [3.11 Vencimiento automático del canje (US-44)](#311-vencimiento-automático-del-canje-us-44)
   - [3.12 Consultar canjes (US-45)](#312-consultar-canjes-us-45)
   - [3.13 Cambios en pantallas y endpoints existentes](#313-cambios-en-pantallas-y-endpoints-existentes)
   - [3.14 Auditoría del Sprint 4](#314-auditoría-del-sprint-4)
   - [3.15 Modelo de datos nuevo](#315-modelo-de-datos-nuevo)
4. [Información general](#4-información-general)
5. [Convenciones de respuestas y errores nuevos](#5-convenciones-de-respuestas-y-errores-nuevos)
6. [Códigos HTTP](#6-códigos-http)
7. [Cambios respecto del Sprint 3](#7-cambios-respecto-del-sprint-3)
8. [Observaciones](#8-observaciones)
9. [Resumen por historia](#9-resumen-por-historia)
10. [Pendientes](#10-pendientes)

---

## 1. Resumen de endpoints

Todas las rutas cuelgan de `/api`. **A** = Administrador, **C** = Cajero, **Cl** = Cliente.

### Nuevos

| # | Método | Ruta | Roles | Para qué | Historia |
|---|---|---|---|---|---|
| 1 | `GET` | `/recompensas` | A | Catálogo del Administrador, con búsqueda, filtro de estado y paginado | US-34 a US-38 |
| 2 | `GET` | `/recompensas/disponibles` | A, C | "Recompensas a las que puede acceder" en el mostrador | US-40 |
| 3 | `GET` | `/recompensas/:id` | A | Datos para editar | US-35 |
| 4 | `POST` | `/recompensas` | A | Crear recompensa | US-34 |
| 5 | `PATCH` | `/recompensas/:id` | A | Editar recompensa | US-35 |
| 6 | `PATCH` | `/recompensas/:id/activar` | A | Inactiva → Activa (o Deshabilitada si no está disponible) | US-36 |
| 7 | `PATCH` | `/recompensas/:id/desactivar` | A | Activa o Deshabilitada → Inactiva | US-36 |
| 8 | `PATCH` | `/recompensas/:id/eliminar` | A | → Dada de baja | US-38 |
| 9 | `GET` | `/customers/me/recompensas` | Cl | Catálogo del Cliente, con filtro | US-39 |
| 10 | `POST` | `/customers/me/canjes` | Cl | El Cliente confirma un canje | US-40 |
| 11 | `POST` | `/customers/:id/canjes` | A, C | El Cajero confirma un canje en nombre del cliente | US-40 |
| 12 | `GET` | `/customers/me/canjes` | Cl | "Mis canjes" | US-45 |
| 13 | `PATCH` | `/customers/me/canjes/:code/cancelar` | Cl | El Cliente cancela su canje | US-43 |
| 14 | `GET` | `/customers/:id/canjes` | A, C | "Canjes para usar ahora" del cliente identificado (solo Confirmados vigentes) | US-42, US-45 |
| 15 | `GET` | `/canjes` | A | Pantalla "Canjes" del Administrador | US-45 |
| 16 | `GET` | `/canjes/:code` | A, C | "Canjes por código" | US-41 |
| 17 | `PATCH` | `/canjes/:code/usar` | A, C | Registrar el uso: descuenta puntos y stock | US-42 |
| 18 | `PATCH` | `/canjes/:code/rechazar` | A, C | Rechazar con motivo | US-43 |

### Existentes que cambian en este sprint

| Método | Ruta | Qué cambia |
|---|---|---|
| `PATCH` | `/customers/:id/deactivate` | Rechaza los canjes Confirmados del cliente (actor Sistema) en la misma transacción ([3.13.1](#3131-baja-de-un-cliente)) |
| `GET` | `/customers/:id/movimientos`, `/customers/me/movimientos` | Aparece el tipo `REDEMPTION` con `redemptionCode` ([3.13.2](#3132-movimientos-de-puntos)) |
| `GET` | `/auditoria` | Se habilita el módulo `REWARDS` y se registran las acciones de [3.14](#314-auditoría-del-sprint-4) |
| `GET` | `/customers` | Filtro por tipo y número de documento para la pantalla Clientes ([3.13.4](#3134-clientes-del-administrador-filtro-por-documento)) |

### Existentes que se quedan sin pantalla

| Método | Ruta | Qué pasa |
|---|---|---|
| `GET` | `/movimientos-de-puntos` | La pantalla "Movimientos de puntos" sale del menú de Administración (25/10). El endpoint **se mantiene** hasta que se decida (pendiente PD-3) |

---

## 2. Enumerados

Los valores de API van en inglés y mayúsculas, como el resto. La pantalla traduce con la columna "UI".

### 2.1 `RewardStatus` — estado de la recompensa ✅

| API | UI | Quién lo pone | Se ve en el catálogo del Cliente | Se puede canjear |
|---|---|---|---|---|
| `ACTIVE` | Activa | Administrador (crear, activar) o Sistema (habilitar) | Sí | Sí |
| `DISABLED` | Deshabilitada | **Solo el Sistema**: sin stock o vencida | Sí, con la etiqueta "Agotada" o "Vencida" y el botón deshabilitado | No |
| `INACTIVE` | Inactiva | Administrador ("Desactivar") | No | No |
| `DELETED` | Dada de baja | Administrador ("Eliminar"). **Estado final** | No (tampoco en el listado del Administrador) | No |

### 2.2 `RewardDisabledReason` ✅

Solo tiene valor cuando `status = DISABLED`.

| API | UI (etiqueta) | Motivo en auditoría |
|---|---|---|
| `OUT_OF_STOCK` | Agotada | Sin stock |
| `EXPIRED` | Vencida | Vencida |

### 2.3 `RedemptionStatus` — estado del canje ✅

| API | UI | Significado | Final |
|---|---|---|---|
| `CONFIRMED` | Confirmado | Nace así. **No descontó nada.** Tiene código y vence a los 15 minutos | No |
| `USED` | Utilizado | Se registró el uso: se descontaron los puntos y una unidad de stock | Sí |
| `REJECTED` | Rechazado | Lo rechazó un empleado (con motivo) o el Sistema (recompensa desactivada o eliminada, cliente dado de baja). Sin reintegro | Sí |
| `CANCELLED` | Cancelado | Lo canceló el Cliente desde la app. Sin reintegro | Sí |
| `EXPIRED` | Vencido | Pasaron 15 minutos sin usarse. Sin reintegro | Sí |

### 2.4 `RedemptionOrigin` ✅

| API | UI ("Confirmado por") |
|---|---|
| `APP` | Cliente (app) |
| `COUNTER` | Nombre del empleado que lo confirmó en la caja |

### 2.5 `CatalogFilter` — botones del catálogo del Cliente ✅

| API | UI | Qué muestra y en qué orden |
|---|---|---|
| `ALL` (por defecto) | Todas | Activas y Deshabilitadas, por puntos de menor a mayor y, a igual puntos, por nombre |
| `MOST_REDEEMED` | Más canjeadas | Activas y Deshabilitadas, por `usedCount` descendente (canjes **Utilizados**) |
| `EXPIRING_SOON` | Próx. a vencer | Solo Activas que vencen en 7 días o menos (`0 ≤ daysToExpire ≤ 7`), por fecha ascendente |

### 2.6 `RedemptionStatusGroup` — filtro "Estado" de Mis canjes ✅

| API | UI | Estados |
|---|---|---|
| (sin valor) | Todos | Todos |
| `CONFIRMED` | Confirmados | `CONFIRMED` |
| `FINISHED` | Finalizados | `USED`, `CANCELLED`, `REJECTED`, `EXPIRED` |

### 2.7 Auditoría: cambios en los enums existentes ✅

- `AuditModule.REWARDS` ("Recompensas") **se habilita** en el filtro. "Misiones" sigue "(Próximamente)".
- `AuditAction.REWARD_DELETED` cambia su UI: "Dio de baja recompensa" → **"Eliminó recompensa"**.
- Los demás códigos `REWARD_*` y `REDEMPTION_*` ya existen en el schema desde el Sprint 3. El detalle de cada
  uno está en [3.14](#314-auditoría-del-sprint-4).

### 2.8 `PointsMovementType` ✅

**No hay tipos nuevos.** El canje usa `REDEMPTION` (UI "Canje", signo −), que ya existe. No existe ningún
tipo de reintegro (decisión S4-1).

---

## 3. Endpoints

### 3.1 Tipo `Reward`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | entero | No | |
| `name` | string (1–80) | No | |
| `description` | string (≤ 255) | Sí | `null` si no tiene |
| `points` | entero 1–1.000.000 | No | Puntos que cuesta. Los canjes ya confirmados conservan los suyos (snapshot) |
| `stock` | entero 0–100.000 | **Sí** | `null` = **sin límite** (no controla stock). UI: "Sin límite" |
| `expiresAt` | `YYYY-MM-DD` | **Sí** | Último día en que se puede canjear, en hora de Argentina. `null` = **no vence**. UI: "No vence" |
| `daysToExpire` | entero | Sí | `expiresAt − hoy` (hora de Argentina). `null` si no vence. Negativo si ya venció |
| `status` | `RewardStatus` | No | |
| `disabledReason` | `RewardDisabledReason` | Sí | Solo con `status = DISABLED` |
| `photoUrl` | string | Sí | **Siempre `null` en el Sprint 4** (la foto es del Sprint 5, [3.3](#33-foto-de-la-recompensa-sprint-5)). Se deja en el tipo para que la pantalla ya muestre la imagen genérica cuando es `null` |
| `usedCount` | entero ≥ 0 | No | Cantidad de canjes `USED` ("Más canjeadas") |
| `confirmedCount` | entero ≥ 0 | No | Canjes `CONFIRMED` vigentes **en este momento**. Solo en las respuestas del Administrador |
| `updatedAt` | ISO | No | Orden del listado del Administrador |

**Disponible** (se usa en todo el contrato): `status = ACTIVE` **y** (`stock` es `null` o `> 0`) **y**
(`expiresAt` es `null` o `>= hoy` en hora de Argentina). Se calcula con la fecha, no solo con el estado: entre
las 00:00 y la corrida del proceso diario ([3.4](#34-disponibilidad-automática-us-37)) una recompensa puede
seguir `ACTIVE` con la fecha vencida, y ya **no** está disponible.

**Etiqueta de vencimiento** (la arma el frontend con `status`, `disabledReason` y `daysToExpire`):

| Caso | Texto | Estilo |
|---|---|---|
| `DISABLED` | "Agotada" o "Vencida" | Contorno |
| `daysToExpire = null` | "No vence" | Neutro |
| `daysToExpire = 0` | "Vence hoy" | Destacado |
| `1 ≤ daysToExpire ≤ 5` | "Vence en {n} d" | Destacado |
| `daysToExpire > 5` | "Vence en {n} d" | Neutro |

---

### 3.2 Recompensas del Administrador (US-34, US-35, US-36, US-38)

**Pantalla:** Administración → **Recompensas** (`Recompensas.html`). Título "Catálogo de recompensas" y
botón **"+ Crear recompensa"**.

#### 3.2.1 `GET /api/recompensas` — listado

| Query param | Tipo | Regla | UI |
|---|---|---|---|
| `q` | string (máx. 80) | Parte del nombre, sin distinguir mayúsculas ni tildes | "Buscar · Nombre de la recompensa" |
| `status` | `ACTIVE` \| `DISABLED` \| `INACTIVE` | Sin valor = todas menos `DELETED`. `DELETED` → `400` | "Estado": Todas · Activas · Deshabilitadas · Inactivas |
| `page` | entero ≥ 1 | Por defecto `1` | |
| `limit` | entero 1–100 | Por defecto `20`. La pantalla usa `10` | |

**Orden:** `updatedAt` descendente (la última modificada primero). **Nunca** devuelve `DELETED`.

**Respuesta `200`:** `{ items: Reward[], total, page, limit }`, con `confirmedCount` en cada ítem.

**Pantalla:**

- **Columnas:** Foto (miniatura o imagen genérica) · Nombre (y la descripción debajo, 2 líneas como máximo)
  · Puntos · Stock ("Sin límite") · Vencimiento (`dd/mm/aaaa` o "No vence") · Canjes confirmados · Estado
  (badge; si está Deshabilitada: "Deshabilitada · Agotada" o "Deshabilitada · Vencida") · chevron (›).
- **Las filas no tienen botones** (decisión S4-19). **Clic en la fila** abre el modal "Editar recompensa"
  ([3.2.4](#324-patch-apirecompensasid--editar-us-35)), que tiene abajo Desactivar o Activar, Eliminar y
  Confirmar cambios. Debajo del título: "Hacé clic en una recompensa para editarla, desactivarla o
  eliminarla.".
- **Foto:** en el Sprint 4 todas muestran la imagen genérica.
- **Paginado:** "Mostrando 1–10 de N", con Anterior y Siguiente.
- **Vacío:** "No hay recompensas para los filtros seleccionados."

#### 3.2.2 `GET /api/recompensas/:id`

`200` con el `Reward`. `404` si no existe **o está `DELETED`**: "No existe la recompensa.".

#### 3.2.3 `POST /api/recompensas` — crear (US-34)

**Body** (`application/json`; sin foto en el Sprint 4, [3.3](#33-foto-de-la-recompensa-sprint-5)):

| Campo | Tipo | Obligatorio | Reglas | Mensaje |
|---|---|---|---|---|
| `name` | string | Sí | Se recorta. 1 a 80 caracteres. **Único** entre las recompensas que no están `DELETED`, sin distinguir mayúsculas ni espacios de los extremos | Vacío: "Completá este campo." · > 80: "Máximo 80 caracteres." · repetido: `409 REWARD_NAME_IN_USE` "Ya existe una recompensa con ese nombre." |
| `description` | string \| null | No | Se recorta. Hasta 255. Vacío = `null` | "Máximo 255 caracteres." |
| `points` | entero | Sí | 1 a 1.000.000 | "Ingresá un número entero mayor a 0." · "El máximo es 1.000.000 puntos." |
| `stock` | entero \| null | Sí (puede ser `null`) | `null` = sin límite. Si tiene valor: **1** a 100.000 al crear | "Ingresá un número entero mayor a 0." · "El máximo es 100.000." |
| `expiresAt` | `YYYY-MM-DD` \| null | Sí (puede ser `null`) | `null` = no vence. Si tiene valor: hoy o posterior (hora de Argentina) | "La fecha no puede ser anterior a hoy." |

**Qué hace:** crea la recompensa en `ACTIVE` y audita `REWARD_CREATED`.

**Respuesta `201`:** el `Reward`.

**Modal "Crear recompensa"** (dos secciones):

| Sección | Campo | Detalle de pantalla |
|---|---|---|
| Recompensa | Foto que verán los clientes | **Próximamente.** "Imagen genérica", botón "Elegir imagen" deshabilitado con la etiqueta "Próximamente" y la ayuda "La carga de imágenes llega en el Sprint 5. Mientras tanto, los clientes ven la imagen genérica." |
| | Nombre | Placeholder "Ej: Café + medialuna" |
| | Descripción (opcional) | Textarea, contador "0/255". Placeholder "Ej: Café chico con una medialuna de manteca." |
| | Puntos | Placeholder "150" |
| Disponibilidad | Stock (cantidad) | Casilla **"Sin límite de stock"**: si está marcada, el campo se deshabilita y se manda `null`. Sin valor y sin la casilla: "Completá este campo o marcá «Sin límite de stock»." |
| | Vencimiento | Calendario. Casilla **"No vence"**: manda `null`. Sin fecha y sin la casilla: "Elegí una fecha o marcá «No vence»." |

Botones Cancelar · Guardar. Al guardar: toast **"Recompensa guardada."**.

#### 3.2.4 `PATCH /api/recompensas/:id` — editar (US-35)

**Body:** los mismos campos de [3.2.3](#323-post-apirecompensas--crear-us-34), **todos opcionales**; tiene que
venir al menos uno (`400` "Indicá al menos un campo para modificar."). Diferencias con el alta:

| Campo | Regla al editar |
|---|---|
| `stock` | 0 a 100.000 o `null`. **No puede ser menor que `confirmedCount`**: `409 STOCK_BELOW_CONFIRMED` "El stock no puede ser menor a los {n} canjes confirmados." |
| `expiresAt` | Si viene con valor, hoy o posterior (igual que al crear). Para dejarla sin vencimiento se manda `null` |
| `points` | Cambiarlos **no** afecta a los canjes ya confirmados: conservan los puntos con los que se pidieron |

**No se puede editar** una recompensa `DELETED` (`404`). Sí se puede editar una `INACTIVE` o `DISABLED`.

**Qué hace, en una transacción:**

1. Guarda los cambios y actualiza `updatedAt`.
2. Audita `REWARD_UPDATED` con una fila por campo que cambió. Si no cambió nada, no audita y responde igual.
3. Reevalúa la disponibilidad ([3.4](#34-disponibilidad-automática-us-37)):
   - `DISABLED` que quedó disponible (repuso stock, extendió la fecha o la dejó sin límite) → `ACTIVE` y
     `REWARD_ENABLED` (Sistema).
   - `ACTIVE` que quedó con `stock = 0` → `DISABLED` / `OUT_OF_STOCK` y `REWARD_DISABLED` (Sistema). Solo
     puede pasar si no tiene canjes confirmados (por la regla del stock).
   - `INACTIVE` no cambia de estado.

**Respuesta `200`:** `{ reward, availabilityChange }`, donde `availabilityChange` es `"ENABLED"`,
`"DISABLED"` o `null`.

**Modal "Editar recompensa"** (se abre con un clic en la fila): el mismo que el de crear, con los datos
cargados. Además:

- Debajo del título: "Estado: {badge} · Canjes confirmados: {n}".
- **Botones de abajo:** a la izquierda **Desactivar** (o **Activar** si está Inactiva) y **Eliminar** (en
  rojo); a la derecha **Cancelar** y **Confirmar cambios**. No hay botón "Editar".
- Desactivar y Eliminar abren su diálogo de confirmación encima del modal
  ([3.2.6](#326-patch-apirecompensasiddesactivar-us-36), [3.2.7](#327-patch-apirecompensasideliminar-us-38));
  al confirmarlo se cierran los dos. Activar cierra el modal y muestra el toast. Los cambios del formulario
  que no se confirmaron se descartan.

- Si `confirmedCount > 0`, debajo del stock: "Hay {n} canjes confirmados. El stock no puede ser menor a {n}.".
- Debajo de los puntos, siempre: "Los canjes ya confirmados mantienen los puntos con los que se pidieron.".
- Toast al guardar: "Recompensa guardada." y, según `availabilityChange`, " La recompensa volvió a estar
  disponible." o " La recompensa quedó deshabilitada porque no tiene stock o está vencida.".

#### 3.2.5 `PATCH /api/recompensas/:id/activar` (US-36)

Solo desde `INACTIVE` (si no: `409 INVALID_REWARD_STATUS` "La recompensa no está inactiva.").

- Si está **disponible** → `ACTIVE`.
- Si **no** lo está (sin stock o vencida) → `DISABLED` con su motivo. **No es un error** (decisión S4-9).

Audita `REWARD_ACTIVATED` ("Estado: Inactiva → Activa" o "Inactiva → Deshabilitada"). **Respuesta `200`:**
`{ reward }`.

**Pantalla:** botón **Activar** del modal de edición, sin diálogo previo. Toast: "Recompensa activada." o, si quedó `DISABLED`: "Se activó, pero quedó
deshabilitada porque no tiene stock o está vencida. Reponé el stock o extendé la fecha.".

#### 3.2.6 `PATCH /api/recompensas/:id/desactivar` (US-36)

Desde `ACTIVE` o `DISABLED` (si no: `409 INVALID_REWARD_STATUS` "La recompensa ya está inactiva.").

**Qué hace, en una transacción:**

1. Pasa a `INACTIVE` (y borra `disabledReason`).
2. **Rechaza sus canjes `CONFIRMED`** vigentes con actor Sistema y motivo **"Recompensa desactivada"**
   (decisión S4-8). Cada uno se audita como `REDEMPTION_REJECTED` (Sistema).
3. Audita `REWARD_DEACTIVATED` ("Estado: {antes} → Inactiva" y, si hubo, "Canjes rechazados: {n}").

**Respuesta `200`:** `{ reward, rejectedRedemptions }`.

**Diálogo** (desde el botón **Desactivar** del modal de edición): "Desactivar recompensa" · "¿Desactivar **{nombre}**? Los clientes no la van a ver en el
catálogo." · si `confirmedCount > 0`, en rojo: "Hay {n} canjes confirmados de esta recompensa. Se van a
rechazar automáticamente." · Cancelar · Desactivar. Toast: "Recompensa desactivada." (+ " Se rechazaron {n}
canjes confirmados." si `rejectedRedemptions > 0`).

#### 3.2.7 `PATCH /api/recompensas/:id/eliminar` (US-38)

Desde `ACTIVE`, `DISABLED` o `INACTIVE` (si no existe o ya está `DELETED`: `404`).

**Qué hace:** igual que desactivar, pero pasa a `DELETED` y el motivo de los canjes rechazados es
**"Recompensa eliminada"**. Audita `REWARD_DELETED`. Libera el nombre: se puede crear otra recompensa con el
mismo nombre.

**Respuesta `200`:** `{ rejectedRedemptions }`.

**Diálogo** (desde el botón **Eliminar** del modal de edición): "Eliminar recompensa" · "¿Eliminar **{nombre}**? Va a dejar de aparecer en el catálogo y no se
puede deshacer." · mismo aviso en rojo · Cancelar · Eliminar. Toast: "Recompensa eliminada.".

> Una recompensa dada de baja **sigue apareciendo** en los canjes viejos (por el snapshot del nombre), y el
> buscador "Recompensa" de la pantalla Canjes la encuentra por ese nombre
> ([3.12.3](#3123-get-apicanjes--pantalla-canjes-del-administrador)).

### 3.3 Foto de la recompensa: Sprint 5

**Fuera del Sprint 4** (decisión S4-17). US-34 pide "imagen", pero la carga se hace en el **Sprint 5**.

- En el Sprint 4 **no hay** endpoints de foto, ni tabla para guardarlas, ni el error `INVALID_IMAGE`.
- `photoUrl` viaja siempre en `null` y todas las pantallas muestran la **imagen genérica**.
- En el modal de crear y editar, el campo "Foto que verán los clientes" aparece **deshabilitado** con la
  etiqueta **"Próximamente"** ([3.2.3](#323-post-apirecompensas--crear-us-34)).
- **Para el Sprint 5 queda definido** (de la versión 1 de este contrato, como punto de partida):
  `PUT /recompensas/:id/foto` (`multipart/form-data`, campo `photo`, JPG/PNG/WebP validados por contenido,
  hasta 2 MB, `400 INVALID_IMAGE` "Usá una imagen JPG, PNG o WebP de hasta 2 MB."), `DELETE …/foto` (`204`),
  `GET …/foto` **público** (porque `<img src>` no manda el token), auditoría `REWARD_UPDATED` con "Foto:
  Actualizada" o "Foto: Quitada", y `photoUrl = "/api/recompensas/{id}/foto?v={n}"`. Falta decidir dónde se
  guardan (propuesta: en la base, porque el disco de Render es efímero). Lo mismo aplica a la foto de perfil
  del Cliente.

---

### 3.4 Disponibilidad automática (US-37)

US-37 no tiene endpoint: son reglas que el backend aplica solo, con actor **Sistema**.

| Cuándo | De | A | Auditoría (Sistema) |
|---|---|---|---|
| Al registrar un uso, el stock llega a 0 ([3.9](#39-registrar-uso-us-42)) | `ACTIVE` | `DISABLED` / `OUT_OF_STOCK` | `REWARD_DISABLED` · "Motivo: Sin stock" |
| Al editar, queda con `stock = 0` ([3.2.4](#324-patch-apirecompensasid--editar-us-35)) | `ACTIVE` | `DISABLED` / `OUT_OF_STOCK` | `REWARD_DISABLED` · "Motivo: Sin stock" |
| Proceso diario: `expiresAt < hoy` | `ACTIVE` | `DISABLED` / `EXPIRED` | `REWARD_DISABLED` · "Motivo: Vencida" |
| Al editar, repone stock o deja "Sin límite" | `DISABLED` / `OUT_OF_STOCK` | `ACTIVE` (si además no está vencida) | `REWARD_ENABLED` · "Motivo: Stock repuesto" |
| Al editar, mueve la fecha a hoy o después, o la deja "No vence" | `DISABLED` / `EXPIRED` | `ACTIVE` (si además tiene stock) | `REWARD_ENABLED` · "Motivo: Fecha de vencimiento actualizada" |

**Proceso diario de recompensas vencidas:**

| Ítem | Regla |
|---|---|
| Horario | Todos los días a las **00:05** (hora de Argentina), junto con el vencimiento de puntos de US-25. También corre una vez **al iniciar el servidor** |
| Qué toma | `status = ACTIVE` y `expires_at < hoy` |
| Cada recompensa | Una transacción. Si una falla, se deshace solo esa y el proceso sigue |
| Canjes Confirmados de una recompensa que vence | **No se tocan.** Duran como máximo 15 minutos; si se intenta usarlos, el uso falla con `REWARD_NOT_AVAILABLE` y el Cajero los rechaza |
| Variable y comando | `REWARDS_EXPIRATION_CRON_ENABLED` (prendida por defecto, `false` en los e2e) y `npm run rewards:expire` (desde `backend/`), igual que US-25 |

Un **Administrador nunca pone `DISABLED` a mano** y nunca saca una recompensa de `DISABLED` con "Activar":
la habilita el Sistema cuando el Administrador repone el stock o la fecha.

---

### 3.5 Catálogo (US-39)

#### 3.5.1 `GET /api/customers/me/recompensas` — catálogo del Cliente

| Query param | Tipo | Regla |
|---|---|---|
| `filter` | `CatalogFilter` | Por defecto `ALL`. Ver [2.5](#25-catalogfilter--botones-del-catálogo-del-cliente-) |

**Respuesta `200`:**

```json
{
  "balance": 480,
  "items": [
    {
      "id": 6, "name": "Medialunas x3", "description": "Tres medialunas de manteca para llevar.",
      "points": 100, "stock": 30, "expiresAt": "2026-10-28", "daysToExpire": 3,
      "status": "ACTIVE", "disabledReason": null, "photoUrl": null, "usedCount": 31
    }
  ]
}
```

- Sin paginado (el catálogo es chico).
- Nunca trae `INACTIVE` ni `DELETED`.
- Las `ACTIVE` que ya no están disponibles por fecha ([3.1](#31-tipo-reward)) vienen como
  `DISABLED`/`EXPIRED`, aunque el proceso diario todavía no haya corrido.
- `balance` es el saldo actual (el mismo de `GET /customers/me/puntos`). Viene acá para que la pantalla no
  haga dos pedidos.

**Pantalla** (Cliente → pestaña **Canjes** → **Catálogo**; `ClienteCanjes.html`):

- Arriba: "Tenés **{saldo} pts** para canjear".
- Botones de filtro: Todas · Más canjeadas · Próx. a vencer.
- **Tarjeta:** imagen genérica (la foto es del Sprint 5), nombre, descripción (2 líneas como máximo), "{n} pts", etiqueta de
  vencimiento ([3.1](#31-tipo-reward)) y botón **Canjear**.
- **Canjear deshabilitado** (lo decide el frontend con `balance`; decisión S4-2):
  - recompensa `DISABLED`;
  - `balance < points` → debajo: "Te faltan {points − balance} pts";
  - `balance < 0` → tooltip "Tenés un ajuste pendiente. Comunicate con el restaurante", y arriba del catálogo
    el aviso "Tenés un ajuste pendiente, por eso no podés canjear por ahora. Comunicate con el restaurante.".
- **Vacío:** "No hay recompensas disponibles por ahora." (con "Próx. a vencer": "No hay recompensas que
  venzan en los próximos 7 días.").
- Al pie: "Al canjear recibís un código que dura 15 minutos. Los puntos se descuentan recién cuando lo usás en
  el local.".

**Inicio del Cliente** (cambia la tarjeta "Próximamente"):

- Tarjeta **"Recompensas"** · "Mirá lo que podés canjear con tus {saldo} pts" · botón **"Ver catálogo"**
  (abre la pestaña Canjes en Catálogo).
- Si tiene canjes `CONFIRMED` vigentes, arriba aparece la tarjeta **"Tenés un canje para usar"** · "{recompensa}
  · vence en {n} min" (y "(y {n} más)" si hay varios) · botón **"Ver código"** (abre Mis canjes). Sale de
  `GET /customers/me/canjes?status=CONFIRMED`.
- La pestaña **Canjes** de la barra inferior deja de decir "Próx.".

#### 3.5.2 `GET /api/recompensas/disponibles` — mostrador

Para el bloque "Recompensas a las que puede acceder" del panel del cliente en Caja.

- Devuelve solo las **disponibles** ([3.1](#31-tipo-reward)), por puntos ascendentes.
- **Respuesta `200`:** `Reward[]` (sin `confirmedCount`).
- La pantalla filtra las que alcanzan con el saldo que ya tiene cargado de `GET /customers/:id/puntos`
  (decisión S4-2): `points <= balance`. Con saldo negativo no muestra ninguna.

---

### 3.6 Tipo `Redemption` y código de canje

#### 3.6.1 Código de canje ✅ (decisión S4-5)

| Regla | Valor |
|---|---|
| Formato | **6 caracteres** del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin `0`, `O`, `1` ni `I`, para que no se confundan al dictarlo o escribirlo). Ejemplo: `K7MP2X` |
| Cómo se genera | Aleatorio con `crypto.randomInt`. **No** se deriva del id: el código es lo que presenta el cliente y no tiene que poder adivinarse |
| Unicidad | Único entre **todos** los canjes (`UNIQUE`). Si choca, se genera otro (hasta 5 intentos; después, `500`) |
| Qué identifica | El canje, y por él al cliente y a la recompensa |
| Normalización de lo que escribe el empleado | Mayúsculas, sin espacios ni guiones. Si después de normalizar no cumple el formato, la respuesta es `404` "Código no encontrado." (la pantalla no distingue "mal escrito" de "no existe") |
| En auditoría | `operationCode` y primera fila de `details` ("Código del canje") |

#### 3.6.2 Tipo `Redemption`

| Campo | Tipo | Nulo | Lo ve el Cliente | Descripción |
|---|---|---|---|---|
| `id` | entero | No | Sí | |
| `code` | string | No | Sí | `K7MP2X` |
| `createdAt` | ISO | No | Sí | Cuándo se confirmó |
| `expiresAt` | ISO | No | Sí | `createdAt + 15 minutos` |
| `status` | `RedemptionStatus` | No | Sí | |
| `reward` | `{ id, name, points }` | No | Sí | **Snapshot** del nombre y de los puntos al confirmar |
| `customer` | `{ id, firstName, lastName, documentType, documentNumber }` | No | No | |
| `origin` | `RedemptionOrigin` | No | No | |
| `confirmedBy` | `{ accountId, name }` | Sí | No | Empleado que lo confirmó en la caja. `null` si `origin = APP` |
| `resolvedAt` | ISO | Sí | Sí | Cuándo llegó a un estado final. En `EXPIRED` es igual a `expiresAt` |
| `resolvedBy` | `{ actorType, accountId, name }` | Sí | **No** | Empleado o "Sistema". `null` si lo canceló el Cliente. **El Cliente nunca ve qué empleado resolvió su canje** |
| `rejectionReason` | string | Sí | Sí | Solo `REJECTED` |
| `balanceBefore` / `balanceAfter` | entero | Sí | No | Solo `USED`: saldo antes y después del descuento |
| `canCancel` | boolean | No | Sí (solo en `/customers/me/canjes`) | `status = CONFIRMED` y no venció |

---

### 3.7 Confirmar canje (US-40)

#### 3.7.1 `POST /api/customers/me/canjes` (Cl) y `POST /api/customers/:id/canjes` (A, C)

**Body:** `{ "rewardId": 6 }`.

**Qué valida el backend** (decisión S4-2: **el saldo no se valida acá**):

| Orden | Validación | Error |
|---|---|---|
| 1 | El cliente existe y está activo. En la ruta del Cliente sale del token | `404` · `409 CUSTOMER_INACTIVE` "El cliente está dado de baja." |
| 2 | La recompensa existe, no está `DELETED` y está **disponible** ([3.1](#31-tipo-reward)) | `404` "No existe la recompensa." · `409 REWARD_NOT_AVAILABLE` "La recompensa ya no está disponible." |

**Qué hace:**

1. Crea el canje `CONFIRMED` con su código, `expiresAt = ahora + 15 min` y el snapshot de nombre y puntos.
2. Guarda el origen: `APP` (ruta `/me`) o `COUNTER` (ruta `/:id`, con `confirmedBy` = el empleado del token).
3. **No toca** el saldo, los lotes, los movimientos ni el stock.
4. **Auditoría:**
   - desde la caja (`COUNTER`): `REDEMPTION_CONFIRMED`, a nombre del empleado;
   - desde la app (`APP`): **no se audita**. El Cliente nunca es actor; el impacto se audita cuando el Cajero
     registra el uso (regla de auditoría #4 del Sprint 3; decisión S4-6).

**Respuesta `201`:** `{ redemption }`.

**Validación del saldo en la pantalla** (decisión S4-2): antes de mandar el pedido, el frontend compara con
el saldo que ya tiene cargado. Si `balance < points` o `balance < 0`, no deja confirmar. La validación real es
al registrar el uso ([3.9](#39-registrar-uso-us-42)). **Consecuencia aceptada:** un cliente puede tener varios
canjes Confirmados que juntos superan su saldo. El primero que se usa descuenta; los demás fallan al usarse
con `INSUFFICIENT_BALANCE` y el Cajero los rechaza.

#### 3.7.2 Pantallas

**Cliente → modal "Confirmar canje":**

- Imagen genérica, nombre, descripción y "{n} pts".
- "Saldo: **{saldo} pts** → **{saldo − n} pts** al usarlo".
- "Vas a canjear {n} puntos por esta recompensa. Los puntos se descuentan cuando lo uses en el local. Tenés 15
  minutos para presentar el código en caja."
- Botones: Cancelar · Confirmar.
- Errores del backend: `REWARD_NOT_AVAILABLE` → "Esta recompensa ya no está disponible." y se refresca el
  catálogo.

**Cliente → "¡Canje confirmado!":**

- Código grande (`K7MP2X`), nombre de la recompensa y puntos.
- Cuenta regresiva **"Vence en 14:59"**, calculada con `expiresAt`. En el último minuto: "Vence en menos de 1
  min". En rojo cuando faltan 2 minutos o menos.
- "Presentá este código en caja."
- Botones: "Volver al catálogo" · "Ver mis canjes".

**Caja → panel del cliente → "Recompensas a las que puede acceder" → Canjear:**

- Ventana "Canjear recompensa": cliente, recompensa, puntos y el texto "Confirmá que el cliente acepta el
  canje. Los puntos se descuentan cuando se registra el uso; el canje dura 15 minutos."
- Validación de pantalla, antes de llamar: "El cliente no tiene puntos suficientes para esta recompensa." o
  "El cliente tiene un ajuste pendiente: no puede canjear.".
- Al confirmar (`201`), pregunta **"¿Aplicar el canje ahora?"** (No, después · Sí, aplicar). "Sí, aplicar"
  sigue con el registro de uso ([3.9](#39-registrar-uso-us-42)). "No, después": toast "Canje {código}
  confirmado. Se aplica cuando el cliente lo presente." y el canje aparece en "Canjes para usar ahora".

---

### 3.8 Canjes por código (US-41)

**Pantalla:** Caja → **Canjes por código** (`CanjePorCodigo.html`). Está **solo en el menú de Caja**; el
Administrador entra por el botón "Caja" (decisión del 25/10).

#### 3.8.1 `GET /api/canjes/:code`

- Normaliza `:code` ([3.6.1](#361-código-de-canje--decisión-s4-5)).
- **Vence al leer:** si está `CONFIRMED` y `expiresAt <= ahora`, primero lo pasa a `EXPIRED` ([3.11](#311-vencimiento-automático-del-canje-us-44)).
- **Respuesta `200`:** el `Redemption` completo, en cualquier estado.
- `404` "Código no encontrado.".

**Pantalla:**

- Título "Canjes", subtítulo "Por código". Texto: "Usalo cuando el cliente solo presenta el código, sin
  buscarlo por documento."
- Campo **"Código de canje"** (placeholder `K7MP2X`, en mayúsculas) y botón **Buscar**. Vacío: "Ingresá el
  código del canje." (no llama al backend).
- **Resultado:**
  - tarjeta "Cliente": nombre y documento (tipo real);
  - tarjeta "Recompensa": nombre, "{n} pts" y el badge del estado;
  - con `CONFIRMED`: "Vence en {n} min" (en rojo si faltan 2 o menos) y los botones **Rechazar** y **Aplicar**;
  - con `EXPIRED`: "El canje venció. El cliente tiene que pedirlo de nuevo." (sin botones);
  - con otro estado final: 'El canje ya está en estado "{Estado}".' (sin botones).

---

### 3.9 Registrar uso (US-42)

#### 3.9.1 `PATCH /api/canjes/:code/usar` (A, C)

Sin body.

**Orden de los bloqueos** (para no generar *deadlocks*, siempre en este orden): recompensa → canje →
`customer_points`. Todos con `SELECT … FOR UPDATE`.

**Qué hace:**

| Paso | Qué valida o hace | Si falla |
|---|---|---|
| 1 | El canje existe | `404` "Código no encontrado." |
| 2 | Si está `CONFIRMED` y venció: lo pasa a `EXPIRED` en **una transacción aparte que se confirma** ([3.11](#311-vencimiento-automático-del-canje-us-44)) | `409 REDEMPTION_EXPIRED` "El canje venció. El cliente tiene que pedirlo de nuevo." |
| 3 | Está `CONFIRMED` | `409 REDEMPTION_NOT_CONFIRMED` 'El canje ya está en estado "{Estado}".' |
| 4 | El cliente está activo | `409 CUSTOMER_INACTIVE` |
| 5 | La recompensa está disponible ([3.1](#31-tipo-reward)) | `409 REWARD_NOT_AVAILABLE` "La recompensa ya no está disponible. Podés rechazar el canje." |
| 6 | **Saldo real:** `balance >= redemption.points` y `balance >= 0` | `409 INSUFFICIENT_BALANCE` "El cliente no tiene saldo suficiente para este canje. Podés rechazarlo." |
| 7 | Descuenta los puntos con `PointsService.canjear`: de los lotes `ACTIVE` en orden de vencimiento (FIFO), igual que el ajuste `SUBTRACT`. Registra el movimiento `REDEMPTION` por `−points` con `balanceAfter`, `redemptionId` y la descripción "Canje: {recompensa}". **No cambia `lifetimePoints`** (canjear no baja el nivel) | — |
| 8 | Si la recompensa tiene stock (`!= null`): `stock − 1`. Si llega a 0 → `DISABLED` / `OUT_OF_STOCK` y `REWARD_DISABLED` (Sistema) | — |
| 9 | Pasa el canje a `USED`: `resolvedAt`, `resolvedBy` (el empleado del token), `balanceBefore` y `balanceAfter` | — |
| 10 | Audita `REDEMPTION_USED` a nombre del empleado | — |

Del paso 3 al 10 es **una sola transacción**. Si dos empleados usan el mismo código a la vez, uno gana y el
otro recibe `409 REDEMPTION_NOT_CONFIRMED` 'El canje ya está en estado "Utilizado".'.

**Respuesta `200`:** `{ redemption, balanceBefore, balanceAfter }`.

Con los errores de los pasos 5 y 6 el canje **sigue `CONFIRMED`**: la pantalla ofrece rechazarlo.

#### 3.9.2 Pantallas

Se registra el uso desde **dos lugares** (decisión S4-7): el panel del cliente en Caja ("Canjes para usar
ahora" → Registrar uso) y Canjes por código (→ Aplicar). El Administrador además puede hacerlo desde su
pantalla Canjes ([3.12.3](#3123-get-apicanjes--pantalla-canjes-del-administrador)). Las tres usan la misma
ventana:

- **Título:** "Registrar uso del canje {código}".
- **Resumen:** Código · Cliente (nombre y documento) · Recompensa · Puntos a descontar (`−n pts`) · "Vence en
  {n} min".
- **Texto:** "¿Registrar el uso del canje **{código}**? Entregá: **{recompensa}**. Se van a descontar {n}
  pts."
- **Botones:** Cancelar · Confirmar.
- **Resultado (`200`):** "Canje utilizado" · "Canje {código} utilizado. Entregar: {recompensa}." · tarjeta
  "Puntos descontados: −{n} pts · Saldo: {antes} → {después} pts" · botón Listo.
- **Errores:**
  - `INSUFFICIENT_BALANCE` y `REWARD_NOT_AVAILABLE`: el mensaje y el botón **"Rechazar canje"**, que abre la
    ventana de [3.10.2](#3102-pantalla-rechazar-canje);
  - `REDEMPTION_EXPIRED`: el mensaje, sin botones;
  - `REDEMPTION_NOT_CONFIRMED`: el mensaje, sin botones.

---

### 3.10 Rechazar y cancelar (US-43)

#### 3.10.1 `PATCH /api/canjes/:code/rechazar` (A, C)

**Body:**

| Campo | Tipo | Obligatorio | Reglas | Mensaje |
|---|---|---|---|---|
| `reason` | string | Sí | Se recorta. De 5 a 500 caracteres | Vacío: "El motivo es obligatorio." · < 5: "Indicá un motivo de al menos 5 caracteres." · > 500: "El motivo no puede superar los 500 caracteres." |

**Qué hace:** vence al leer si corresponde (mismo paso 2 de [3.9.1](#391-patch-apicanjescodeusar-a-c)); valida
`CONFIRMED` (`409 REDEMPTION_NOT_CONFIRMED`); pasa a `REJECTED` con `resolvedBy`, `resolvedAt` y
`rejectionReason`; audita `REDEMPTION_REJECTED` a nombre del empleado. **No reintegra nada.**

**Respuesta `200`:** `{ redemption }`.

#### 3.10.2 Pantalla "Rechazar canje"

- **Título:** "Rechazar canje {código}".
- **Motivos rápidos** (chips): "Sin insumo" · "El cliente desistió" · "El cliente no está" · "Otro". Un chip
  completa el campo con su texto; "Otro" lo deja vacío para escribir.
- **Campo:** "Motivo (obligatorio)", textarea con las validaciones de arriba.
- **Nota:** "No se descontó nada, así que no hay puntos ni stock para reintegrar."
- **Botones:** Volver · Rechazar. Toast: "Canje rechazado.".

#### 3.10.3 `PATCH /api/customers/me/canjes/:code/cancelar` (Cl)

- Solo el **dueño**. Si el código no existe o es de otro cliente: `404` "No existe el canje.".
- Vence al leer si corresponde → `409 REDEMPTION_EXPIRED` "El canje ya venció.".
- Solo desde `CONFIRMED` → si no, `409 REDEMPTION_NOT_CONFIRMED` "El canje ya no se puede cancelar.".
- Pasa a `CANCELLED`, `resolvedAt = ahora`, `resolvedBy = null`.
- **No se audita** (regla de auditoría #5 del Sprint 3). **No reintegra nada.**
- **Respuesta `200`:** `{ redemption }`.

**Diálogo del Cliente:** "Cancelar canje" · "¿Cancelar el canje de **{recompensa}**? Lo vas a poder volver a
pedir si tenés puntos." · Volver · Cancelar canje. Toast: "Canje cancelado.".

#### 3.10.4 Rechazos automáticos (Sistema)

| Cuándo | Motivo que se guarda | Dónde |
|---|---|---|
| Se desactiva la recompensa | "Recompensa desactivada" | [3.2.6](#326-patch-apirecompensasiddesactivar-us-36) |
| Se elimina la recompensa | "Recompensa eliminada" | [3.2.7](#327-patch-apirecompensasideliminar-us-38) |
| Se da de baja el cliente | "Cliente dado de baja" | [3.13.1](#3131-baja-de-un-cliente) |

Cada uno: `REJECTED`, `resolvedBy = { actorType: "SYSTEM", accountId: null, name: "Sistema" }`, auditado
`REDEMPTION_REJECTED` con actor Sistema, en la misma transacción que la operación que lo dispara.

---

### 3.11 Vencimiento automático del canje (US-44)

Sin endpoint. ✅ Mecanismo de la máquina de estados v1.0 (decisión S4-4):

| Ítem | Regla |
|---|---|
| Plazo | **15 minutos** desde `createdAt`. Constante en el código, no configurable |
| Vence "al leer" | Antes de devolver o de operar un canje (`GET /canjes/:code`, `usar`, `rechazar`, `cancelar`) y antes de cualquier listado de canjes (`GET /canjes`, `/customers/:id/canjes`, `/customers/me/canjes`), se vencen los `CONFIRMED` con `expires_at <= ahora` que la consulta va a tocar |
| Barrido | Cada **5 minutos** y una vez al iniciar el servidor. Toma todos los `CONFIRMED` con `expires_at <= ahora` |
| Cada canje | Una transacción, con `FOR UPDATE SKIP LOCKED`. Si otro proceso lo tiene tomado, lo saltea |
| Qué hace | `CONFIRMED` → `EXPIRED`, `resolvedAt = expiresAt`, `resolvedBy` = Sistema. Audita `REDEMPTION_EXPIRED` (Sistema). **No reintegra nada** |
| Idempotencia | Solo toma `CONFIRMED`: correr dos veces no duplica nada |
| Variable y comando | `REDEMPTIONS_EXPIRATION_CRON_ENABLED` (prendida por defecto, `false` en los e2e) y `npm run redemptions:expire` |

> **Render gratuito duerme el servidor** si no recibe pedidos. No importa: como se vence al leer, nadie ve un
> canje vencido como Confirmado ni puede usarlo.

**En la pantalla del Cliente:** cuando la cuenta regresiva llega a 0, vuelve a pedir la lista
(`GET /customers/me/canjes`) y el canje aparece "Vencido". No hay *polling* ni WebSockets.

---

### 3.12 Consultar canjes (US-45)

#### 3.12.1 `GET /api/customers/me/canjes` — Mis canjes (Cl)

| Query param | Tipo | Regla | UI |
|---|---|---|---|
| `status` | `RedemptionStatusGroup` | Sin valor = todos | "Estado": Todos · Confirmados · Finalizados |
| `fromDate` / `toDate` | `YYYY-MM-DD` | Inclusivos, por `createdAt`, en hora de Argentina. `fromDate > toDate` → `400` | "Fecha": Cualquiera · Hoy · Últimos 7 días · Este mes · Día específico (`fromDate = toDate`) · Rango |
| `order` | `desc` \| `asc` | Por defecto `desc` (por `createdAt`) | "Orden": Más recientes · Más antiguos |
| `page` / `limit` | | Por defecto `1` / `20`. La pantalla usa `limit=100` | |

**Respuesta `200`:** `{ items: Redemption[], total, page, limit }`, **sin** `customer`, `origin`,
`confirmedBy`, `resolvedBy`, `balanceBefore` ni `balanceAfter`; con `canCancel`.

**Pantalla** (Canjes → **Mis canjes**):

- Cada ítem: recompensa, badge de estado, "{dd/mm/aaaa hh:mm} · {n} pts" y "Ver detalle ▾" / "Ocultar
  detalle ▴". Los `CONFIRMED` se muestran abiertos y con borde destacado.
- **Detalle:**
  - `CONFIRMED`: el código grande, "Vence en {n} min", "Presentá este código en caja." y el botón **Cancelar
    canje**;
  - `USED`: "Usado el {fecha} a las {hora}" y "Se descontaron {n} pts";
  - `REJECTED`: "Motivo: {motivo}";
  - `CANCELLED`: "Cancelado el {fecha} a las {hora}";
  - `EXPIRED`: "Venció el {fecha} a las {hora}".
- **Nunca** se muestra qué empleado lo resolvió.
- Al pie: "Si un canje se cancela, se rechaza o vence, no se descuentan puntos. Lo podés volver a pedir si tenés
  puntos."
- **Vacío:** "Todavía no tenés canjes." (con filtros: "No hay canjes para los filtros elegidos.").
- Rango invertido: "La fecha "hasta" no puede ser anterior a "desde"." (no llama al backend).

#### 3.12.2 `GET /api/customers/:id/canjes` — Canjes para usar ahora (A, C)

- Devuelve **solo los `CONFIRMED` vigentes** del cliente, por `expiresAt` ascendente (el que vence primero,
  arriba). Ningún otro estado (decisión S4-10).
- Sin paginado. `Redemption[]` completo.
- `404` si el cliente no existe. Cliente dado de baja: lista vacía (sus canjes se rechazaron al darlo de baja).

**Pantalla** (Caja → Buscar cliente → "Ver canjes, recompensas y movimientos…"):

- Bloque **"Canjes para usar ahora"**: por canje, recompensa, puntos, "Código **{código}** · Vence en {n} min"
  y los botones **Rechazar** y **Registrar uso**.
- Vacío: "No tiene canjes para usar." (reemplaza el texto fijo "No tiene canjes." del Sprint 3).
- Bloque **"Recompensas a las que puede acceder"** ([3.5.2](#352-get-apirecompensasdisponibles--mostrador)):
  nombre, "{n} pts" y **Canjear**. Vacío: "No tiene puntos suficientes para ninguna recompensa disponible."; con
  saldo negativo: "El cliente tiene un ajuste pendiente: no puede canjear." (reemplaza el texto fijo del
  Sprint 3).
- El panel se actualiza cada vez que se abre y después de cada acción (no hay *polling*).

#### 3.12.3 `GET /api/canjes` — pantalla Canjes del Administrador

**Pantalla:** Administración → **Canjes** (`GestionCanjes.html`).

| Query param | Tipo | Regla | UI |
|---|---|---|---|
| `documentType` | `DocumentType` | Por defecto `DNI`. Solo se aplica si viene `documentNumber` | "Tipo doc.": DNI · Pasaporte |
| `documentNumber` | string (máx. 20) | Se normaliza igual que en clientes (sin puntos, espacios ni guiones, en mayúsculas). **Coincidencia parcial** (contiene), como en Auditoría | "N° de documento" (placeholder `38.456.123` o `AAB123456` según el tipo) |
| `code` | string (máx. 10) | Se normaliza; coincidencia parcial | "Código" |
| `rewardName` | string (máx. 80) | Parte del nombre del canje (snapshot), sin distinguir mayúsculas ni tildes. Encuentra también las recompensas dadas de baja | "Recompensa" (buscador, placeholder "Nombre de la recompensa") |
| `status` | `RedemptionStatus` | Sin valor = todos | "Estado": Todos · Confirmado · Utilizado · Cancelado · Rechazado · Vencido |
| `fromDate` / `toDate` | `YYYY-MM-DD` | Inclusivos, por `createdAt`, hora de Argentina. Un día concreto = `fromDate` y `toDate` iguales | "Fechas": calendario como el de Consumos, con "Limpiar" y "Listo". **Un día** elegido filtra ese día; **dos días**, el rango. Sin elegir: "Cualquier fecha" |
| `order` | `desc` \| `asc` | Por defecto `desc` | "Orden": Más recientes · Más antiguos |
| `page` / `limit` | | La pantalla usa `limit=10` | |

**Respuesta `200`:** `{ items: Redemption[], total, page, limit }` (completo).

- **Filtros:** se aplican con el botón **Filtrar**; mientras tanto, la etiqueta dice "Sin aplicar" (como en
  Consumos).
- **Columnas:** Código · Fecha y hora · Cliente (nombre y documento) · Recompensa · Puntos · Estado (badge) ·
  "Vence / resuelto" (con `CONFIRMED`: "Vence en {n} min"; con un estado final: fecha y hora y quién lo
  resolvió) · chevron (›). **Las filas no tienen botones** (decisión S4-19). Debajo del título: "Hacé clic en
  un canje para ver el detalle y aplicarlo o rechazarlo.".
- **Clic en la fila** abre el modal **"Canje {código}"**:
  - arriba, el badge del estado y, con `CONFIRMED`, "Vence en {n} min";
  - filas: Cliente · Documento · Recompensa · Puntos · Fecha y hora · Confirmado por (Cliente (app) o el
    empleado) · Vence, y según el estado:
    - `USED`: "Aplicado por" (con fecha y hora), "Puntos descontados: −{n} pts", "Saldo: {antes} → {después}
      pts";
    - `REJECTED`: "Rechazado por" (empleado o Sistema, con fecha y hora), "Motivo";
    - `CANCELLED`: "Cancelado por: El cliente, desde la app";
    - `EXPIRED`: "Vencido: Pasaron 15 minutos sin usarse (Sistema)";
  - botones de abajo: **Cerrar** y, solo con `CONFIRMED`, **Rechazar** y **Aplicar**. Cierran el modal y abren
    las ventanas de [3.10.2](#3102-pantalla-rechazar-canje) y [3.9.2](#392-pantallas).
- **Paginado:** "Mostrando 1–10 de N". **Vacío:** "No hay canjes para los filtros seleccionados."

---

### 3.13 Cambios en pantallas y endpoints existentes

#### 3.13.1 Baja de un cliente

`PATCH /api/customers/:id/deactivate` (solo Administrador desde el 25/10, decisión D-02) agrega, en la misma
transacción:

- rechaza los canjes `CONFIRMED` vigentes del cliente ([3.10.4](#3104-rechazos-automáticos-sistema)), motivo
  "Cliente dado de baja";
- a la auditoría `CUSTOMER_DEACTIVATED` le suma la fila "Canjes rechazados: {n}" (solo si `n > 0`).

#### 3.13.2 Movimientos de puntos

- El tipo `PointsMovement` agrega **`redemptionCode`** (string, nulo): el código del canje en los movimientos
  `REDEMPTION`.
- `description` del movimiento `REDEMPTION`: "Canje: {recompensa}".
- Texto del Cliente en su historial (ya en el prototipo): "Canjeaste {recompensa}".

#### 3.13.3 Navegación (decisiones del 25/10/2026)

| Pantalla | Cambio |
|---|---|
| Menú de Administración | Queda: **Recompensas** (habilitada) · **Canjes** (nueva) · Misiones (Próx.) · Clientes · Estadísticas y reportes (Próx.) · Auditoría · Consumos |
| Menú de Administración | **Salen** "Buscar cliente" y "Canjes por código" (el Administrador los usa desde **Caja**) y "Movimientos de puntos" |
| Menú de Caja | Buscar cliente · Nuevo cliente · **Canjes por código** (deja de decir "Próx.") |
| Ficha del cliente (Administrador) | "Registrar consumo" lleva a **Caja → Buscar cliente** con el documento cargado. La pestaña "Movimientos de puntos" muestra **todos** los movimientos paginados de a 10 y ya no tiene "Ver todos" |
| Barra del Cliente | La pestaña **Canjes** se habilita. Misiones sigue "Próx." |

Los prompts para el frontend están en `docs/sprint-4/PROMPT_MENU_ADMIN_SIN_CAJA.md` y
`docs/sprint-4/PROMPT_SACAR_MOVIMIENTOS_DE_PUNTOS.md`.

#### 3.13.4 Clientes del Administrador: filtro por documento

La pantalla **Clientes** (contrato del Sprint 3, §3.8.1) cambia el buscador "Buscar · Apellido, nombre o
documento" por **"Tipo de documento"** (DNI · Pasaporte) + **"Número de documento"**, como en Caja (decisión
S4-18). Se sigue filtrando mientras se escribe (con el *debounce* de 300 ms).

`GET /api/customers` agrega:

| Query param | Tipo | Regla |
|---|---|---|
| `documentType` | `DocumentType` | Por defecto `DNI`. Solo se aplica si viene `documentNumber` |
| `documentNumber` | string (máx. 20) | Normalizado (sin puntos, espacios ni guiones, en mayúsculas). **Coincidencia parcial**: `3522` encuentra `35222880` y `35222888` |

- `q` (nombre, apellido o documento) **queda en el backend** pero la pantalla deja de usarlo. `q` junto con
  `documentNumber` → `400` "No se puede buscar por q y por documento a la vez.".
- El filtro "Nivel" y el resto de la §3.8 del Sprint 3 no cambian.
- Placeholder del número: `38.456.123` (DNI) o `AAB123456` (Pasaporte).

---

### 3.14 Auditoría del Sprint 4

Rige todo lo de la §3.9 del contrato del Sprint 3: misma transacción, cliente nunca como actor, `details` como
`[{label, value}]` ya formateados, código de operación en `operationCode` **y** como primera fila de `details`.

#### 3.14.1 Qué se audita y qué no

| Operación | ¿Se audita? | Actor |
|---|---|---|
| Crear, editar, activar, desactivar, eliminar recompensa | Sí | Administrador |
| Deshabilitar o habilitar una recompensa | Sí | Sistema |
| Confirmar un canje **desde la caja** | Sí (`REDEMPTION_CONFIRMED`) | Cajero o Administrador |
| Confirmar un canje **desde la app** | **No** (decisión S4-6) | — |
| Registrar el uso | Sí | Cajero o Administrador |
| Rechazar (empleado) | Sí | Cajero o Administrador |
| Rechazar (automático) | Sí | Sistema |
| Cancelar (Cliente) | **No** | — |
| Vencer | Sí | Sistema |
| Consultas y listados | No | — |
| Intentos sin permiso (`403`) | No (decisión D-04 del 25/10) | — |

#### 3.14.2 `description` y `details` de cada acción

| Acción | UI del filtro | `description` (ejemplo) | `affectedCustomer` | `operationCode` | Filas de `details` (en orden) |
|---|---|---|---|---|---|
| `REWARD_CREATED` | Creó recompensa | Creó la recompensa "Medialunas x3" | — | — | Puntos · Stock ("Sin límite") · Vencimiento ("No vence") |
| `REWARD_UPDATED` | Editó recompensa | Editó la recompensa "Café + medialuna" | — | — | Una fila por campo que cambió: `{Campo}: {antes} → {después}` (Nombre, Descripción, Puntos, Stock, Vencimiento; vacío = "—", sin límite = "Sin límite", sin fecha = "No vence"). La fila "Foto" llega en el Sprint 5 |
| `REWARD_ACTIVATED` | Activó recompensa | Activó la recompensa "Licuado de estación" | — | — | Estado: Inactiva → Activa (o → Deshabilitada) |
| `REWARD_DEACTIVATED` | Desactivó recompensa | Desactivó la recompensa "Licuado de estación" | — | — | Estado: {antes} → Inactiva · Canjes rechazados: {n} (solo si `n > 0`) |
| `REWARD_DELETED` | **Eliminó recompensa** | Eliminó la recompensa "Brunch para dos" | — | — | Estado: {antes} → Dada de baja · Canjes rechazados: {n} (solo si `n > 0`) |
| `REWARD_DISABLED` | Deshabilitó recompensa | Deshabilitó la recompensa "Pizza libre viernes" | — | — | Motivo: Sin stock / Vencida |
| `REWARD_ENABLED` | Habilitó recompensa | Habilitó la recompensa "Café + medialuna" | — | — | Motivo: Stock repuesto / Fecha de vencimiento actualizada |
| `REDEMPTION_CONFIRMED` | Confirmó canje | Confirmó el canje de Sofía Ríos | Sí | código | Código del canje · Recompensa · Puntos (`400 pts`) |
| `REDEMPTION_USED` | Registró uso de canje | Registró el uso del canje de Carolina Fernández | Sí | código | Código del canje · Recompensa · Puntos descontados (`−150 pts`) · Saldo resultante (`1.090 pts`) |
| `REDEMPTION_REJECTED` | Rechazó canje | Rechazó el canje de Sofía Ríos | Sí | código | Código del canje · Recompensa · Motivo |
| `REDEMPTION_EXPIRED` | Venció canje | Venció el canje de Carolina Fernández | Sí | código | Código del canje · Recompensa |

> **Cambia respecto del contrato del Sprint 3** (§3.9.3): `REDEMPTION_USED` y `REDEMPTION_EXPIRED` ponen
> **primero** el código, como pide la regla general; la UI de `REWARD_DELETED` es "Eliminó recompensa"; el
> formato del código es el de [3.6.1](#361-código-de-canje--decisión-s4-5) (no `CJ-00412`).

---

### 3.15 Modelo de datos nuevo

Mismo estilo que el schema actual: modelos en inglés y PascalCase, columnas en `snake_case` con `@map`. Los
`CHECK` y los índices parciales se escriben **a mano en la migración** (y se verifica que estén).

#### `Reward` → tabla `rewards`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | `SERIAL` PK | No | |
| `name` | `VARCHAR(80)` | No | Índice único **parcial**: `UNIQUE (lower(trim(name))) WHERE status <> 'DELETED'` |
| `description` | `VARCHAR(255)` | Sí | |
| `points` | `INTEGER` | No | `CHECK (points BETWEEN 1 AND 1000000)` |
| `stock` | `INTEGER` | Sí | `NULL` = sin límite. `CHECK (stock IS NULL OR stock BETWEEN 0 AND 100000)` |
| `expires_at` | `DATE` | Sí | `NULL` = no vence |
| `status` | enum `RewardStatus` | No | Default `ACTIVE` |
| `disabled_reason` | enum `RewardDisabledReason` | Sí | `CHECK ((status = 'DISABLED') = (disabled_reason IS NOT NULL))` |
| `used_count` | `INTEGER` | No | Default `0`, `CHECK >= 0`. Suma 1 en cada uso |
| `created_at` / `updated_at` | `TIMESTAMP(3)` | No | |
| `deleted_at` | `TIMESTAMP(3)` | Sí | `CHECK ((status = 'DELETED') = (deleted_at IS NOT NULL))` |

Índices: `(status, expires_at)` (proceso diario), `(updated_at)`.

#### `Redemption` → tabla `redemptions`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | `SERIAL` PK | No | |
| `code` | `CHAR(6)` | No | `UNIQUE`. `CHECK (code ~ '^[A-HJ-NP-Z2-9]{6}$')` |
| `customer_id` | `INTEGER` FK → `customers` | No | `Restrict` |
| `reward_id` | `INTEGER` FK → `rewards` | No | `Restrict` |
| `reward_name` | `VARCHAR(80)` | No | Snapshot |
| `points` | `INTEGER` | No | Snapshot, `CHECK > 0` |
| `status` | enum `RedemptionStatus` | No | Default `CONFIRMED` |
| `origin` | enum `RedemptionOrigin` | No | |
| `confirmed_by_account_id` | `INTEGER` FK → `accounts` | Sí | `CHECK ((origin = 'COUNTER') = (confirmed_by_account_id IS NOT NULL))` |
| `confirmed_by_name` | `VARCHAR(161)` | Sí | Snapshot |
| `created_at` | `TIMESTAMP(3)` | No | |
| `expires_at` | `TIMESTAMP(3)` | No | `CHECK (expires_at = created_at + interval '15 minutes')` |
| `resolved_at` | `TIMESTAMP(3)` | Sí | `CHECK ((status = 'CONFIRMED') = (resolved_at IS NULL))` |
| `resolved_by_account_id` | `INTEGER` FK → `accounts` | Sí | `NULL` para Sistema y para `CANCELLED` |
| `resolved_by_name` | `VARCHAR(200)` | Sí | Snapshot o "Sistema". `NULL` en `CANCELLED` |
| `rejection_reason` | `VARCHAR(500)` | Sí | `CHECK ((status = 'REJECTED') = (rejection_reason IS NOT NULL))` |
| `balance_before` / `balance_after` | `INTEGER` | Sí | `CHECK`: con valor solo en `USED` (y obligatorios ahí) |

Índices: `(customer_id, created_at)`, `(status, expires_at)` (vencimiento), `(reward_id, status)`
(`confirmedCount`), `(created_at)`.

#### Cambios en tablas existentes

| Tabla | Cambio |
|---|---|
| `points_movements` | Columna `redemption_id INTEGER FK → redemptions NULL`. `CHECK ((type = 'REDEMPTION') = (redemption_id IS NOT NULL))`. **Antes de la migración**, verificar que no haya filas `REDEMPTION` viejas (de seeds); si las hay, borrarlas en desarrollo |
| Enums | Nuevos: `RewardStatus`, `RewardDisabledReason`, `RedemptionStatus`, `RedemptionOrigin`. `CatalogFilter` y `RedemptionStatusGroup` existen solo en la API |

#### Relaciones

```
Reward     1 ── 0..N Redemption
Customer   1 ── 0..N Redemption
Redemption 1 ── 0..1 PointsMovement (REDEMPTION, solo si se usó)
Account    1 ── 0..N Redemption (confirmó / resolvió)
```

---

## 4. Información general

Igual que en el Sprint 3 (URL base, JSON, Bearer, `forbidNonWhitelisted`, fechas, paginado). Agrega:

| | |
|---|---|
| **Hora de Argentina** | El vencimiento de una recompensa (`DATE`) y los filtros por día se interpretan en UTC−03:00, igual que la auditoría |
| **Procesos automáticos** | Tres con `@nestjs/schedule` (ya instalado por US-25): puntos (00:05, US-25), recompensas vencidas (00:05) y canjes vencidos (cada 5 min) |

**Matriz de permisos (filas nuevas):**

| Endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/recompensas`, `/recompensas/:id` (`GET`, `POST`, `PATCH`, `…/activar`, `…/desactivar`, `…/eliminar`) | Sí | No | No |
| `GET /recompensas/disponibles` | Sí | Sí | No |
| `/customers/me/recompensas`, `/customers/me/canjes`, `…/cancelar` | No | No | Sí |
| `POST /customers/:id/canjes`, `GET /customers/:id/canjes` | Sí | Sí | No |
| `GET /canjes` | Sí | **No** | No |
| `GET /canjes/:code`, `PATCH /canjes/:code/usar`, `PATCH /canjes/:code/rechazar` | Sí | Sí | No |
| `PATCH /customers/:id`, `PATCH /customers/:id/deactivate` | Sí | **No** (D-02, 25/10) | No |

> **Orden de las rutas:** `/customers/me/…` antes que `/customers/:id/…`, y `/recompensas/disponibles`
> antes que `/recompensas/:id` (si no, Nest toma la palabra como id y responde
> `400`).

---

## 5. Convenciones de respuestas y errores nuevos

Mismo formato de error que el Sprint 3 (`statusCode`, `error`, `message`, `path`, `timestamp`, `code`,
`details`). **El frontend decide por `code`.**

**Éxito:**

| Operación | Código | Cuerpo |
|---|---|---|
| Consultas | `200` | El recurso o `{ items, total, page, limit }` |
| `POST /recompensas`, `POST …/canjes` | `201` | `Reward` / `{ redemption }` |
| `PATCH /recompensas/:id` | `200` | `{ reward, availabilityChange }` |
| `…/activar` | `200` | `{ reward }` |
| `…/desactivar` | `200` | `{ reward, rejectedRedemptions }` |
| `…/eliminar` | `200` | `{ rejectedRedemptions }` |
| `…/usar` | `200` | `{ redemption, balanceBefore, balanceAfter }` |
| `…/rechazar`, `…/cancelar` | `200` | `{ redemption }` |

**Códigos de error nuevos:**

| HTTP | `code` | Cuándo | Mensaje |
|---|---|---|---|
| 409 | `REWARD_NAME_IN_USE` | Nombre repetido entre las no dadas de baja | "Ya existe una recompensa con ese nombre." |
| 409 | `STOCK_BELOW_CONFIRMED` | Stock menor que los canjes confirmados vigentes | "El stock no puede ser menor a los {n} canjes confirmados." |
| 409 | `INVALID_REWARD_STATUS` | Activar una que no está Inactiva, o desactivar una que ya lo está | "La recompensa no está inactiva." / "La recompensa ya está inactiva." |
| 409 | `REWARD_NOT_AVAILABLE` | Confirmar o usar con la recompensa no disponible | Confirmar: "La recompensa ya no está disponible." · Usar: "La recompensa ya no está disponible. Podés rechazar el canje." |
| 409 | `REDEMPTION_NOT_CONFIRMED` | Usar, rechazar o cancelar un canje que ya no está Confirmado | 'El canje ya está en estado "{Estado}".' (Cliente: "El canje ya no se puede cancelar.") |
| 409 | `REDEMPTION_EXPIRED` | Usar, rechazar o cancelar un canje que venció | "El canje venció. El cliente tiene que pedirlo de nuevo." (Cliente: "El canje ya venció.") |

**Existentes que se usan con un caso nuevo:**

| HTTP | `code` | Caso nuevo | Mensaje |
|---|---|---|---|
| 409 | `INSUFFICIENT_BALANCE` | Registrar el uso sin saldo suficiente o con saldo negativo | "El cliente no tiene saldo suficiente para este canje. Podés rechazarlo." |
| 409 | `CUSTOMER_INACTIVE` | Confirmar o usar un canje de un cliente dado de baja | "El cliente está dado de baja." |

**`404` sin `code`:** "No existe la recompensa.", "Código no encontrado." (empleados) y "No existe el canje."
(Cliente).

---

## 6. Códigos HTTP

Igual que en el Sprint 3. Casos nuevos:

| Código | Casos nuevos |
|---|---|
| `400` | Validaciones de recompensa, motivo del rechazo, filtros de fecha invertidos, `q` junto con `documentNumber` en Clientes |
| `404` | Recompensa inexistente o dada de baja; código de canje inexistente o mal escrito; canje de otro cliente |
| `409` | Nombre repetido, stock menor que los confirmados, estado de recompensa incompatible, recompensa no disponible, canje no Confirmado o vencido, saldo insuficiente al usar |

---

## 7. Cambios respecto del Sprint 3

| # | Dónde | Antes | Ahora |
|---|---|---|---|
| 1 | Panel del cliente en Caja | "No tiene canjes." y "No tiene puntos suficientes…" fijos | Datos reales ([3.12.2](#3122-get-apicustomersidcanjes--canjes-para-usar-ahora-a-c)) |
| 2 | `PATCH /customers/:id/deactivate` | Solo daba de baja al cliente y su cuenta | Además rechaza sus canjes Confirmados. Solo Administrador (D-02) |
| 3 | `PATCH /customers/:id` | Administrador y Cajero | Solo Administrador (D-02). Sin documento (D-03) |
| 4 | `PointsMovement` | Sin canjes | `REDEMPTION` con `redemptionCode` |
| 5 | Auditoría | Módulo Recompensas "(Próximamente)"; código `CJ-00412`; `REDEMPTION_USED` con el código en la segunda fila | Recompensas habilitado; código de 6 caracteres; código siempre primero; "Eliminó recompensa" |
| 6 | Menú de Administración | 8 opciones con Buscar cliente y Movimientos de puntos | 7 opciones ([3.13.3](#3133-navegación-decisiones-del-25102026)) |
| 7 | Menú de Caja | "Gestionar canje por código" deshabilitado | "Canjes por código" habilitado |
| 8 | Vista del Cliente | Pestaña Canjes "Próx."; tarjeta "Próximamente" en Inicio | Pestaña habilitada; tarjeta "Recompensas" y aviso de canje para usar |
| 9 | Procesos automáticos | Uno (US-25) | Tres (+ recompensas vencidas y canjes vencidos) |
| 10 | `GET /customers` y pantalla Clientes | Buscador "Apellido, nombre o documento" (`q`) | Tipo + número de documento (`documentType`, `documentNumber`) |

---

## 8. Observaciones

### 8.1 Diferencias del prototipo que este contrato corrige

El prototipo del Sprint 4 se armó con este contrato en mente, así que hay pocas.

| # | Prototipo | Contrato |
|---|---|---|
| 1 | El prototipo valida el saldo al confirmar dentro de su "store" de datos | Es justamente la validación **de pantalla** (decisión S4-2). El backend no valida saldo al confirmar |
| 2 | El prototipo tiene datos de ejemplo que podrían traer foto | En el Sprint 4 ninguna recompensa tiene foto ([3.3](#33-foto-de-la-recompensa-sprint-5)) |
| 3 | Los canjes de ejemplo vencen 15 minutos después de **abrir el archivo** | En la app, 15 minutos después de confirmar |
| 4 | El vencimiento del prototipo corre cada 5 segundos | Al leer + barrido cada 5 minutos ([3.11](#311-vencimiento-automático-del-canje-us-44)) |
| 5 | La lógica vieja de canjes de `pagina-principal.html` (estado "Pendiente", 30 minutos, reintegros) sigue en el código del prototipo, sin uso | **Ignorarla.** Las pantallas buenas son los componentes `Recompensas`, `GestionCanjes`, `CanjePorCodigo`, `CanjeAccion` y `ClienteCanjes` |

### 8.2 Reglas de negocio que el backend tiene que garantizar (no solo la pantalla)

- **Confirmar no descuenta.** Ningún endpoint fuera de `usar` toca saldo, lotes, movimientos o stock.
- **Usar valida de verdad:** vencimiento, estado, cliente activo, recompensa disponible y saldo real, con
  bloqueos y en una transacción.
- **Sin reintegros:** no existe ningún movimiento de devolución.
- **El canje conserva sus puntos:** se descuenta `redemption.points`, aunque la recompensa haya cambiado de
  precio.
- **El nivel no baja por canjear:** `lifetimePoints` no cambia.
- **Stock:** nunca negativo; nunca menor que los confirmados vigentes al editar; `null` no se descuenta.
- **El Cliente solo opera sus canjes** (por el token). Nunca recibe `resolvedBy` ni datos de empleados.
- **Vencido es vencido:** no se puede usar, rechazar ni cancelar un canje con `expiresAt` pasado, aunque el
  barrido todavía no lo haya marcado.
- **Auditoría y movimientos inalterables**, como en el Sprint 3.

### 8.3 Decisiones del Sprint 4

| # | Tema | Decisión | Quién / cuándo |
|---|---|---|---|
| S4-1 | Cuándo se descuentan puntos y stock | **Opción B:** al registrar el uso. Confirmar no descuenta; cancelar, rechazar y vencer no reintegran | Deni, 25/10 (`DECISIONES_PO_2026-10-25.md`, CANJE) |
| S4-2 | Validación del saldo al confirmar | **Solo en la pantalla**, con el saldo que ya tiene cargado, para no ir a la base a cada rato. La validación real es al usar. Reemplaza la regla 2 de CANJE de `DECISIONES_PO_2026-10-25.md` (saldo y stock "disponibles"), que **queda sin efecto** | Deni, 25/10 (respuesta 18 del prompt del prototipo) |
| S4-3 | Plazo del canje | **15 minutos** desde que se confirma, constante | Deni, 25/10 |
| S4-4 | Cómo vence | Al leer + barrido cada 5 min + al iniciar (máquina de estados v1.0) | Máquina v1.0; Deni, 25/10 |
| S4-5 | Código del canje | 6 caracteres sin 0/O/1/I, aleatorio, único; con él se sabe el cliente y la recompensa. Se escribe a mano | Deni, 25/10 (respuesta 11) |
| S4-6 | Auditoría del canje confirmado por el Cliente | No se audita la confirmación desde la app; sí desde la caja. El uso se audita a nombre del Cajero | Regla #4 de auditoría (Sprint 3); cierra D-27 del borrador |
| S4-7 | Dónde se registra el uso | Desde el panel del cliente en Caja **y** desde "Canjes por código" (sección propia, un solo buscador) | Deni, 25/10 (respuesta 12) |
| S4-8 | Recompensa desactivada o eliminada, o cliente dado de baja | Sus canjes Confirmados pasan a Rechazados (Sistema) y la pantalla avisa antes | Deni, 25/10 (respuestas 7 y 8; máquina v1.0) |
| S4-9 | Activar una recompensa sin stock o vencida | Se activa, pero queda Deshabilitada y avisa | Deni, 25/10 (respuesta 7) |
| S4-10 | Qué canjes ve el Cajero de un cliente | Solo los Confirmados vigentes | Deni, 25/10 (respuesta 20) |
| S4-11 | Quién aplica y rechaza | Cajero y Administrador. Rechazar pide motivo (5 a 500) con motivos rápidos | Deni, 25/10 (respuestas 13 y 14) |
| S4-12 | Campos de la recompensa | Foto (opcional, **Sprint 5**: S4-17), nombre (1–80, único), descripción (≤ 255), puntos (1–1.000.000), stock (opcional; vacío = sin límite; 1–100.000) y vencimiento (opcional; vacío = no vence) | Deni, 25/10 (respuestas 1 a 3) |
| S4-13 | Estado final de la recompensa | "Dada de baja"; el botón dice "Eliminar" | Deni, 25/10 (respuesta 5) |
| S4-14 | Stock y puntos al editar | El stock no baja de los confirmados; cambiar los puntos no afecta lo confirmado | Deni, 25/10 (respuesta 6) |
| S4-15 | Filtros | Catálogo: Todas · Más canjeadas (por Utilizados) · Próx. a vencer (≤ 7 días). Mis canjes: estado + fecha (día o rango) + orden | Deni, 25/10 (respuestas 17 y 21) |
| S4-16 | Navegación | Buscar cliente y Canjes por código solo en Caja; Movimientos de puntos fuera de Administración (se ven en la ficha y en Auditoría) | Deni, 25/10 |
| S4-17 | Foto de la recompensa | Pasa al **Sprint 5**. En el Sprint 4 el campo dice "Próximamente" y todas usan la imagen genérica | Deni, 27/10 |
| S4-18 | Buscadores de cliente | En Canjes (Administrador) y en Clientes: tipo de documento + número de documento, como en Caja. Sin búsqueda por nombre | Deni, 27/10 |
| S4-19 | Acciones de las filas | Recompensas y Canjes no tienen botones en la fila: un clic abre el modal (edición o detalle) con las acciones abajo. En Recompensas el botón es "Confirmar cambios" | Deni, 27/10 |
| S4-20 | Filtros de Canjes | Recompensa por nombre (buscador, sin lista). Fechas con calendario: un día o un rango | Deni, 27/10 |

### 8.4 Implementación sugerida

- **Módulos nuevos:**
  - `rewards`: catálogo, estados y proceso de vencidas (la foto se suma en el Sprint 5).
  - `redemptions`: canjes, código, vencimiento, uso, rechazo y cancelación.
- **Dependencias entre módulos** (sin ciclos):
  - `redemptions` usa `RewardsService` (bloquear, verificar disponibilidad, descontar stock) y
    `PointsService.canjear` dentro de la transacción ambiente (`PrismaTransactionRunner`), como `consumptions`.
  - `rewards` **no** importa `redemptions`. Para rechazar los confirmados al desactivar o eliminar, publica
    `reward.deactivated` / `reward.deleted` dentro de su transacción; `redemptions` escucha y rechaza
    (`emitAsync`, para que el total vuelva en `rejectedRedemptions`).
  - Lo mismo con `customer.deactivated`, que ya existe: `redemptions` lo escucha.
  - `confirmedCount`: `rewards` lo pide por un puerto de lectura que implementa `redemptions`, o con una
    subconsulta en el repositorio. Elegir uno y documentarlo.
- **`PointsService.canjear(customerId, points, { redemptionId, code, rewardName }, performedBy)`:** FIFO sobre
  lotes `ACTIVE`; `INSUFFICIENT_BALANCE` si `balance < points` o hay deuda; movimiento `REDEMPTION`; no toca
  `lifetimePoints`; devuelve `{ balanceBefore, balanceAfter }`.
- **Hora:** una función única "hoy en Argentina" (ya existe para auditoría) para `daysToExpire`, disponibilidad
  y filtros.
- **Tests e2e mínimos:**
  - Confirmar desde la app (sin auditoría) y desde la caja (con auditoría); recompensa no disponible.
  - Confirmar con saldo insuficiente → `201` (el backend no valida saldo) y después `usar` → `409
    INSUFFICIENT_BALANCE`, con el canje todavía `CONFIRMED`.
  - Usar: descuenta FIFO, `REDEMPTION` con código, `lifetimePoints` igual, stock −1, `REWARD_DISABLED` al
    llegar a 0, stock `null` no cambia.
  - Dos `usar` en paralelo sobre el mismo código: uno `200`, otro `409`.
  - Dos canjes de dos clientes sobre la última unidad: el primero que se usa gana; el segundo, `409
    REWARD_NOT_AVAILABLE`.
  - Vencer al leer (con `expires_at` forzado al pasado): `GET`, `usar`, `rechazar` y `cancelar`.
  - Barrido idempotente.
  - Rechazar con y sin motivo; cancelar propio y ajeno (`404`).
  - Desactivar y eliminar con confirmados: se rechazan como Sistema y se audita.
  - Baja de cliente con confirmados.
  - Editar: stock menor que los confirmados (`409`), reponer stock habilita, nombre repetido (`409`), nombre de
    una dada de baja (`201`).
  - Activar sin stock → queda `DISABLED`.
  - Proceso diario de vencidas.
  - `GET /canjes` con `documentType` + `documentNumber` parcial, `rewardName` (incluye una dada de baja) y un día concreto (`fromDate = toDate`).
  - `GET /customers` con `documentNumber` parcial y con `q` + `documentNumber` (`400`).
  - Permisos: Cajero en `/recompensas` y `GET /canjes` → `403`; Cliente en `/canjes/:code` → `403`; `403` sin
    auditoría.

---

## 9. Resumen por historia

> Los textos de US-43 y US-44 en el backlog todavía dicen "reintegrando puntos y reponiendo stock". Con la
> opción B no hay reintegro: hay que corregirlos en la Definición del Producto y en el Seguimiento (ver
> [10](#10-pendientes), PD-5).

| US | Título | RF | Endpoints | Pantallas |
|---|---|---|---|---|
| US-34 | Crear recompensa (sin foto: Sprint 5) | RF-038 | `POST /recompensas`, `GET /recompensas` | Recompensas → "+ Crear recompensa" |
| US-35 | Editar recompensa | RF-039 | `GET`/`PATCH /recompensas/:id` | Recompensas → clic en la fila → Confirmar cambios |
| US-36 | Activar / desactivar recompensa | RF-040 | `PATCH …/activar`, `PATCH …/desactivar` | Recompensas → clic en la fila → Activar / Desactivar |
| US-37 | Deshabilitar / habilitar automáticamente (sin stock o vencida) | RF-041 | Reglas de [3.4](#34-disponibilidad-automática-us-37) y proceso diario | Etiquetas "Agotada" / "Vencida", Auditoría |
| US-38 | Eliminar recompensa (baja lógica) | RF-042 | `PATCH …/eliminar` | Recompensas → clic en la fila → Eliminar |
| US-39 | Consultar catálogo de recompensas | RF-043 | `GET /customers/me/recompensas` | Cliente → Canjes → Catálogo; Inicio |
| US-40 | Confirmar canje (Cliente desde la app, o Cajero en su nombre) | RF-044 | `POST /customers/me/canjes`, `POST /customers/:id/canjes`, `GET /recompensas/disponibles` | Modal Confirmar canje y "¡Canje confirmado!"; Caja → panel → Canjear |
| US-41 | Canjes por código | RF-045 | `GET /canjes/:code` | Caja → Canjes por código |
| US-42 | Registrar uso del canje | RF-046 | `PATCH /canjes/:code/usar`, `GET /customers/:id/canjes` | Caja → panel → Registrar uso; Canjes por código → Aplicar; Canjes (Admin) → Aplicar |
| US-43 | Rechazar (Cajero/Administrador) o cancelar (Cliente) | RF-047 | `PATCH /canjes/:code/rechazar`, `PATCH /customers/me/canjes/:code/cancelar` | Ventana "Rechazar canje"; Mis canjes → Cancelar canje |
| US-44 | Vencer canje automáticamente | RF-048 | Proceso de [3.11](#311-vencimiento-automático-del-canje-us-44) | Cuenta regresiva; estado "Vencido"; Auditoría |
| US-45 | Consultar canjes | RF-049 | `GET /customers/me/canjes`, `GET /customers/:id/canjes`, `GET /canjes` | Mis canjes; panel de Caja; Canjes (Admin) → clic en la fila |
| — | Ajustes de navegación (25/10) | — | Ninguno | Menús de Administración y Caja, ficha del cliente |
| — | Filtro por documento en Clientes (27/10, ajuste de CLI-ADM) | RF-017 | `GET /customers` | Clientes |

---

## 10. Pendientes

**Nada de esta lista bloquea el sprint.**

| # | Pendiente | Bloquea | Propuesta |
|---|---|---|---|
| PD-1 | ~~Dónde se guardan las fotos~~ | — | **Cerrado para el Sprint 4:** la foto pasa al Sprint 5 (S4-17). Se decide en el Planning del 5 |
| PD-2 | **Foto de perfil del Cliente** (decisión #9 del 17/10 la ponía en el Sprint 4) | Nada | Pasa al Sprint 5 junto con la foto de la recompensa (mismo almacenamiento) |
| PD-3 | `GET /movimientos-de-puntos` quedó sin pantalla | Nada | Mantenerlo hasta las estadísticas del Sprint 5 y decidir ahí |
| PD-4 | La máquina de estados "Canje" de la Definición del Producto asigna `confirmarCanje()` a US-41 | Nada (solo docs) | Pasarlo a US-40 (confirmar) y dejar US-41 como "Canjes por código". Agregar el actor Sistema a `rechazar()` |
| PD-5 | Textos de US-43 y US-44 en el backlog ("reintegrando puntos y reponiendo stock") y RF del Story Map del Seguimiento (dice RF-037 a RF-048) | Nada (solo docs) | Corregir con la opción B y con los RF de la tabla de la [9](#9-resumen-por-historia) |
| PD-6 | ¿Avisar al Cliente cuando un canje suyo se rechaza? | Nada | Sin notificación en este sprint (las notificaciones son del Sprint 5); lo ve en Mis canjes |
