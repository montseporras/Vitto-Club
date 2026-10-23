# Contrato de API — Sprint 3 · Vitto Club

> **Alcance:** todo lo que el backend tiene que exponer para el Sprint 3, armado a partir del prototipo
> *Vitto Club Prototipo v2* (export de Claude Design del 17/10/2026), de la rama `develop` del repo
> (`schema.prisma`, `docs/`) y de la rama `feature/SCRUM-161-registrar-auditoria`.
>
> **Historias:** US-19, US-21, US-22, US-23, US-24, US-25, US-26, US-27, US-46. Además:
> - **Auditoría** (US-57 / US-58): cambia completa. Va detallada como ítem aparte en la [sección 3.9](#39-auditoría-ítem-aparte).
> - **Pantalla de Clientes del Administrador**: quedó pendiente del Sprint 2.
> - **Perfil del Cliente** y **cerrar sesión**.
> - **Todos los cambios de contraseña.**
>
> **Versión 2 (17/10/2026):** incorpora las 12 decisiones de la [sección 8.3](#83-decisiones-tomadas-17102026).
>
> **Lo que ya existe y no cambia** está en el otro archivo (`VERIFICACION_SPRINTS_1_2.md`), junto con
> lo que hay que corregir de lo hecho.

**Convenciones de este documento**

- Las decisiones que el prototipo no resolvía están tomadas en [8.3](#83-decisiones-tomadas-17102026) y se
  citan en el texto como "decisión #N".
- "UI" es el texto que muestra el prototipo. "API" es el valor que viaja en el JSON.
- En la UI la operación se llama **Consumo**, nunca "Compra". En el código, la entidad es `Consumption`.
- **Máquinas de estado:** los nombres de los estados y las transiciones salen de la sección 9 ("Diagramas de Transición de Estados") de la *Definición del Producto - Vitto Club - Grupo 11*. Todo enum de estado de este contrato tiene que coincidir con esos nombres: Canje (Confirmado, Utilizado, Rechazado, Cancelado, Vencido; **no existe "Pendiente"**), Movimiento de puntos o lote (Vigente, Consumido, Vencido, Anulado), Recompensa (Activa, Deshabilitada, Inactiva, Eliminada) y Misión mensual (En progreso, Completada, Reclamada, Vencida).

---

## Tabla de contenido

1. [Resumen de endpoints](#1-resumen-de-endpoints)
2. [Enumerados](#2-enumerados)
3. [Endpoints](#3-endpoints)
   - [3.1 Registrar consumo (US-21, US-46)](#31-registrar-consumo-us-21-us-46)
   - [3.2 Anular consumo (US-22)](#32-anular-consumo-us-22)
   - [3.3 Consultar consumos (US-23)](#33-consultar-consumos-us-23)
   - [3.4 Puntos del cliente y ficha (US-19, US-46)](#34-puntos-del-cliente-y-ficha-us-19-us-46)
   - [3.5 Ajustar puntos (US-24)](#35-ajustar-puntos-us-24)
   - [3.6 Movimientos de puntos (US-26) y vencimiento automático (US-25)](#36-movimientos-de-puntos-us-26-y-vencimiento-automático-us-25)
   - [3.7 Configurar niveles (US-27)](#37-configurar-niveles-us-27)
   - [3.8 Clientes del Administrador (pendiente del Sprint 2)](#38-clientes-del-administrador-pendiente-del-sprint-2)
   - [3.9 Auditoría (ítem aparte)](#39-auditoría-ítem-aparte)
   - [3.10 Vista del Cliente: inicio, historial, perfil y cerrar sesión](#310-vista-del-cliente-inicio-historial-perfil-y-cerrar-sesión)
   - [3.11 Cambios de contraseña](#311-cambios-de-contraseña)
   - [3.12 Modelo de datos nuevo](#312-modelo-de-datos-nuevo)
4. [Información general](#4-información-general)
5. [Convenciones de respuestas](#5-convenciones-de-respuestas)
6. [Códigos HTTP](#6-códigos-http)
7. [Cambios respecto del Sprint 2](#7-cambios-respecto-del-sprint-2)
8. [Observaciones](#8-observaciones)
9. [Resumen por historia](#9-resumen-por-historia)

---

## 1. Resumen de endpoints

Todas las rutas cuelgan de `/api`. **A** = Administrador, **C** = Cajero, **Cl** = Cliente.

### Nuevos

| # | Método | Ruta | Roles | Para qué | Historia |
|---|---|---|---|---|---|
| 1 | `GET` | `/consumos/preview` | A, C | Calcular puntos y saldo resultante antes de registrar (vista previa en vivo) | US-21 |
| 2 | `POST` | `/consumos` | A, C | Registrar consumo y acreditar puntos | US-21 |
| 3 | `GET` | `/consumos` | **A** | Listado de consumos con filtros y totales | US-23 |
| 4 | `GET` | `/consumos/:code` | **A** | Detalle de un consumo | US-23 |
| 5 | `PATCH` | `/consumos/:code/anular` | A, C | Anular un consumo (cajero: solo propio y dentro de 24 h) | US-22 |
| 6 | `GET` | `/customers/:id/consumos` | A, C | Consumos de un cliente (cajero: solo últimas 24 h) | US-22, US-23 |
| 7 | `GET` | `/customers/:id/puntos` | A, C | Saldo, nivel, acumulados y próximos vencimientos | US-19, US-46 |
| 8 | `GET` | `/customers/:id/movimientos` | A, C | Movimientos de un cliente (cajero: solo últimas 24 h) | US-26 |
| 9 | `POST` | `/customers/:id/ajustes-de-puntos` | **A** | Sumar o restar puntos con motivo | US-24 |
| 10 | `GET` | `/movimientos-de-puntos` | **A** | Movimientos de todos los clientes, con filtros | US-26 |
| 11 | `GET` | `/loyalty/configuration/levels` | **A** | Umbrales de niveles vigentes | US-27 |
| 12 | `PUT` | `/loyalty/configuration/levels` | **A** | Modificar umbrales de Plata y Oro | US-27 |
| 13 | `GET` | `/auditoria/actores` | **A** | Opciones del filtro "Realizado por" | US-58 |
| 14 | `GET` | `/customers/me` | **Cl** | Mi perfil (datos fijos y de contacto) | US-59* |
| 15 | `PATCH` | `/customers/me` | **Cl** | Editar teléfono, correo y fecha de nacimiento | US-59* |
| 16 | `GET` | `/customers/me/puntos` | **Cl** | Inicio: saldo, nivel, acumulados, vencimientos | US-19 |
| 17 | `GET` | `/customers/me/consumos` | **Cl** | Historial de consumos | US-23 |
| 18 | `GET` | `/customers/me/movimientos` | **Cl** | Historial de puntos | US-26 |
| 19 | `PATCH` | `/mi-cuenta/password` | A, C, Cl | Cambiar mi propia contraseña | US-59* |

\* US-59 es la historia nueva de "Mi perfil" (ver [sección 9](#9-resumen-por-historia)).

### Existentes que cambian en este sprint

| Método | Ruta | Qué cambia |
|---|---|---|
| `GET` | `/auditoria` | Filtros, forma de la respuesta y qué se registra ([3.9](#39-auditoría-ítem-aparte)) |
| `GET` | `/customers` | Nuevos parámetros `q`, `level` y `sort`; cada ítem trae `balance`, `lifetimePoints` y `level` ([3.8](#38-clientes-del-administrador-pendiente-del-sprint-2)) |
| `PATCH` | `/customers/:id` | Nuevo campo `reason`, obligatorio para el Administrador; deja de aceptarse sobre clientes inactivos de forma definitiva ([3.8](#38-clientes-del-administrador-pendiente-del-sprint-2)) |
| `GET` / `PUT` | `/loyalty/configuration` y `/current` | El snapshot incluye `silverMinPoints` y `goldMinPoints` ([3.7](#37-configurar-niveles-us-27)) |
| `PATCH` | `/usuarios/:id` | Al cambiar la contraseña del empleado se cierran todas sus sesiones ([3.11](#311-cambios-de-contraseña)) |
| `PATCH` | `/usuarios/:id/reactivate` | **Se mantiene** (la reactivación de usuarios sigue existiendo). Se audita y controla que el email no esté en uso por otra cuenta activa ([3.11.4](#3114-reactivación-de-usuarios-de-empleados)) |
| `POST` | `/customers` | El alta por Cajero o Administrador **crea también la cuenta del cliente**, con contraseña inicial = número de documento ([3.11.3](#3113-contraseña-inicial-del-cliente-cargado-en-caja-y-cambio-obligatorio)) |
| `POST` | `/auth/login` y `/auth/refresh` | El `user` agrega `mustChangePassword` ([3.11.3](#3113-contraseña-inicial-del-cliente-cargado-en-caja-y-cambio-obligatorio)) |
| `POST` | `/auth/logout` | Sin cambios de contrato; se documenta el uso desde el perfil del Cliente ([3.10](#310-vista-del-cliente-inicio-historial-perfil-y-cerrar-sesión)) |

### Existentes que se eliminan

| Método | Ruta | Motivo |
|---|---|---|
| `PATCH` | `/customers/:id/activate` | No existe la reactivación de clientes ni de empleados (decisión de Deni). La de **usuarios** sí se mantiene |

---

## 2. Enumerados

Los valores de API van en inglés y mayúsculas, como los enums que ya existen (`DNI`, `ADMIN`, `PERCENTAGE`).
La pantalla traduce con la columna "UI".

### 2.1 Existentes (sin cambios)

| Enum | Valores API | UI |
|---|---|---|
| `DocumentType` | `DNI`, `PASSPORT` | DNI, Pasaporte |
| `EmployeeRole` | `ADMIN`, `CASHIER` | Administrador, Cajero |
| `AccountRole` | `ADMIN`, `CASHIER`, `CUSTOMER` | Administrador, Cajero, Cliente |
| `FirstConsumptionBonusType` | `PERCENTAGE`, `FIXED_AMOUNT` | Porcentaje, Puntos fijos |

### 2.2 Nuevos

#### `ConsumptionStatus` — estado del consumo

| API | UI | Significado |
|---|---|---|
| `REGISTERED` | Registrado | Vigente; sus puntos están acreditados |
| `VOIDED` | Anulado | Se anuló; sus puntos se revirtieron. **Estado final**: no vuelve a `REGISTERED` |

#### `Level` — nivel de fidelización

Los tres niveles son fijos: no se crean, no se borran ni se renombran.

| API | UI | Orden |
|---|---|---|
| `BRONZE` | Bronce | 1 (desde 0, fijo) |
| `SILVER` | Plata | 2 |
| `GOLD` | Oro | 3 |

#### `PointsMovementType` — tipo de movimiento de puntos

| API | UI (Administrador, filtro y badge) | Signo | Lo genera | Sprint |
|---|---|---|---|---|
| `CONSUMPTION_CREDIT` | Acreditación por consumo | + | Registrar consumo | 3 |
| `VOID_REVERSAL` | Reversión por anulación | − | Anular consumo | 3 |
| `MANUAL_ADJUSTMENT` | Ajuste manual | + o − | Ajustar puntos (Administrador) | 3 |
| `EXPIRATION` | Vencimiento | − | Proceso automático (Sistema) | 3 |
| `REDEMPTION` | Canje | − | Registrar uso de canje | 4 (el valor ya existe para el filtro) |

Texto que ve el Cliente en su historial, por tipo (lo arma el frontend):

| Tipo | Texto |
|---|---|
| `CONSUMPTION_CREDIT` | "Sumaste {n} pts por tu consumo" |
| `VOID_REVERSAL` | "Se descontaron {n} pts por la anulación de un consumo" |
| `MANUAL_ADJUSTMENT` | "Ajuste del restaurante" |
| `EXPIRATION` | "Se vencieron {n} pts" |
| `REDEMPTION` | "Canjeaste {recompensa}" |

#### `PointsLotStatus` — estado de un lote de puntos

Sale de la máquina de estados *Movimiento de puntos* (Definición del Producto, sección 9).

| API | UI | Significado |
|---|---|---|
| `ACTIVE` | Vigente | Tiene saldo disponible y no venció |
| `CONSUMED` | Consumido | Saldo del lote en 0 |
| `EXPIRED` | Vencido | Llegó a su fecha de vencimiento con saldo; el saldo restante se venció entero |
| `VOIDED` | Anulado | Se anuló el consumo que lo creó. **Estado final**. Lo dispara solo US-22 (anular consumo) |

#### `AdjustmentDirection`

| API | UI |
|---|---|
| `ADD` | Sumar |
| `SUBTRACT` | Restar |

#### `AuditModule`, `AuditAction` y `AuditActorType`

Están en la [sección 3.9.2](#392-enumerados-de-auditoría), junto con el resto de la auditoría.

---

## 3. Endpoints

### 3.1 Registrar consumo (US-21, US-46)

**Pantalla:** "Buscar cliente". Es la primera opción del menú del Cajero y del Administrador.

**Flujo:**
1. Elegir tipo de documento, escribir el número y apretar **Buscar**.
2. Si el cliente existe, aparece una tarjeta con su nombre, el badge de nivel, el documento y el saldo actual.
3. Se escribe el monto y aparece la vista previa: "Se acreditarán X puntos · Saldo resultante: Y pts".
4. Al registrar, se muestra la pantalla "Consumo registrado".

#### 3.1.1 Identificar al cliente (sin cambios de contrato)

Se usa el endpoint que ya existe: `GET /api/customers/by-document?documentType=DNI&documentNumber=38456123`.

| Respuesta | Qué hace la pantalla |
|---|---|
| `200` y `active: true` | Muestra la tarjeta. Pide `GET /customers/:id/puntos` para saldo y nivel ([3.4](#34-puntos-del-cliente-y-ficha-us-19-us-46)) |
| `200` y `active: false` | **Lo trata como no encontrado**: "No existe un cliente con ese DNI. Registrar cliente". Un cliente dado de baja perdió sus puntos y no se reactiva: si vuelve, se inscribe de nuevo |
| `404` | "No existe un cliente con ese {DNI \| pasaporte}." y el enlace **Registrar cliente** (Cajero: va a "Nuevo cliente"; Administrador: va a Clientes) |
| `400` | "Ingresá el número de documento." (número vacío) |

El número acepta puntos (`38.456.123`); el backend lo normaliza.

#### 3.1.2 `GET /api/consumos/preview` — vista previa

Calcula los puntos con la **configuración vigente**, incluida la bonificación por primer consumo.

**Por qué hace falta este endpoint:** el Cajero no puede leer `/loyalty/configuration/*` (es solo `ADMIN`)
y, además, la bonificación depende de si es el primer consumo del cliente, cosa que solo sabe el backend.
Así la pantalla nunca calcula por su cuenta.

| Query param | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `customerId` | entero | Sí | Cliente existente y activo |
| `amount` | número | Sí | `> 0`, máximo 2 decimales, máximo `9999999999.99` |

**Respuesta `200`:**

```json
{
  "customerId": 101,
  "amount": 50000,
  "points": 500,
  "bonusPoints": 0,
  "totalPoints": 500,
  "isFirstConsumption": false,
  "balanceBefore": 1240,
  "balanceAfter": 1740,
  "equivalence": { "baseAmount": 1000, "pointsAwarded": 10, "configurationVersion": 4 },
  "firstConsumptionBonus": { "bonusType": "PERCENTAGE", "bonusValue": 15 }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `points` | entero | `floor(amount / baseAmount × pointsAwarded)`. Se **trunca** (ejemplo: $1.550 con $1.000 = 10 pts → 15 pts) |
| `bonusPoints` | entero | `0` si no es el primer consumo. `PERCENTAGE`: `floor(points × bonusValue / 100)`. `FIXED_AMOUNT`: `bonusValue` |
| `totalPoints` | entero | `points + bonusPoints` |
| `isFirstConsumption` | boolean | `true` si el cliente no tiene ningún consumo `REGISTERED`. Los anulados no cuentan: si se anula el primer consumo, el siguiente vuelve a recibir la bonificación (decisión #2) |
| `balanceBefore` / `balanceAfter` | entero | Saldo antes y después. Puede ser negativo (cliente con deuda) |
| `equivalence` | objeto | Para el texto "Equivalencia vigente: $1.000 = 10 pts" |
| `firstConsumptionBonus` | objeto \| `null` | `null` si no hay bonificación configurada |

**Errores:** `400` (monto inválido), `404` (cliente inexistente), `409 CUSTOMER_INACTIVE`,
`409 POINTS_EQUIVALENCE_NOT_CONFIGURED`.

> La pantalla llama a este endpoint con *debounce* (300 ms) mientras se escribe el monto. Si el monto
> todavía es inválido, no llama y muestra el error local.

#### 3.1.3 `POST /api/consumos` — registrar

**Body:**

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `customerId` | entero | Sí | Cliente existente y **activo** |
| `amount` | número | Sí | `> 0`, máximo 2 decimales, máximo `9999999999.99`. Se manda como número JSON (`50000`, `12500.5`), nunca como texto |
| `notes` | string \| null | No | Observaciones, hasta 255 caracteres. Vacío se guarda como `null`. La pantalla agrega el campo "Observaciones (opcional)" debajo del monto (decisión #6) |

**No se envían** (si llegan, `400 property X should not exist`): fecha, puntos, cajero responsable ni
equivalencia. La **fecha y hora** las pone el servidor. El **responsable** sale del token
(`@CurrentUser().accountId`). Los **puntos** los calcula el backend con la versión vigente de la configuración.

**Qué hace el backend, en una sola transacción:**

1. Valida que el cliente exista y esté activo.
2. Lee la versión activa de `LoyaltyProgramConfiguration`. Si no hay equivalencia configurada, responde `409 POINTS_EQUIVALENCE_NOT_CONFIGURED`.
3. Calcula `points`, `bonusPoints` y `totalPoints`, igual que en la vista previa.
4. Crea el consumo en estado `REGISTERED` y guarda un **snapshot** de la equivalencia y de la versión (RF-014: un cambio posterior de configuración no lo modifica).
5. **Acredita los puntos** con `acreditar()`:
   - Si el cliente tiene deuda (saldo negativo), los puntos primero la cancelan.
   - Lo que sobra crea un **lote** `ACTIVE` con `expiresAt = createdAt + pointsExpirationMonths` (snapshot de la vigencia).
6. Registra un movimiento `CONSUMPTION_CREDIT` por `totalPoints`, con `balanceAfter`.
7. Suma `totalPoints` (incluida la bonificación, decisión #3) a los **puntos acumulados** (`lifetimePoints`) y recalcula el nivel.
8. Registra la auditoría `CONSUMPTION_REGISTERED` ([3.9](#39-auditoría-ítem-aparte)).

**Respuesta `201`:** el `Consumption` ([3.3.3](#333-tipo-consumption)) más el resultado de la operación:

```json
{
  "consumption": {
    "id": 141,
    "code": "C-000141",
    "createdAt": "2026-10-16T18:40:00.000Z",
    "customer": { "id": 101, "firstName": "Carolina", "lastName": "Fernández", "documentType": "DNI", "documentNumber": "38456123" },
    "amount": 50000,
    "points": 500,
    "bonusPoints": 0,
    "totalPoints": 500,
    "equivalence": { "baseAmount": 1000, "pointsAwarded": 10, "configurationVersion": 4 },
    "notes": null,
    "status": "REGISTERED",
    "registeredBy": { "accountId": 12, "name": "Ana Pereyra" },
    "voidedAt": null,
    "voidedBy": null,
    "voidReason": null,
    "voidableUntil": "2026-10-17T18:40:00.000Z",
    "canVoid": true
  },
  "balanceBefore": 1240,
  "balanceAfter": 1740,
  "levelBefore": "SILVER",
  "levelAfter": "GOLD",
  "levelUp": true
}
```

**Pantalla "Consumo registrado"** (lo que usa de la respuesta):

| Fila | Valor | Fuente |
|---|---|---|
| Código de consumo | C-000141 | `consumption.code` |
| Fecha y hora | 16/10/2026 15:40 | `consumption.createdAt`, en hora de Argentina |
| Cliente | Carolina Fernández · DNI 38456123 | `consumption.customer` (usar el tipo real; el prototipo dice "DNI" siempre) |
| Monto | $50.000 | `amount` |
| Puntos acreditados | +500 pts | `totalPoints`. Si `bonusPoints > 0`, agregar "(incluye N de bonificación por primer consumo)" |
| Observaciones | Texto o "—" | `notes` |
| Saldo | 1.240 pts → 1.740 pts | `balanceBefore` → `balanceAfter` |
| Registrado por | Ana Pereyra | `registeredBy.name` |
| Aviso | "¡Carolina Fernández subió a nivel Oro!" | Solo si `levelUp` |

**Botones:** "Registrar otro consumo" vuelve a la búsqueda. "Ver detalle" va a `GET /consumos/:code` y
**solo lo ve el Administrador** (el Cajero no tiene la sección Consumos).

**Toast:** "Consumo C-000141 registrado: +500 pts."

**Errores de la pantalla:**

| Caso | HTTP / `code` | Mensaje |
|---|---|---|
| Monto vacío | 400 (validación local) | "Ingresá el monto del consumo." |
| Formato inválido | 400 | "Formato inválido. Usá solo números, por ejemplo 50.000 o 12.500,50." |
| Monto ≤ 0 | 400 | "El monto debe ser mayor a 0." |
| Cliente dado de baja entre la búsqueda y el registro | 409 `CUSTOMER_INACTIVE` | "El cliente está dado de baja. No se pueden registrar consumos." |
| Sin equivalencia configurada | 409 `POINTS_EQUIVALENCE_NOT_CONFIGURED` | "Todavía no se configuró la equivalencia de puntos. Pedíselo a un administrador." |

> **Formato de monto en la pantalla:** el input acepta `50000`, `50.000`, `12500,50` y `12.500,50`, y lo
> convierte a número antes de enviarlo (regla del prototipo `parse()`). El backend recibe siempre un
> número JSON.

#### 3.1.4 Paneles desplegables de la búsqueda

Debajo de la tarjeta del cliente hay dos botones:

| Botón | Contenido | Endpoint |
|---|---|---|
| "Ver canjes, recompensas y movimientos de las últimas 24 hs" (Cajero) / "…y últimos movimientos" (Administrador) | Canjes y recompensas alcanzables (**Sprint 4**: por ahora "No tiene canjes." y "No tiene puntos suficientes…"), y movimientos | `GET /customers/:id/movimientos?limit=5` ([3.6.1](#361-get-apicustomersidmovimientos)) |
| "Ver movimientos de las últimas 24 hs" | Tabla de consumos con botón **Anular consumo** | `GET /customers/:id/consumos?last24h=true` ([3.2](#32-anular-consumo-us-22)) |

---

### 3.2 Anular consumo (US-22)

**Regla del sprint:** el **Cajero no tiene la sección Consumos**. Para anular, busca al cliente y abre
**"Ver movimientos de las últimas 24 hs"**. Solo puede anular un consumo si **lo registró él** y no
pasaron **24 horas** desde que lo registró. El **Administrador** puede anular cualquier consumo
`REGISTERED`, sin límite de tiempo, desde la búsqueda o desde Consumos → detalle.

Los consumos **no se editan**. Si el monto estaba mal (ejemplo: se cargó 15.000 en vez de 150.000), se
anula y se registra uno nuevo.

#### 3.2.1 `GET /api/customers/:id/consumos`

| Query param | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `last24h` | `true` \| `false` | No | **Cajero: se fuerza a `true`** aunque mande `false` o no lo mande. Administrador: por defecto `false` |
| `status` | `ConsumptionStatus` | No | Filtra por estado |
| `page` | entero ≥ 1 | No | Por defecto `1` |
| `limit` | entero 1–100 | No | Por defecto `20`. La ficha usa `5` |

**Respuesta `200`:** `{ items: Consumption[], total, page, limit }`, ordenado por `createdAt`
descendente. `canVoid` y `voidableUntil` vienen **calculados para quien consulta**:

| Quien consulta | `canVoid` | `voidableUntil` |
|---|---|---|
| Administrador | `status === 'REGISTERED'` | `null` |
| Cajero, consumo propio | `REGISTERED` y `now < createdAt + 24 h` | `createdAt + 24 h` |
| Cajero, consumo de otro | `false` | `null` |

**Tabla de la pantalla:** Código · Fecha y hora · Monto · Puntos · Registrado por · Estado (badge) ·
botón "Anular consumo". Si `canVoid` es `false`, el botón queda deshabilitado con el tooltip "Solo podés
anular consumos propios dentro de las 24 hs". Si no hay consumos: "No hay consumos de este cliente en las
últimas 24 hs."

**Texto arriba de la tabla:**
- Cajero: "Consumos registrados en las últimas 24 hs. Solo podés anular los que registraste vos."
- Administrador: "Consumos registrados en las últimas 24 hs. Como administrador podés anular cualquiera."

**Errores:** `400` (id no numérico), `404` (cliente inexistente).

#### 3.2.2 `PATCH /api/consumos/:code/anular`

`:code` es el código visible y completo (`C-000131`). Si no respeta el formato `^C-\d{6}$` (por ejemplo,
`131` sin prefijo ni ceros), la respuesta es `400`.

**Body:**

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `reason` | string | Sí | Motivo de anulación. Sin espacios en los extremos: de 5 a 500 caracteres |

**Permisos (en el backend, no solo en la pantalla):**

| Rol | Puede anular si… | Si no, responde |
|---|---|---|
| Administrador | `status = REGISTERED` | `409 CONSUMPTION_ALREADY_VOIDED` |
| Cajero | `status = REGISTERED` **y** `registeredBy = cajero actual` **y** `now < createdAt + 24 h` | `403 VOID_NOT_ALLOWED` (ajeno o fuera de plazo); `409 CONSUMPTION_ALREADY_VOIDED` |

**Qué hace, en una transacción:**

1. Pasa el consumo a `VOIDED` y guarda `voidedAt`, `voidedByAccountId` y `voidReason`.
2. Revierte **todos** los puntos acreditados, **incluida la bonificación** (US-22):
   - Del lote de ese consumo se descuenta lo que quede disponible (`min(remaining, totalPoints)`); el lote pasa a `VOIDED` (Anulado, estado final; decisión #11). Un lote `VOIDED` no suma al saldo.
   - Lo que ya se había gastado se convierte en **deuda**: el saldo queda **negativo**.
3. Registra un movimiento `VOID_REVERSAL` por `−totalPoints`, con `balanceAfter`.
4. Resta `totalPoints` de los acumulados (`lifetimePoints`). Un consumo anulado no suma al nivel, así que **el nivel puede bajar**.
5. Registra la auditoría `CONSUMPTION_VOIDED` con el motivo.

**Respuesta `200`:**

```json
{
  "consumption": { "...": "Consumption con status VOIDED, voidedAt, voidedBy y voidReason" },
  "balanceBefore": 150,
  "balanceAfter": -350,
  "negativeBalance": true
}
```

**Modal "Anular consumo C-000131":**

| Elemento | Contenido |
|---|---|
| Texto fijo | "Los consumos no se pueden editar. Si el monto es incorrecto, anulalo y registrá uno nuevo." |
| Resumen | Código, Cliente, Monto, Puntos a revertir (`−totalPoints`) |
| Saldo | "Saldo: {saldo actual} pts → **{saldo − totalPoints} pts**". El saldo actual sale de `GET /customers/:id/puntos` |
| Alerta (solo si el resultado es < 0) | "El cliente ya utilizó parte de estos puntos. Su saldo quedará en {n} pts y deberá regularizarse con un ajuste del Administrador." |
| Campo | "Motivo de anulación (obligatorio)", textarea. Placeholder: "Ej: monto cargado incorrectamente" |
| Botones | Volver · Confirmar anulación |
| Después de confirmar | Toast "Consumo C-000131 anulado. Se revirtieron 500 pts." y la pregunta "¿Registrar un nuevo consumo para este cliente?" (No / Sí, registrar consumo). "Sí" deja el monto vacío con el mismo cliente cargado |

**Errores:**

| HTTP / `code` | Cuándo | Mensaje |
|---|---|---|
| 400 | Motivo vacío | "El motivo de anulación es obligatorio." |
| 400 | Motivo con menos de 5 caracteres | "Indicá un motivo de al menos 5 caracteres." |
| 403 `VOID_NOT_ALLOWED` | Cajero: consumo ajeno o con más de 24 h | "Solo podés anular consumos propios dentro de las 24 hs." |
| 404 | No existe el código | "No existe el consumo {code}." |
| 409 `CONSUMPTION_ALREADY_VOIDED` | Ya estaba anulado | "Este consumo ya está anulado." |

---

### 3.3 Consultar consumos (US-23)

La sección **Consumos** existe **solo en el menú del Administrador**. Un Cajero que llama a estos
endpoints recibe `403 FORBIDDEN`.

#### 3.3.1 `GET /api/consumos` — listado

| Query param | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `fromDate` | `YYYY-MM-DD` | No | Primer día inclusive, en hora de Argentina (UTC−03:00) |
| `toDate` | `YYYY-MM-DD` | No | Último día inclusive. `fromDate > toDate` → `400` |
| `q` | string (máx. 80) | No | "Cliente (DNI o nombre)". Si tiene 3 dígitos o más, busca en el número de documento (coincidencia parcial). Si no, busca en nombre y apellido, sin distinguir mayúsculas ni tildes |
| `status` | `ConsumptionStatus` | No | Sin valor = todos |
| `registeredByAccountId` | entero | No | Filtro "Cajero". Opciones: cuentas de empleados (`GET /auditoria/actores` sirve, o `GET /usuarios`) |
| `customerId` | entero | No | Lo usa "Ver todos" desde la ficha |
| `page` | entero ≥ 1 | No | Por defecto `1` |
| `limit` | entero 1–100 | No | Por defecto `20`. La pantalla usa `8` |

**Respuesta `200`:**

```json
{
  "items": [ { "...": "Consumption" } ],
  "total": 17,
  "page": 1,
  "limit": 8,
  "totals": { "count": 17, "amountTotal": 735700, "pointsTotal": 7357 }
}
```

| Campo de `totals` | Regla |
|---|---|
| `count` | Todos los consumos que cumplen los filtros, **incluidos los anulados** |
| `amountTotal` | Suma de `amount` solo de los `REGISTERED` |
| `pointsTotal` | Suma de `totalPoints` solo de los `REGISTERED` |

Debajo de las tarjetas, la pantalla dice: "Monto total y puntos otorgados no incluyen consumos anulados."

**Pantalla:**
- **Tarjetas:** Consumos · Monto total · Puntos otorgados.
- **Filtros:** Fechas (calendario de rango) · Cliente (DNI o nombre) · Estado (Todos/Registrado/Anulado) · Cajero (Todos + empleados). Botón **Filtrar**: los filtros se aplican al apretarlo; mientras tanto, la etiqueta dice "Sin aplicar".
- **Columnas:** Código · Fecha y hora · Cliente (nombre + documento) · Monto · Puntos · Registrado por · Estado · botón "Ver".
- **Paginación:** "Mostrando 1–8 de 17", con Anterior y Siguiente.
- **Sin resultados:** "No hay consumos para los filtros seleccionados".

**Orden:** `createdAt` descendente.

#### 3.3.2 `GET /api/consumos/:code` — detalle

**Respuesta `200`:** un `Consumption`.

**Pantalla:** "← Volver a Consumos", el código con su badge de estado, y estas filas:
- Fecha y hora
- Cliente (enlace a la ficha) · documento
- Monto
- Equivalencia aplicada (`$1.000 = 10 pts`, sale del **snapshot**, no de la configuración actual)
- Puntos acreditados
- Observaciones (o "—")
- Registrado por

**Si el consumo está `VOIDED`**, se agrega un bloque "Anulación" con:
- Fecha y hora de anulación
- Anulado por
- Puntos revertidos
- Motivo

**Si está `REGISTERED`**, aparece el botón "Anular consumo", que abre el mismo modal de [3.2.2](#322-patch-apiconsumoscodeanular).

**Errores:** `400` (formato de código), `403` (rol), `404`.

#### 3.3.3 Tipo `Consumption`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | entero | No | PK |
| `code` | string | No | `"C-" + id` con ceros a la izquierda hasta 6 dígitos (`C-000141`). Lo deriva el backend; no se guarda aparte |
| `createdAt` | string ISO 8601 (UTC) | No | Fecha y hora del registro |
| `customer` | objeto | No | `{ id, firstName, lastName, documentType, documentNumber }` |
| `amount` | número (2 decimales) | No | Monto del consumo |
| `points` | entero ≥ 0 | No | Puntos por equivalencia |
| `bonusPoints` | entero ≥ 0 | No | Bonificación de primer consumo (`0` si no aplica) |
| `totalPoints` | entero ≥ 0 | No | `points + bonusPoints` |
| `equivalence` | objeto | No | Snapshot: `{ baseAmount, pointsAwarded, configurationVersion }` |
| `notes` | string | Sí | Observaciones |
| `status` | `ConsumptionStatus` | No | |
| `registeredBy` | `{ accountId, name }` | No | `name` = nombre y apellido del empleado **al momento de registrar** |
| `voidedAt` | string ISO | Sí | |
| `voidedBy` | `{ accountId, name }` | Sí | |
| `voidReason` | string | Sí | |
| `voidableUntil` | string ISO | Sí | Ver [3.2.1](#321-get-apicustomersidconsumos) |
| `canVoid` | boolean | No | Calculado para quien consulta |

---

### 3.4 Puntos del cliente y ficha (US-19, US-46)

#### 3.4.1 `GET /api/customers/:id/puntos`

Lo usan la tarjeta de "Buscar cliente", la **Ficha del cliente** (Cajero y Administrador) y el modal de
ajuste.

**Respuesta `200`:**

```json
{
  "customerId": 102,
  "balance": -350,
  "negativeBalance": true,
  "lifetimePoints": 1250,
  "level": {
    "current": "SILVER",
    "next": "GOLD",
    "currentMinPoints": 300,
    "nextMinPoints": 800,
    "pointsToNext": 0,
    "progressPercent": 100
  },
  "nextExpirations": [
    { "points": 200, "expiresAt": "2026-11-30" },
    { "points": 150, "expiresAt": "2026-12-15" }
  ]
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `balance` | entero (puede ser < 0) | Suma de `remaining` de los lotes `ACTIVE` menos la deuda |
| `negativeBalance` | boolean | `balance < 0` |
| `lifetimePoints` | entero ≥ 0 | **Puntos acumulados (históricos)**: suma de `CONSUMPTION_CREDIT` menos `VOID_REVERSAL`. Los canjes, vencimientos y ajustes **no** cuentan |
| `level.current` | `Level` | Mayor nivel cuyo mínimo es ≤ `lifetimePoints` |
| `level.next` | `Level` \| `null` | `null` si es `GOLD` |
| `level.pointsToNext` | entero ≥ 0 | `nextMinPoints − lifetimePoints`; `0` si es `GOLD` |
| `level.progressPercent` | entero 0–100 | `(lifetime − currentMin) / (nextMin − currentMin) × 100`; `100` si es `GOLD` |
| `nextExpirations` | arreglo | Lotes `ACTIVE` con `remaining > 0`, ordenados por `expiresAt` ascendente, como máximo 5. `expiresAt` en `YYYY-MM-DD` (hora de Argentina). Vacío si no hay ninguno |

**Ficha del cliente:**

| Bloque | Contenido |
|---|---|
| Encabezado | "← Volver", nombre, botón **Registrar consumo** (Cajero y Administrador) y **Ajustar puntos** (solo Administrador) |
| Alerta (si `negativeBalance`) | "Saldo negativo por anulación de consumo. Requiere ajuste del Administrador." Para el Administrador, con el botón "Ajustar puntos" |
| Saldo actual | Número grande, en rojo si es < 0 |
| Nivel | Badge "Nivel Plata", barra de progreso, "Le faltan {n} pts para {siguiente}" o "Nivel máximo alcanzado" |
| Puntos por vencer | "{n} pts vencen el {dd/mm/aaaa}" (primer elemento de `nextExpirations`) o "Sin puntos por vencer" |
| Datos | DNI (usar el tipo real), Fecha de alta (`createdAt`), Email, Teléfono (o "—") |
| Pestañas | Administrador: "Últimos consumos" y "Movimientos de puntos" (5 cada una, con "Ver todos"). Cajero: "Consumos de las últimas 24 hs" y "Movimientos de las últimas 24 hs", sin "Ver" ni "Ver todos" |

**Errores:** `400`, `404`.

> **Datos del cliente en la ficha:** salen de `GET /customers/:id`, que ya existe.

---

### 3.5 Ajustar puntos (US-24)

Es **solo del Administrador**. Se abre desde la ficha del cliente (botón "Ajustar puntos" o el de la alerta
de saldo negativo).

#### 3.5.1 `POST /api/customers/:id/ajustes-de-puntos`

**Body:**

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `direction` | `AdjustmentDirection` | Sí | `ADD` o `SUBTRACT` |
| `points` | entero | Sí | `> 0`, máximo 1.000.000. Sin decimales |
| `reason` | string | Sí | Sin espacios en los extremos: de 1 a 500 caracteres |

**Qué hace, en una transacción:**

| Dirección | Efecto |
|---|---|
| `ADD` | Los puntos cancelan primero la deuda, si hay. Lo que sobra crea un lote `ACTIVE` con la vigencia vigente |
| `SUBTRACT` | Descuenta de los lotes `ACTIVE` en orden de vencimiento (FIFO: el que vence primero). **No puede dejar el saldo negativo** (decisión #1): si `points` supera el saldo, responde `409 INSUFFICIENT_BALANCE`. Con saldo negativo, restar no está permitido |

Después:
- Registra un movimiento `MANUAL_ADJUSTMENT` con signo, `reason` y `balanceAfter`.
- **No toca** `lifetimePoints`: el nivel no cambia.
- Registra la auditoría `POINTS_ADJUSTED`.

**Respuesta `201`:**

```json
{
  "movement": {
    "id": 88,
    "createdAt": "2026-10-16T18:12:00.000Z",
    "type": "MANUAL_ADJUSTMENT",
    "points": 350,
    "balanceAfter": 0,
    "description": "Ajuste: Regularización por anulación de consumo",
    "reason": "Regularización por anulación de consumo",
    "performedBy": { "actorType": "EMPLOYEE", "accountId": 9, "name": "Valeria Vitto" }
  },
  "balanceBefore": -350,
  "balanceAfter": 0
}
```

**Modal "Ajustar puntos":**

| Elemento | Contenido |
|---|---|
| Cabecera | Nombre, documento y "Saldo actual" |
| Atajo (solo si saldo < 0) | Botón **Regularizar a 0**: completa `ADD`, `points` = valor absoluto del saldo y motivo "Regularización por anulación de consumo" |
| Tipo de ajuste | Selector Sumar / Restar |
| Cantidad de puntos | Input numérico |
| Motivo (obligatorio) | Textarea |
| Vista previa | "Saldo: {actual} pts → **{resultado} pts**" (se calcula en el frontend) |
| Botones | Cancelar · Confirmar ajuste |
| Toast | "Ajuste aplicado: +350 pts. Nuevo saldo: 0 pts." |

**Errores:**

| HTTP / `code` | Cuándo | Mensaje |
|---|---|---|
| 400 | Cantidad vacía | "Ingresá la cantidad de puntos." |
| 400 | Cantidad no entera o ≤ 0 | "Tiene que ser un número entero mayor a 0." |
| 400 | Motivo vacío | "El motivo es obligatorio." |
| 403 `FORBIDDEN` | Cajero o Cliente | — |
| 404 | Cliente inexistente | — |
| 409 `CUSTOMER_INACTIVE` | Cliente dado de baja | "El cliente está dado de baja." |
| 409 `INSUFFICIENT_BALANCE` | `SUBTRACT` mayor que el saldo | "No se puede restar más que el saldo disponible." |

La pantalla también lo valida antes de enviar: con "Restar", si el resultado de la vista previa es menor que
0, deshabilita "Confirmar ajuste" y muestra el mismo mensaje.

---

### 3.6 Movimientos de puntos (US-26) y vencimiento automático (US-25)

#### Tipo `PointsMovement`

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | entero | No | |
| `createdAt` | string ISO | No | |
| `customer` | `{ id, firstName, lastName, documentType, documentNumber }` | No | Solo en las vistas del Administrador y del Cajero |
| `type` | `PointsMovementType` | No | |
| `points` | entero con signo | No | `+500`, `−500`, … |
| `balanceAfter` | entero | No | Saldo del cliente **después** del movimiento |
| `description` | string | No | "Detalle / origen", armado por el backend: `Consumo C-000131` · `Anulación de C-000131` · `Ajuste: {motivo}` · `Vencimiento de lote del 16/08/2026` · `Canje: {recompensa}` |
| `consumptionCode` | string | Sí | Para `CONSUMPTION_CREDIT` y `VOID_REVERSAL` |
| `reason` | string | Sí | Para `MANUAL_ADJUSTMENT` |
| `lot` | `{ id, accreditedAt, expiresAt, status }` | Sí | Para `CONSUMPTION_CREDIT`, ajustes `ADD` que crearon lote, y `EXPIRATION`. `status` es el **estado** que pide US-26 |
| `performedBy` | `{ actorType, accountId, name }` | No | `actorType` = `EMPLOYEE` o `SYSTEM`. Para `SYSTEM`: `accountId = null` y `name = "Sistema"`. **No se envía en los endpoints del Cliente** |

**Orden:** `createdAt` descendente y, a igual fecha, `id` descendente.

#### 3.6.1 `GET /api/customers/:id/movimientos`

| Query param | Tipo | Regla |
|---|---|---|
| `last24h` | boolean | **Cajero: forzado a `true`**. Administrador: por defecto `false` |
| `type` | `PointsMovementType` | Opcional |
| `page`, `limit` | entero | Por defecto `1` y `20`. La ficha usa `limit=5` |

**Respuesta:** `{ items: PointsMovement[], total, page, limit }`.

**Pestaña en la ficha:** Fecha y hora · Tipo (badge) · Detalle · Puntos. Sin datos: "Este cliente todavía
no tiene movimientos de puntos."

#### 3.6.2 `GET /api/movimientos-de-puntos` (solo Administrador)

| Query param | Tipo | Regla |
|---|---|---|
| `q` | string (máx. 80) | "Cliente (DNI o nombre)". Misma regla que en Consumos |
| `customerId` | entero | Lo usa "Ver todos" desde la ficha |
| `fromDate`, `toDate` | `YYYY-MM-DD` | Rango inclusivo, en hora de Argentina |
| `type` | `PointsMovementType` | Sin valor = "Todos" |
| `page`, `limit` | entero | La pantalla usa `limit=10` |

**Respuesta:** `{ items, total, page, limit }`.

**Pantalla:**
- **Columnas:** Fecha y hora · Cliente (nombre + documento) · Tipo (badge con ícono) · Detalle / origen · Puntos (verde si es +, rojo si es −) · Saldo resultante (rojo si es < 0) · Realizado por.
- **Filtros:** se aplican con el botón **Filtrar**.
- **Sin resultados:** "No hay movimientos para los filtros seleccionados".

#### 3.6.3 Vencimiento automático de puntos (US-25) — proceso, sin endpoint

| Ítem | Definición |
|---|---|
| Cuándo corre | Todos los días a las **00:05** (hora de Argentina), con `@nestjs/schedule` (cron `5 0 * * *`, zona `America/Argentina/Cordoba`) |
| Qué busca | Lotes `ACTIVE` con `expiresAt <= ahora` y `remaining > 0` |
| Qué hace por lote, en una transacción | Movimiento `EXPIRATION` por `−remaining` con `balanceAfter`. El lote pasa a `EXPIRED` (vence **entero**, con lo que le quede) y guarda `expiredAt`. Auditoría `POINTS_EXPIRED` con actor `SYSTEM` |
| Qué no toca | Movimientos posteriores ni `lifetimePoints`: el vencimiento no baja el nivel |
| Idempotencia | Si se corre dos veces, un lote `EXPIRED` no se vuelve a procesar. Bloqueo con `SELECT … FOR UPDATE SKIP LOCKED` o *advisory lock* para que dos instancias no lo procesen a la vez |
| Fecha de vencimiento | `accreditedAt + pointsExpirationMonths` (**snapshot** de la vigencia al acreditar, RF-014). Cambiar la vigencia no corre los lotes ya creados |
| Para probar | Variable de entorno `POINTS_EXPIRATION_CRON_ENABLED` y un comando o script que ejecute el proceso a demanda (no se expone como endpoint HTTP) |

---

### 3.7 Configurar niveles (US-27)

**Pantalla:** Configuración (ícono de engranaje del Administrador) → **Puntos** → tarjeta **Niveles**,
debajo de "Equivalencia de puntos".

**Reglas:**
- Tres niveles fijos: **Bronce** desde 0 (no editable), **Plata** y **Oro** editables.
- El nivel se calcula por **puntos acumulados** (`lifetimePoints`). Los canjes y vencimientos no lo bajan; los consumos anulados no suman.
- El nivel **no se guarda** por cliente: se calcula al leer. Por eso, al guardar umbrales nuevos se "recalcula" el nivel de todos sin ningún proceso aparte.
- **Beneficios:** pendientes de definir. No se muestran ni se guardan.

#### 3.7.1 `GET /api/loyalty/configuration/levels`

```json
{
  "levels": [
    { "level": "BRONZE", "minPoints": 0, "editable": false },
    { "level": "SILVER", "minPoints": 300, "editable": true },
    { "level": "GOLD", "minPoints": 800, "editable": true }
  ],
  "configurationVersion": 5,
  "updatedAt": "2026-10-16T17:05:00.000Z"
}
```

#### 3.7.2 `PUT /api/loyalty/configuration/levels`

**Body:**

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `silverMinPoints` | entero | Sí | `> 0`, máximo 2.147.483.647, sin decimales |
| `goldMinPoints` | entero | Sí | `> silverMinPoints`, máximo 2.147.483.647, sin decimales |

**Qué hace:** crea una **versión nueva** de `LoyaltyProgramConfiguration` (RF-014) copiando el resto de los
valores, igual que los otros PUT seccionales. Registra la auditoría `LEVELS_UPDATED` con el antes y el
después.

**Respuesta `200`:** el mismo cuerpo que el `GET`.

**Pantalla:**
- **Texto:** "El nivel del cliente se calcula según los puntos que acumuló por consumos a lo largo del tiempo." y "Los canjes y vencimientos no bajan el nivel. Los consumos anulados no suman."
- **Filas:** Bronce "Desde 0 puntos" (sin input) · Plata "Desde [input] puntos" · Oro "Desde [input] puntos".
- **Botón:** Guardar.
- **Mensaje de éxito:** "Niveles actualizados. Se recalculó el nivel de los clientes."

**Errores:**

| Caso | Mensaje |
|---|---|
| Vacío | "Completá este campo." |
| No entero | "Ingresá un número entero, sin decimales." |
| Plata ≤ 0 | "El umbral de Plata debe ser mayor que 0" |
| Oro ≤ Plata | "El umbral de Oro debe ser mayor que el de Plata" |

**Cambio en `GET /loyalty/configuration/current` y `PUT /loyalty/configuration`:** se agregan
`silverMinPoints` y `goldMinPoints` (en el PUT completo son opcionales; si se omiten, se copian de la
versión vigente). La versión inicial que crea la migración usa **300 y 800**, que son los valores del
prototipo.

**Dónde se muestra el nivel:**

| Lugar | Cómo |
|---|---|
| Tarjeta de "Buscar cliente" | Badge "Nivel X" junto al nombre |
| Ficha del cliente | Badge, barra de progreso y texto |
| Listado de Clientes del Administrador | Columna "Nivel" y filtro por nivel |
| Inicio del Cliente | Badge, "Puntos acumulados: {n} pts", barra y "Te faltan {n} pts para llegar a {nivel}" o "¡Llegaste al nivel máximo!" |
| Mi perfil | Tarjeta "Mi situación en el programa" |
| "Consumo registrado" | "¡{Nombre} subió a nivel {X}!" si `levelUp` |

---

### 3.8 Clientes del Administrador (pendiente del Sprint 2)

**Pantalla:** menú del Administrador → **Clientes**.

| Elemento | Contenido |
|---|---|
| Filtros | **Buscar** ("Apellido, nombre o documento") y **Nivel** (Todos los niveles / Bronce / Plata / Oro) |
| Tabla | Apellido · Nombre · Nivel (badge) · Saldo (rojo si es < 0) · Fecha de alta · Estado · botones "Ver más" y "Ver ficha". **Se saca la columna "Puntos"** del prototipo (decisión #4) |
| Alcance | Solo clientes **activos**, ordenados por apellido |
| Sin resultados | "Sin resultados para esa búsqueda." |
| Botón | **+ Registrar cliente** |

#### 3.8.1 `GET /api/customers` — cambios

Parámetros que **se agregan** a los existentes (`page`, `limit`, `active`, `name`):

| Query param | Tipo | Regla |
|---|---|---|
| `q` | string (máx. 80) | Busca en nombre, apellido **y número de documento** (normalizado, coincidencia parcial). Cada palabra separada por espacios tiene que aparecer en alguno de los tres campos. Si viene `q`, no se puede mandar `name` a la vez: `400`, sin `code`, "No se puede buscar por q y por name a la vez." |
| `level` | `Level` (`BRONZE`, `SILVER`, `GOLD`) | Filtra por nivel calculado (`lifetimePoints` contra los umbrales vigentes). Un valor que no sea uno de los tres: `400`. Un cliente sin movimientos de puntos es `BRONZE` |
| `sort` | `lastName` \| `id` | Por defecto `id` (para no romper a quien ya lo usa). La pantalla manda `sort=lastName`: ordena por apellido, nombre e `id`. Cualquier otro valor: `400`. El orden de tildes y mayúsculas lo define la *collation* de la base: el contrato no la fija |

La pantalla llama a `GET /api/customers?active=true&sort=lastName&q=…&level=…&page=1&limit=20`.

**Cada ítem agrega** (sin quitar nada de lo que ya existe):

| Campo | Tipo | Descripción |
|---|---|---|
| `balance` | entero | Saldo actual (columna **Saldo**) |
| `lifetimePoints` | entero | Puntos acumulados. La tabla no lo muestra, pero viaja porque define el nivel y lo usa el modal "Ver más" |
| `level` | `Level` | Nivel calculado |

Un cliente que nunca tuvo movimientos de puntos viene con `balance: 0`, `lifetimePoints: 0` y
`level: "BRONZE"`. `balance` puede ser negativo. Si no hay una configuración vigente, el nivel se calcula con
los umbrales por defecto (300 y 800) en lugar de responder `500`.

#### 3.8.2 "Ver más" (modal)

**Vista:** documento, Nivel · Saldo · Acumulados, Teléfono, Mail y Estado.

**Botones:** **Eliminar** (baja) · Cerrar · **Editar**.

Con **Editar**, el modal pasa a formulario. Usa el endpoint existente `PATCH /api/customers/:id` con estos
cambios:

| Campo | En la pantalla del prototipo | En el contrato | Motivo |
|---|---|---|---|
| `firstName`, `lastName`, `phone`, `email` | Editables | Editables, mismas reglas de siempre | — |
| `documentType` / `documentNumber` | Editables | **Editables solo por el Administrador** | Corrección de errores de carga. El Cajero no los edita: si los manda, `403 FORBIDDEN_FIELD`. La pantalla del Cajero ya los muestra bloqueados ("El documento no se puede modificar.") |
| `puntos` | Editable | **Se saca del formulario** | Los puntos solo cambian con movimientos. Para corregirlos se usa **Ajustar puntos** (desde la ficha), que deja el motivo y el saldo resultante |
| `reason` | "Motivo del cambio (obligatorio)" | **Nuevo campo**. Obligatorio si quien edita es Administrador; opcional para el Cajero | Queda en la auditoría (`CUSTOMER_UPDATED`) |

Reglas de `reason`: de 1 a 500 caracteres; el backend le **recorta** los espacios de los extremos antes de
validar, así que un motivo de solo espacios cuenta como omitido. Un `PATCH` que trae solo `reason`, sin ningún
dato del cliente para cambiar, es `400` (el motivo no cuenta como dato).

**Errores de `PATCH /api/customers/:id`:**

| Caso | Respuesta | Mensaje |
|---|---|---|
| El Administrador omite `reason` (o lo manda en blanco) | `400`, sin `code` | "Indicá el motivo del cambio para continuar." |
| `reason` de más de 500 caracteres | `400`, sin `code` | "El motivo no puede superar los 500 caracteres." |
| El Cajero manda `documentType` o `documentNumber` | `403` `FORBIDDEN_FIELD` | "El documento no se puede modificar." Se valida **antes** que cualquier otra regla: el Cajero recibe `403` aunque el cliente no exista o esté inactivo |
| El cliente está inactivo | `409` `CUSTOMER_INACTIVE` | "El cliente está dado de baja." Un cliente inactivo es de solo lectura y no tiene reactivación |
| El cliente no existe | `404` | — |
| El documento nuevo lo usa otro cliente activo, o el email nuevo lo usa otro cliente, un empleado u otra cuenta activa | `409`, sin `code` | Sin cambios respecto del Sprint 2 (mensajes en inglés). No se guarda nada |

El frontend decide por `code`, pero el `400` por `reason` faltante no lo trae: la pantalla tiene que validarlo
antes de enviar ("Indicá el motivo del cambio para continuar.").

**Si el Administrador corrige el documento** de un cliente que **todavía no cambió su contraseña inicial**
(`mustChangePassword = true`), la contraseña inicial pasa a ser el documento nuevo, en la misma transacción.
Si el cliente ya la cambió, la contraseña no se toca. `customers` lo avisa con el evento nuevo
`customer.document-changed` (`{ customerId, documentNumber }`, con el documento ya normalizado), que escucha
`accounts`. Se publica solo si el **número** cambió (si cambia solo el tipo, no). Si `accounts` falla, se
deshace también el cambio del documento.

**Si se corrige el email,** cambia también el email de acceso (ya funciona así, evento `customer.email-changed`).

**Auditoría:** `CUSTOMER_UPDATED` (§3.9.3), con la fila `Motivo` al final cuando se mandó `reason`.

**Mensaje de éxito:** "Cliente actualizado y registrado en auditoría."

#### 3.8.3 "Eliminar" (baja lógica)

Usa el endpoint existente `PATCH /api/customers/:id/deactivate` (`204`).

**Diálogo:** "Eliminar cliente" — "¿Seguro que querés eliminar a **{nombre}**? Va a dejar de aparecer en el
listado y no se puede deshacer." (Cancelar / Eliminar)

**Qué tiene que pasar en el backend:**
- El cliente ya no puede iniciar sesión ni renovar. Esto **ya funciona**: el login lee el estado del cliente.
- La **cuenta** queda `is_active = false` y se cierran sus sesiones: `customers` publica `customer.deactivated`, `accounts` deja inactiva la cuenta y publica `account.deactivated`, y `auth` revoca las sesiones. Todo en la misma transacción: si algo falla, el cliente sigue activo. Un cliente sin cuenta se da de baja igual. Así su email queda libre para volver a registrarse.
- Sus puntos se pierden: el saldo deja de importar porque no se reactiva.
- Auditoría `CUSTOMER_DEACTIVATED`, con `Saldo perdido: {n} pts`. `{n}` es el saldo (`balance`) del cliente en el momento de la baja, leído en la misma transacción: con puntos de miles (`1.250 pts`), `0 pts` si nunca tuvo movimientos y con signo si es negativo (`-30 pts`).

**Errores:** `404` si el cliente no existe; `409` si ya estaba inactivo (no se vuelve a auditar).

`PATCH /api/customers/:id/activate` **no existe**: responde `404`. El valor `ACTIVATED` de
`CustomerStatusAction` queda solo para filas viejas del historial.

**Mensaje de éxito:** "Cliente eliminado."

#### 3.8.4 "+ Registrar cliente"

Usa `POST /api/customers`, que ahora **también crea la cuenta del cliente** con contraseña inicial igual a
su número de documento (detalle en [3.11.3](#3113-contraseña-inicial-del-cliente-cargado-en-caja-y-cambio-obligatorio)).

El modal tiene Nombre, Apellido, Fecha de nacimiento (opcional), Tipo de documento, Número de documento,
Mail y Teléfono (opcional). Es el mismo formulario que "Nuevo cliente" de Caja.

El prototipo dice "Recibirá un mail para definir su contraseña"; ese envío no existe. El mensaje pasa a ser:

> "Cliente registrado. Ingresa con su mail y su número de documento como contraseña; al entrar se le va a
> pedir que la cambie."

El mismo mensaje se usa en "Nuevo cliente" de Caja.

#### 3.8.5 "Ver ficha"

Abre la ficha de [3.4](#34-puntos-del-cliente-y-ficha-us-19-us-46) con rol Administrador.

---

### 3.9 Auditoría (ítem aparte)

#### 3.9.1 Reglas

| # | Regla |
|---|---|
| 1 | El registro es **inalterable** (solo inserción). La tabla mantiene los triggers que rechazan `UPDATE`, `DELETE` y `TRUNCATE` |
| 2 | La consulta es **solo del Administrador**. No hay endpoints de alta, modificación ni borrado; tampoco exportación |
| 3 | "Realizado por" es **siempre un empleado** (Administrador o Cajero) **o "Sistema"**. **Un cliente nunca figura como actor** |
| 4 | Lo que hace un cliente y tiene impacto (ejemplo: un canje con descuento de puntos) se registra a nombre del **cajero que lo procesa** en caja. Los datos del cliente afectado van en el bloque **"Cliente afectado"** del detalle |
| 5 | **No se audita:** inicio ni cierre de sesión, intentos de login, autorregistro del cliente, cambios que el cliente hace en su perfil o su contraseña, cancelación de canjes por el cliente, ni consultas o listados |
| 6 | Los procesos automáticos (vencimientos, deshabilitar o habilitar recompensas, misiones) se auditan con actor **Sistema** |
| 7 | La auditoría se escribe **en la misma transacción** que la operación (`AuditService.capture`, que ya existe). Si falla la auditoría, se deshace la operación |
| 8 | Cada registro es una **foto** del momento: guarda los nombres, montos y textos ya armados. Si después cambia el nombre del cliente o del empleado, el registro viejo no cambia |

#### 3.9.2 Enumerados de auditoría

##### `AuditActorType`

| API | UI |
|---|---|
| `EMPLOYEE` | Nombre y apellido del empleado, con ícono de persona |
| `SYSTEM` | "Sistema", con ícono de computadora |

##### `AuditModule` — filtro "Módulo"

| API | UI | En el filtro |
|---|---|---|
| `EMPLOYEES` | Empleados | Habilitado |
| `CUSTOMERS` | Clientes | Habilitado |
| `CONSUMPTIONS` | Consumos | Habilitado |
| `POINTS` | Puntos | Habilitado |
| `REDEMPTIONS` | Canjes | Habilitado (se registra desde el Sprint 4) |
| `REWARDS` | Recompensas | **Deshabilitado**, "Recompensas (Próximamente)" |
| `MISSIONS` | Misiones | **Deshabilitado**, "Misiones (Próximamente)" |
| `CONFIGURATION` | Configuración | Habilitado |

> **Reemplaza** a `AuditCategory` (`SESSION`, `CUSTOMERS`, `EMPLOYEES`, `CONFIGURATION`) de la rama
> `feature/SCRUM-161`. `SESSION` desaparece.

##### `AuditAction` — filtro "Acción" (depende del módulo)

**Registrar el código, nunca el texto.** El texto ("UI") lo traduce el frontend para el filtro. La fila
de la tabla muestra `description`, que arma el backend.

| Módulo | Código API | UI (opción del filtro) | Actor | `description` (ejemplo) | Desde |
|---|---|---|---|---|---|
| EMPLOYEES | `EMPLOYEE_CREATED` | Registró empleado | Admin | Registró al empleado Jorge Molina | S3 (ya existe como texto) |
| EMPLOYEES | `EMPLOYEE_UPDATED` | Editó empleado | Admin | Editó al empleado Jorge Molina | S3 |
| EMPLOYEES | `EMPLOYEE_DEACTIVATED` | Dio de baja empleado | Admin | Dio de baja al empleado Diego Sosa | S3 |
| EMPLOYEES | `USER_ACCOUNT_CREATED` | Creó cuenta de usuario | Admin | Creó el usuario de Jorge Molina | S3 |
| EMPLOYEES | `USER_ACCOUNT_UPDATED` | Editó cuenta de usuario | Admin | Cambió la contraseña de Jorge Molina | S3 |
| EMPLOYEES | `USER_ACCOUNT_DEACTIVATED` | Dio de baja cuenta de usuario | Admin | Dio de baja el usuario de Diego Sosa | S3 |
| EMPLOYEES | `USER_ACCOUNT_REACTIVATED` | Reactivó cuenta de usuario | Admin | Reactivó el usuario de Diego Sosa | S3 (**agregar al filtro del prototipo**: la reactivación de usuarios se mantiene) |
| CUSTOMERS | `CUSTOMER_CREATED` | Registró cliente | Admin / Cajero | Registró al cliente Sofía Ríos | S3 |
| CUSTOMERS | `CUSTOMER_UPDATED` | Editó cliente | Admin / Cajero | Editó los datos del cliente Sofía Ríos | S3 |
| CUSTOMERS | `CUSTOMER_DEACTIVATED` | Dio de baja cliente | Admin / Cajero | Dio de baja al cliente Carlos Ruiz | S3 |
| CONSUMPTIONS | `CONSUMPTION_REGISTERED` | Registró consumo | Admin / Cajero | Registró el consumo C-000141 de Carolina Fernández | **S3** |
| CONSUMPTIONS | `CONSUMPTION_VOIDED` | Anuló consumo | Admin / Cajero | Anuló el consumo C-000131 de Martín Gómez | **S3** |
| POINTS | `POINTS_ADJUSTED` | Ajustó puntos | Admin | Ajustó puntos de Martín Gómez | **S3** |
| POINTS | `POINTS_EXPIRED` | Venció puntos | Sistema | Venció 200 pts de Carolina Fernández | **S3** |
| REDEMPTIONS | `REDEMPTION_CONFIRMED` | Confirmó canje | Cajero | Confirmó el canje de Carolina Fernández | S4 |
| REDEMPTIONS | `REDEMPTION_USED` | Registró uso de canje | Cajero | Registró el uso del canje de Carolina Fernández | S4 |
| REDEMPTIONS | `REDEMPTION_REJECTED` | Rechazó canje | Cajero | Rechazó el canje de Carolina Fernández | S4 |
| REDEMPTIONS | `REDEMPTION_EXPIRED` | Venció canje | Sistema | Venció el canje de Sofía Ríos | S4 |
| REWARDS | `REWARD_CREATED` | Creó recompensa | Admin | Creó la recompensa "Merienda gratis" | S4 |
| REWARDS | `REWARD_UPDATED` | Editó recompensa | Admin | Editó la recompensa "Café + medialuna" | S4 |
| REWARDS | `REWARD_ACTIVATED` | Activó recompensa | Admin | Activó la recompensa "…" | S4 |
| REWARDS | `REWARD_DEACTIVATED` | Desactivó recompensa | Admin | Desactivó la recompensa "…" | S4 |
| REWARDS | `REWARD_DELETED` | Dio de baja recompensa | Admin | Dio de baja la recompensa "…" | S4 |
| REWARDS | `REWARD_DISABLED` | Deshabilitó recompensa | Sistema | Deshabilitó la recompensa "Café + medialuna" | S4 |
| REWARDS | `REWARD_ENABLED` | Habilitó recompensa | Sistema | Habilitó la recompensa "Café + medialuna" | S4 |
| MISSIONS | `MISSION_CREATED` | Creó misión | Admin | Creó la misión "…" | S5 |
| MISSIONS | `MISSION_UPDATED` | Editó misión | Admin | Editó la misión "…" | S5 |
| MISSIONS | `MISSION_DELETED` | Dio de baja misión | Admin | Dio de baja la misión "…" | S5 |
| MISSIONS | `MISSION_COMPLETED` | Completó misión | Sistema | Completó la misión "Vení 3 veces esta semana" de Carolina Fernández | S5 |
| MISSIONS | `MISSION_REWARD_CLAIMED` | Reclamó recompensa de misión | Sistema | Reclamó la recompensa de la misión "…" de … | S5 |
| MISSIONS | `MISSIONS_EXPIRED` | Venció misiones del mes | Sistema | Venció las misiones del mes | S5 |
| CONFIGURATION | `POINTS_EQUIVALENCE_UPDATED` | Modificó equivalencia de puntos | Admin | Modificó la equivalencia de puntos | S3 |
| CONFIGURATION | `POINTS_VALIDITY_UPDATED` | Modificó vigencia de puntos | Admin | Modificó la vigencia de los puntos | S3 |
| CONFIGURATION | `FIRST_CONSUMPTION_BONUS_UPDATED` | Modificó bonificación por primer consumo | Admin | Modificó la bonificación por primer consumo | S3 |
| CONFIGURATION | `LEVELS_UPDATED` | Modificó niveles | Admin | Modificó niveles | **S3** |
| CONFIGURATION | `LOGO_AND_MESSAGES_UPDATED` | Modificó logo y mensajes | Admin | Modificó los mensajes automáticos | S5 |
| CONFIGURATION | `PROMOTIONS_UPDATED` | Modificó promociones | Admin | Modificó las promociones | S5 |

**Validación del filtro:** `action` sin `module`, o un `action` que no pertenece al `module`, responde
`400`. En la pantalla, "Acción" queda deshabilitado (mostrando "Todas") mientras el módulo sea "Todos", y
vuelve a "Todas" cada vez que cambia el módulo.

#### 3.9.3 Qué se guarda en el detalle de cada acción

`details` es un **arreglo ordenado** de pares `{ label, value }`, ya formateados en español (montos con
`$` y puntos de miles, puntos con signo, fechas `dd/mm/aaaa`). La pantalla los muestra tal cual. **Nunca**
se guardan contraseñas ni hashes.

El bloque **"Cliente afectado"** (nombre y documento) **no** va en `details`: va en `affectedCustomer`. El
código de operación (`C-000141`, `CJ-00412`) va en `operationCode` **y** como primera fila de `details`.

| Acción | `affectedCustomer` | `operationCode` | Filas de `details` (en orden) |
|---|---|---|---|
| `EMPLOYEE_CREATED` | — | — | Mail · Rol |
| `EMPLOYEE_UPDATED` | — | — | Una fila por campo que cambió: `{Campo}: {antes} → {después}` (Nombre, Apellido, Teléfono, Rol). Vacío = "—" |
| `EMPLOYEE_DEACTIVATED` | — | — | Estado: Activo → Inactivo |
| `USER_ACCOUNT_CREATED` | — | — | Usuario: {mail} |
| `USER_ACCOUNT_UPDATED` | — | — | Contraseña: Modificada |
| `USER_ACCOUNT_DEACTIVATED` | — | — | Estado del usuario: Activo → Inactivo |
| `USER_ACCOUNT_REACTIVATED` | — | — | Estado del usuario: Inactivo → Activo |
| `CUSTOMER_CREATED` | Sí | — | Mail · Teléfono (o "—") · Origen: Caja / Administración · Cuenta de acceso: Creada, contraseña inicial = número de documento (nunca se guarda el valor) |
| `CUSTOMER_UPDATED` | Sí | — | Una fila por campo que cambió (Nombre, Apellido, Documento, Correo electrónico, Teléfono, Fecha de nacimiento) · Motivo (si se mandó `reason`) |
| `CUSTOMER_DEACTIVATED` | Sí | — | Estado: Activo → Inactivo · Saldo perdido: {n} pts |
| `CONSUMPTION_REGISTERED` | Sí | `C-…` | Código de operación · Monto · Equivalencia aplicada · Puntos acreditados · Bonificación primer consumo (solo si > 0) · Saldo resultante |
| `CONSUMPTION_VOIDED` | Sí | `C-…` | Código de operación · Monto · Puntos revertidos · Saldo resultante · Motivo |
| `POINTS_ADJUSTED` | Sí | — | Cantidad (con signo) · Saldo resultante · Motivo |
| `POINTS_EXPIRED` | Sí | — | Puntos vencidos · Fecha del lote (acreditación) · Saldo resultante |
| `LEVELS_UPDATED` | — | — | Plata: {antes} → {después} pts · Oro: {antes} → {después} pts |
| `POINTS_EQUIVALENCE_UPDATED` | — | — | Monto base ($): antes → después · Puntos por monto: antes → después |
| `POINTS_VALIDITY_UPDATED` | — | — | Vigencia (meses): antes → después |
| `FIRST_CONSUMPTION_BONUS_UPDATED` | — | — | Tipo de bonificación: antes → después · Valor de bonificación: antes → después |
| `REDEMPTION_USED` (S4) | Sí | `CJ-…` | Recompensa · Código del canje · Puntos descontados · Saldo resultante |
| `REDEMPTION_EXPIRED` (S4) | Sí | `CJ-…` | Recompensa · Código del canje |
| `REWARD_DISABLED` / `REWARD_ENABLED` (S4) | — | — | Motivo: Sin stock / Vencida / Stock repuesto / Fecha de vencimiento actualizada |
| `REWARD_UPDATED` (S4) | — | — | Una fila por campo que cambió (ejemplo: Stock: 0 → 20) |
| `MISSION_COMPLETED` (S5) | Sí | — | Misión · Puntos otorgados |
| `MISSIONS_EXPIRED` (S5) | — | — | Misiones vencidas |

Si un guardado de configuración no cambia ningún valor, igual se registra, con la fila "Cambios: Se guardó
sin modificar valores" (así lo hace el prototipo). `PUT /loyalty/configuration` (guardado completo)
registra una entrada **por cada sección** que cambió.

#### 3.9.4 `GET /api/auditoria`

| Query param | Tipo | Regla | Filtro de la UI |
|---|---|---|---|
| `actor` | `SYSTEM` o entero (`accountId`) | Exacto | "Realizado por": Todos / empleados / Sistema |
| `module` | `AuditModule` | | "Módulo" |
| `action` | `AuditAction` | Requiere `module` y debe pertenecerle | "Acción" |
| `documentType` | `DocumentType` | Por defecto `DNI` si viene `documentNumber` | "Tipo doc." |
| `documentNumber` | string (máx. 20) | Se normaliza igual que en clientes (sin puntos, espacios ni guiones, en mayúsculas). **Coincidencia parcial** (contiene), como en el prototipo (decisión #5): `3011` encuentra `30111222` | "N° doc. cliente" |
| `fromDate` / `toDate` | `YYYY-MM-DD` | Inclusivos, en hora de Argentina | "Fecha" |
| `date` | `YYYY-MM-DD` | Día exacto. No se combina con el rango | (no se usa en la UI; queda por compatibilidad) |
| `operationCode` | string (máx. 20) | Exacto, sin distinguir mayúsculas | (el prototipo lo tiene en el estado, pero no lo muestra; queda disponible) |
| `page` | entero ≥ 1 | Por defecto `1` | |
| `limit` | entero 1–100 | Por defecto `20`. La pantalla usa `10` | |

**Cómo la pantalla traduce el filtro "Fecha"** a `fromDate` y `toDate` (siempre en hora de Argentina):

| Opción | `fromDate` | `toDate` |
|---|---|---|
| Cualquiera | — | — |
| Hoy | hoy | hoy |
| Últimos 7 días | hoy − 6 | hoy |
| Este mes | día 1 del mes | hoy |
| Rango personalizado | día elegido como inicio | día elegido como fin (calendario de rango, con "Limpiar" y "Listo") |

Botón **Limpiar filtros**: vuelve todo a los valores por defecto.

**Respuesta `200`:**

```json
{
  "items": [
    {
      "id": 412,
      "createdAt": "2026-10-13T13:05:00.000Z",
      "actorType": "EMPLOYEE",
      "actorAccountId": 9,
      "performedBy": "Valeria Vitto",
      "module": "CONSUMPTIONS",
      "action": "CONSUMPTION_VOIDED",
      "description": "Anuló el consumo C-000131 de Martín Gómez",
      "affectedCustomer": {
        "customerId": 102,
        "name": "Martín Gómez",
        "documentType": "DNI",
        "documentNumber": "41987654"
      },
      "operationCode": "C-000131",
      "details": [
        { "label": "Código de operación", "value": "C-000131" },
        { "label": "Monto", "value": "$50.000" },
        { "label": "Puntos revertidos", "value": "−500 pts" },
        { "label": "Saldo resultante", "value": "-350 pts" },
        { "label": "Motivo", "value": "Consumo registrado al cliente equivocado." }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

**Tipo `AuditEntry`:**

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | entero | No | |
| `createdAt` | string ISO | No | Columna "Fecha y hora" (`dd/mm/aaaa hh:mm`, hora de Argentina) |
| `actorType` | `AuditActorType` | No | Define el ícono |
| `actorAccountId` | entero | Sí | `null` para `SYSTEM` |
| `performedBy` | string (máx. 200) | No | Columna "Realizado por" |
| `module` | `AuditModule` | No | Columna "Módulo" (badge) |
| `action` | `AuditAction` | No | |
| `description` | string (máx. 300) | No | Columna "Acción" |
| `affectedCustomer` | objeto | Sí | Bloque "Cliente afectado" del detalle |
| `operationCode` | string | Sí | |
| `details` | `{ label, value }[]` | No | Bloque "Detalle". Vacío = "Sin datos adicionales." |

**Orden:** `createdAt` descendente y, a igual fecha, `id` descendente.

**Pantalla:**
- **Columnas:** chevron · Fecha y hora · Realizado por · Módulo · Acción.
- **Fila expandible:** al hacer clic se despliegan "Cliente afectado" (si hay) y "Detalle".
- **Paginación:** "Mostrando 1–10 de N", con Anterior y Siguiente.
- **Sin resultados:** "No hay registros para los filtros seleccionados".

**Errores:** `400` (parámetro inválido, rango invertido, `date` junto con un rango, `action` sin `module`
o de otro módulo), `401`, `403`.

#### 3.9.5 `GET /api/auditoria/actores`

Opciones del filtro "Realizado por": todas las cuentas de **empleados** (activas e inactivas, porque una
persona dada de baja puede tener registros viejos), ordenadas por apellido.

```json
[
  { "accountId": 6, "name": "Denise Nagel", "role": "ADMIN", "active": true },
  { "accountId": 4, "name": "Diego Sosa", "role": "CASHIER", "active": false }
]
```

La pantalla arma la lista así: "Todos" + esta lista + "Sistema" (valor `SYSTEM`).

#### 3.9.6 Cambios en la base y en lo ya registrado

**Tabla `audit_logs`:** se reemplaza `category` y `action` por las columnas de este cuadro.

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `SERIAL` PK | No | Ya existe |
| `created_at` | `TIMESTAMPTZ(3)` | No | Ya existe |
| `actor_type` | enum `AuditActorType` | No | **Nueva** |
| `actor_account_id` | `INTEGER` | Sí | Ya existe. `NULL` para `SYSTEM` |
| `performed_by` | `VARCHAR(200)` | No | Ya existe. Snapshot del nombre o "Sistema" |
| `module` | enum `AuditModule` | Sí* | **Nueva**, reemplaza `category` |
| `action_code` | enum `AuditAction` | Sí* | **Nueva**, reemplaza el texto libre de `action` |
| `description` | `VARCHAR(300)` | Sí* | **Nueva** |
| `affected_customer_id` | `INTEGER` | Sí | **Nueva**. Sin FK, para no atar la tabla inalterable |
| `affected_customer_name` | `VARCHAR(161)` | Sí | **Nueva** (snapshot) |
| `document_type` | `DocumentType` | Sí | Ya existe (cliente afectado) |
| `document_number` | `VARCHAR(20)` | Sí | Ya existe |
| `operation_code` | `VARCHAR(20)` | Sí | **Nueva** |
| `details` | `JSONB` | No | Ya existe. Pasa a ser siempre un arreglo `[{label, value}]` (default `[]`) |

\* Solo pueden ser `NULL` las filas viejas sin equivalente (ver abajo). Para filas nuevas, el backend las
exige siempre.

**Índices:**
- `(created_at)` y `(document_type, document_number, created_at)` se mantienen.
- `(category, created_at)` pasa a `(module, created_at)`.
- `(performed_by, created_at)` pasa a `(actor_type, actor_account_id, created_at)`.
- Se agrega `(operation_code)`.
- Para la búsqueda parcial de documento (`document_number ILIKE '%…%'`), el índice de arriba no sirve. Con el volumen de La Vitto alcanza así. Si la consulta se pone lenta, agregar un índice GIN con la extensión `pg_trgm` sobre `document_number`.

**Cómo migrar lo que ya está registrado en la rama `feature/SCRUM-161`:**

| Texto actual (`action`) | Pasa a |
|---|---|
| Registro de empleado / Modificación de empleado / Baja lógica de empleado | `EMPLOYEE_CREATED` / `EMPLOYEE_UPDATED` / `EMPLOYEE_DEACTIVATED` |
| Registro de cuenta de usuario / Modificación de usuario / Baja lógica de cuenta de usuario | `USER_ACCOUNT_CREATED` / `USER_ACCOUNT_UPDATED` / `USER_ACCOUNT_DEACTIVATED` |
| Registro de cliente / Modificación de cliente / Baja lógica de cliente | `CUSTOMER_CREATED` / `CUSTOMER_UPDATED` / `CUSTOMER_DEACTIVATED` |
| Modificación de equivalencia de puntos / de vigencia de puntos / de bonificación por primer consumo | `POINTS_EQUIVALENCE_UPDATED` / `POINTS_VALIDITY_UPDATED` / `FIRST_CONSUMPTION_BONUS_UPDATED` |
| Modificación de configuración de puntos (PUT completo) | Una entrada por sección (de acá en adelante); las viejas, `POINTS_EQUIVALENCE_UPDATED` |
| Categoría `SESSION` (inicio y cierre de sesión) | **Se deja de registrar.** Las filas viejas quedan con `module = NULL` y el listado las excluye |
| Autorregistro de cliente | **Se deja de registrar** (el actor es un cliente). Filas viejas: `module = NULL` |
| Reactivación de cuenta de usuario | `USER_ACCOUNT_REACTIVATED` (se mantiene) |
| Alta lógica de cliente | **Desaparece** (no hay reactivación de clientes). Filas viejas: `module = NULL` |

> Como la tabla rechaza `UPDATE`, la migración **desactiva el trigger, completa las columnas nuevas y
> vuelve a activarlo**, todo en la misma migración. Es la única vez que se toca lo ya escrito. Si la base
> de producción todavía no tiene filas, alcanza con agregar las columnas.

**El listado filtra siempre `module IS NOT NULL`.**

**En el código:** hay que sacar las llamadas a `audit.capture` de `auth.controller.ts` (login y logout) y de
`customer-registration.controller.ts` (autorregistro), y la de `PATCH /customers/:id/activate`, que se
elimina. La de `PATCH /usuarios/:id/reactivate` **se queda**, con el código `USER_ACCOUNT_REACTIVATED`.

---

### 3.10 Vista del Cliente: inicio, historial, perfil y cerrar sesión

La vista es para celular. Tiene la barra superior "Vitto Club" con el **ícono de perfil** a la derecha, y la
barra inferior **fija** con las pestañas Inicio · Historial · Misiones (Próx.) · Canjes (Próx.).

> **Rutas `/customers/me…`:** son solo para el rol `CUSTOMER`. El `customerId` sale del token, **nunca**
> del body ni de la URL. Hay que declararlas en el controller **antes** que `/customers/:id`: si no, Nest
> toma `me` como id y responde `400`.

#### 3.10.1 Inicio — `GET /api/customers/me/puntos`

**Respuesta:** la misma que `GET /customers/:id/puntos` ([3.4.1](#341-get-apicustomersidpuntos)).

| Elemento | Contenido |
|---|---|
| Foto | Avatar (abre el perfil). La carga de foto queda para el **Sprint 4** (decisión #9): por ahora se muestra el avatar vacío y "Cambiar foto" deshabilitado |
| Saldo | "Puntos disponibles para canjear" y `balance` |
| Nivel | Badge "Nivel {X}" |
| Acumulados | "Puntos acumulados: **{lifetimePoints} pts**", barra de progreso y mensaje del nivel siguiente |
| Aviso (si `negativeBalance`) | "Tu saldo tiene un ajuste pendiente. Comunicate con el restaurante para regularizarlo." |
| Próximos vencimientos | Lista "{n} pts · vencen el {dd/mm/aaaa}" con `nextExpirations`. Vacío: "No tenés puntos por vencer." |
| Tarjeta | "Recompensas · El catálogo y los canjes van a estar disponibles próximamente." (Sprint 4) |

Con saldo negativo, cuando existan los canjes (Sprint 4), el botón "Canjear" queda deshabilitado con el
tooltip "Tenés un ajuste pendiente. Comunicate con el restaurante".

#### 3.10.2 Historial — `GET /api/customers/me/consumos` y `GET /api/customers/me/movimientos`

Mismos filtros y paginación que las versiones `/customers/:id/…`, sin `last24h`. Los ítems de
`movimientos` **no traen** `performedBy` ni el objeto `customer`. Los de `consumos` no traen
`registeredBy`, `voidedBy`, `canVoid` ni `voidableUntil`.

**"Historial de consumos"** (texto ya corregido en el prototipo el 20/10/2026):

| Dato | Fuente |
|---|---|
| Fecha | `createdAt` |
| Monto | `amount` |
| Puntos | `+totalPoints` pts |
| Estado | `status` → Registrado / Anulado |
| Sin datos | "Todavía no tenés consumos." |

**"Historial de puntos":**

| Dato | Fuente |
|---|---|
| Fecha | `createdAt` |
| Texto | Según el tipo (tabla de [2.2](#22-nuevos)) |
| Cantidad | `points` con signo |
| Estado | `lot.status` si viene (Vigente / Consumido / Vencido / Anulado). Es el dato "estado" que pide US-26 |
| Sin datos | "Todavía no tenés movimientos." |

#### 3.10.3 Mi perfil — `GET /api/customers/me`

Se abre desde el ícono de la barra superior. La flecha de "Volver" lleva a Inicio.

**Respuesta `200`:**

```json
{
  "id": 1,
  "firstName": "Marcos",
  "lastName": "Peralta",
  "documentType": "DNI",
  "documentNumber": "30111222",
  "email": "marcos.peralta@mail.com",
  "phone": "3547-555123",
  "dateOfBirth": "1990-05-14",
  "createdAt": "2026-06-05T13:00:00.000Z"
}
```

**Secciones de la pantalla:**

| Sección | Contenido |
|---|---|
| **Mis datos** (solo lectura, **texto**, sin inputs) | Foto con "Cambiar foto" (deshabilitado hasta el Sprint 4) · Nombre y apellido · Documento ("DNI 30111222") · Fecha de alta. Debajo: "Para cambiar estos datos, comunicate con el restaurante." |
| **Datos de contacto** (editables) | Teléfono (opcional) · Correo electrónico, con la ayuda "Este correo es el que usás para ingresar." · Fecha de nacimiento (opcional). Botones Cancelar y Guardar cambios, **deshabilitados si no hay cambios** |
| **Mi situación en el programa** | Saldo · Nivel · Acumulados (de `/customers/me/puntos`) y el aviso de saldo negativo |
| **Cambiar contraseña** | Ver [3.11.1](#3111-el-usuario-cambia-su-propia-contraseña) |
| **Cerrar sesión** | Botón al final |

#### 3.10.4 `PATCH /api/customers/me`

Se envía **solo lo que cambia**, con al menos un campo.

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `phone` | string \| null | No | Mismas reglas que clientes: hasta 30 caracteres, 8 a 15 dígitos, `+` solo al inicio. `null` o vacío lo borra |
| `email` | string | No | Formato válido, hasta 150 caracteres, se guarda en minúsculas. **No puede quedar vacío.** Único entre clientes **activos** y empleados **activos** |
| `currentPassword` | string | **Sí, si cambia `email`** | Contraseña actual, para confirmar el cambio del email de acceso (decisión #10). No vacía, máx. 64. Si `email` no cambia (o es el mismo, con otras mayúsculas o espacios), no hace falta y se ignora |
| `dateOfBirth` | string \| null | No | `YYYY-MM-DD`, no futura, año ≥ 1900. `null` la borra |

**No se puede cambiar:** `firstName`, `lastName`, `documentType`, `documentNumber` ni ningún otro campo. Si
llegan, `400 property X should not exist`. Solo el restaurante (Cajero o Administrador) los corrige.

**Efectos:**
- Si cambia el `email`, cambia también el **email de acceso** de la cuenta, en la misma transacción. La sesión actual sigue abierta.
- **No** se registra en auditoría: el actor es el cliente.

**Respuesta `200`:** el mismo cuerpo que `GET /customers/me`, ya actualizado.

**En la pantalla:** cuando el cliente modifica el correo, aparece debajo el campo **"Contraseña actual"**
(con mostrar/ocultar) y la ayuda "Para cambiar el correo con el que ingresás, confirmá tu contraseña." Si
vuelve el correo al valor original, el campo desaparece.

**Toast:** "Datos actualizados".

**Errores:**

| HTTP | Cuándo | Mensaje (bajo el campo) |
|---|---|---|
| 400 | Correo vacío | "Este campo es obligatorio" |
| 400 | Correo inválido | "Ingresá un correo válido, por ejemplo nombre@mail.com" |
| 400 | Teléfono inválido | "El teléfono tiene que tener entre 8 y 15 números" (el prototipo dice "mínimo 6": corregir) |
| 400 | Fecha futura o inválida | "La fecha no puede ser futura" / "Esa fecha no existe" |
| 400 | Campo no permitido | (no debería pasar desde la pantalla) |
| 400 | Cambió el correo y no mandó `currentPassword` | "Ingresá tu contraseña actual para cambiar el correo" |
| 400 `CURRENT_PASSWORD_INCORRECT` | La contraseña actual no coincide | "La contraseña actual es incorrecta" (bajo "Contraseña actual"). No se guarda ningún cambio, tampoco el teléfono ni la fecha |
| 409 `EMAIL_IN_USE` | Correo en uso por otro cliente activo, un empleado activo u otra cuenta activa | "Ese correo ya está registrado" |
| 429 `TOO_MANY_ATTEMPTS` | Más de 5 contraseñas incorrectas en 15 minutos (comparte el contador con el cambio de contraseña) | "Hiciste demasiados intentos. Probá de nuevo en unos minutos." |

#### 3.10.5 Cerrar sesión

Usa el endpoint existente `POST /api/auth/logout` (`204`, sin cuerpo).

**Diálogo:** "¿Querés cerrar sesión? Vas a salir de tu cuenta y volver a la pantalla de ingreso."
(Cancelar / Cerrar sesión). Es el mismo diálogo que usan el Cajero y el Administrador.

**Después de confirmar:** se borra el access token de memoria y el estado del usuario, y se va al login. Si
la llamada falla, se limpia igual.

---

### 3.11 Cambios de contraseña

Hay cuatro casos.

| Caso | Quién | Endpoint | Pantalla |
|---|---|---|---|
| El usuario cambia **su propia** contraseña | Cualquier rol autenticado (hoy, la pantalla existe solo para el Cliente) | **Nuevo** `PATCH /api/mi-cuenta/password` | Mi perfil → Cambiar contraseña, y la ventana de cambio obligatorio |
| El Administrador cambia la contraseña de un **empleado** | Administrador | Existente `PATCH /api/usuarios/:id` | Configuración → Empleados → empleado → Usuario del sistema → **Cambiar contraseña** |
| **Contraseña inicial** del cliente cargado en caja, y **cambio obligatorio** al primer ingreso | Lo hace el sistema al dar el alta; el cliente la cambia | `POST /api/customers` (crea la cuenta) + `PATCH /api/mi-cuenta/password` | Ventana "Cambiá tu contraseña" al ingresar |
| **Reactivación** de usuarios de empleados (se mantiene) | Administrador | Existente `PATCH /api/usuarios/:id/reactivate` | Configuración → Empleados → Reactivar usuario |

#### Política de contraseña de este sprint

La política única queda como **decisión a futuro** (decisión #12). Mientras tanto se aplica la regla que
**ya tiene el backend**, igual en todas las altas y todos los cambios:

| Regla | Mensaje |
|---|---|
| Obligatoria | "Este campo es obligatorio" |
| De 8 a 64 caracteres | "Tiene que tener entre 8 y 64 caracteres" |
| Máximo 72 bytes en UTF-8 | "La contraseña es demasiado larga" |
| Distinta del email (comparación literal) | "La contraseña no puede ser igual al mail" |
| En un cambio: distinta de la actual | "La nueva contraseña no puede ser igual a la actual" |
| En una cuenta de cliente: distinta de su número de documento (normalizado) | "La contraseña no puede ser tu número de documento" |
| No se normaliza (los espacios y las mayúsculas cuentan) | — |

La regla del documento es **nueva** y hace falta por la contraseña inicial ([3.11.3](#3113-contraseña-inicial-del-cliente-cargado-en-caja-y-cambio-obligatorio)):
sin ella, el cliente podría "cambiarla" por la misma y quedar con una contraseña que conoce cualquiera que
tenga su documento.

**Ayudas de pantalla:**
- **Mi perfil** dice "Mínimo 8 caracteres, con letras y números." Hasta que se decida la política, cambiar a **"Entre 8 y 64 caracteres. No puede ser tu mail ni tu número de documento."**
- **Empleados:** el generador (12 caracteres, con mayúscula, número y especial) cumple la regla, así que sigue igual. Pero la validación de la pantalla **no puede ser más estricta que el backend**: si el Administrador escribe la contraseña a mano, la pantalla solo exige la regla de arriba.

#### 3.11.1 El usuario cambia su propia contraseña

`PATCH /api/mi-cuenta/password` — requiere sesión (cualquier rol). Vive en el módulo `accounts`, que es
dueño de la contraseña.

**Body:**

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `currentPassword` | string | Sí | No vacía, máximo 64 caracteres. En el primer cambio del cliente cargado en caja, es su número de documento |
| `newPassword` | string | Sí | Política de arriba |

La **confirmación** ("Confirmar nueva contraseña") la valida **solo el frontend**: no viaja al backend.

**Qué hace, en una transacción:**
1. Verifica `currentPassword` contra el hash.
2. Valida `newPassword`.
3. Guarda el hash nuevo (bcrypt).
4. Pone `mustChangePassword = false`.
5. **Cierra todas las otras sesiones** de esa cuenta. La actual (la de la cookie `refresh_token`) sigue abierta.
6. No se audita si la cuenta es de un cliente. Si es de un empleado, sí: `USER_ACCOUNT_UPDATED` con actor = el propio empleado (cuando exista la pantalla).

**Respuesta:** `204` sin cuerpo.

**Errores:**

| HTTP / `code` | Cuándo | Mensaje (bajo el campo) |
|---|---|---|
| 400 `CURRENT_PASSWORD_INCORRECT` | La actual no coincide | "La contraseña actual es incorrecta" (bajo "Contraseña actual") |
| 400 | No cumple la política | El mensaje de la regla (bajo "Nueva contraseña") |
| 400 `PASSWORD_SAME_AS_CURRENT` | Nueva = actual | "La nueva contraseña no puede ser igual a la actual" |
| 400 `PASSWORD_SAME_AS_DOCUMENT` | Cliente: nueva = su número de documento | "La contraseña no puede ser tu número de documento" |
| 401 `UNAUTHENTICATED` | Sin sesión | — |
| 429 `TOO_MANY_ATTEMPTS` | Más de 5 contraseñas actuales incorrectas en 15 minutos para la misma cuenta | "Hiciste demasiados intentos. Probá de nuevo en unos minutos." |

> **Es `400` y no `401` a propósito:** un `401` haría que el interceptor del frontend intente renovar la
> sesión o mande al login a alguien que solo se equivocó de contraseña.

**Pantalla (Mi perfil → Cambiar contraseña):**
- **Campos:** Contraseña actual · Nueva contraseña (ayuda: "Entre 8 y 64 caracteres. No puede ser tu mail ni tu número de documento.") · Confirmar nueva contraseña. Cada uno con su ícono para mostrar u ocultar.
- **Error de confirmación** (frontend): "Las contraseñas no coinciden".
- **Botón:** Cambiar contraseña.
- **Toast:** "Contraseña actualizada". Los campos se vacían.

#### 3.11.2 El Administrador cambia la contraseña de un empleado

Usa el endpoint existente `PATCH /api/usuarios/:id` con `{ "password": "..." }`. El rol **no** viaja: se
cambia desde `PATCH /empleados/:id`.

**Cambios de este sprint:**
- **Cierra todas las sesiones** de esa cuenta (la contraseña vieja deja de servir y quien estaba conectado tiene que volver a ingresar).
- Registra la auditoría `USER_ACCOUNT_UPDATED` con "Contraseña: Modificada".
- La política es la de arriba (sin cambios respecto de hoy).

**Pantalla (ya existe):**
- **Texto:** "Vas a cambiar la contraseña de **{nombre}**. La anterior deja de funcionar en cuanto guardes."
- **Campos:** Usuario (mail, solo lectura) y Nueva contraseña, generada automáticamente, con botones "Generar otra" y "Copiar".
- **Después de guardar:** "Se cambió la contraseña de **{nombre}**. La anterior ya no sirve para ingresar.", la contraseña con botón "Copiar" y la nota "Pasásela al empleado ahora: después no se vuelve a mostrar."

**Errores:** `400` (política), `404`, `409` (cuenta inactiva: no se cambia la contraseña de una cuenta dada de baja).

#### 3.11.3 Contraseña inicial del cliente cargado en caja y cambio obligatorio

**Decisión #7:** cuando el **Cajero** ("Nuevo cliente") o el **Administrador** ("+ Registrar cliente") dan de
alta un cliente, se le crea la cuenta con **contraseña inicial = su número de documento**. Apenas ingresa,
se abre una ventana para cambiarla. También puede cambiarla cuando quiera desde Mi perfil.

**Cambio en `POST /api/customers`** (el body no cambia):

1. Crea el `Customer`, como hasta ahora.
2. **En la misma transacción**, crea su `Account` con:
   - Rol `CUSTOMER` y el email del cliente.
   - Hash de la contraseña inicial: el `documentNumber` **normalizado**, es decir, el que devuelve la API (`38456123`; para pasaportes, en mayúsculas: `AB123456`).
   - `mustChangePassword = true`.
3. Si la cuenta no se puede crear (por ejemplo, el email lo usa otra cuenta activa), no se crea nada: `409 EMAIL_IN_USE`.

**Cómo se hace sin romper la arquitectura:** `customers` no puede importar `accounts` (ciclo, ver ADR 005).
Se usa el mismo mecanismo que la baja de empleados: `customers` publica el evento **`customer.created`**
dentro de su transacción y `accounts` lo escucha y crea la cuenta en esa misma transacción. Si el listener
falla, se deshace todo.

**La contraseña inicial no pasa por la política:** un DNI de 7 dígitos tiene menos de 8 caracteres. Es
temporal y la crea el sistema, así que queda exenta. La política se aplica cuando el cliente la cambia.

**Respuesta `201`:** el `Customer`, como hasta ahora. No se devuelve la contraseña: es el documento, que la
pantalla ya conoce.

**Mensaje en pantalla (Caja y Administración):** "Cliente registrado. Ingresa con su mail y su número de
documento como contraseña; al entrar se le va a pedir que la cambie."

**Auditoría:** `CUSTOMER_CREATED`, con la fila "Cuenta de acceso: Creada, contraseña inicial = número de
documento". Nunca se guarda el valor.

**El autorregistro no cambia:** el cliente elige su contraseña al registrarse y su cuenta nace con
`mustChangePassword = false`.

##### Login y refresh: campo nuevo

`POST /api/auth/login` y `POST /api/auth/refresh` agregan un campo en `user`:

| Campo | Tipo | Descripción |
|---|---|---|
| `mustChangePassword` | boolean | `true` mientras el cliente no haya cambiado la contraseña inicial. Siempre `false` para empleados y para clientes autorregistrados |

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "accountId": 31,
    "role": "CUSTOMER",
    "customerId": 103,
    "email": "sofia.rios@gmail.com",
    "firstName": "Sofía",
    "lastName": "Ríos",
    "mustChangePassword": true
  }
}
```

##### Ventana "Cambiá tu contraseña"

Se abre **cada vez que el cliente ingresa** (login o recarga de la página, vía `refresh`) mientras
`mustChangePassword` sea `true`. Se muestra antes que el Inicio, encima de todo.

| Elemento | Contenido |
|---|---|
| Título | "Cambiá tu contraseña" |
| Texto | "Por seguridad, cambiá la contraseña que te dio el restaurante (tu número de documento) por una propia." |
| Campos | Contraseña actual (con la ayuda "Es tu número de documento, sin puntos.") · Nueva contraseña · Confirmar nueva contraseña |
| Botones | **Cambiar contraseña** (principal) · **Ahora no** (secundario) |
| Al cambiarla | Llama a `PATCH /api/mi-cuenta/password`; toast "Contraseña actualizada"; la ventana se cierra y no vuelve a aparecer |
| Con "Ahora no" | La ventana se cierra y el cliente usa la app normalmente. Puede cambiarla desde **Mi perfil → Cambiar contraseña**. La ventana vuelve a aparecer en el **próximo ingreso** |
| Errores | Los mismos de [3.11.1](#3111-el-usuario-cambia-su-propia-contraseña), bajo cada campo |

> **Interpretación de la decisión:** "debe abrirse una ventana" se tomó como que la ventana aparece
> siempre, pero se puede postergar, porque el cliente también puede cambiarla desde su perfil. Si se
> quiere que el cambio sea **obligatorio** (sin "Ahora no"), hay que sacar ese botón y que el backend
> responda `403 PASSWORD_CHANGE_REQUIRED` a cualquier endpoint del cliente salvo
> `PATCH /mi-cuenta/password` y `POST /auth/logout`.

**Seguridad:** el número de documento lo conoce más gente que el cliente (por ejemplo, quien lo atendió en
caja). Por eso:
- La ventana insiste en cada ingreso.
- Rige el límite de intentos de login (deuda técnica pendiente; ver el archivo de verificación).
- La nueva contraseña no puede ser el documento.

##### Clientes que ya existen sin cuenta

Los clientes cargados en caja **antes** de este cambio no tienen cuenta. La migración (o un script de una
sola vez) les crea la cuenta con el mismo criterio: contraseña inicial = documento y
`mustChangePassword = true`. Solo a los **activos**, y solo si su email no lo usa otra cuenta activa. Los
que choquen se listan para resolverlos a mano.

##### Si el Administrador corrige el documento

Ver [3.8.2](#382-ver-más-modal): si el cliente todavía tiene `mustChangePassword = true`, la contraseña
inicial pasa a ser el documento nuevo.

#### 3.11.4 Reactivación de usuarios de empleados

**Decisión #8:** se **mantiene** `PATCH /api/usuarios/:id/reactivate`. Lo que no existe es la reactivación de
**empleados** ni de **clientes**.

| Ítem | Regla |
|---|---|
| Quién | Administrador |
| Requisitos | La cuenta está inactiva (`409` si ya está activa). El empleado está activo (`409` si está dado de baja) |
| Email | Al reactivar, el email no puede estar en uso por **otra cuenta activa** (con la unicidad entre activos, un cliente nuevo pudo haberlo tomado). Si lo está: `409 EMAIL_IN_USE`, "El mail de este usuario ya lo usa otra cuenta activa." |
| Contraseña | Conserva la que tenía |
| Sesiones | Nacen de nuevo al ingresar (las viejas se cerraron en la baja) |
| Auditoría | `USER_ACCOUNT_REACTIVATED`, con "Estado del usuario: Inactivo → Activo" |
| Pantalla (ya existe) | Botón "Reactivar usuario" en el modal del empleado. Diálogo: "¿Reactivar el usuario de **{nombre}**? Va a poder volver a ingresar al sistema con la contraseña que tenía." |

Con esto, `accounts.employee_id` puede seguir siendo `UNIQUE`: un empleado tiene siempre la misma cuenta.

---

### 3.12 Modelo de datos nuevo

Los nombres de modelos van en inglés y PascalCase, y las columnas en `snake_case` con `@map`, igual que en
el schema actual.

#### `Consumption` → tabla `consumptions`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | `SERIAL` PK | No | El código visible `C-000141` se deriva del id |
| `customer_id` | `INTEGER` FK → `customers` | No | `onDelete: Restrict` |
| `amount` | `DECIMAL(12,2)` | No | `CHECK > 0` |
| `points` | `INTEGER` | No | `CHECK >= 0` |
| `bonus_points` | `INTEGER` | No | Default `0`, `CHECK >= 0` |
| `configuration_version` | `INTEGER` FK → `loyalty_program_configurations.version` | No | Snapshot RF-014 |
| `base_amount` | `DECIMAL(12,2)` | No | Snapshot de la equivalencia |
| `points_awarded` | `INTEGER` | No | Snapshot de la equivalencia |
| `notes` | `VARCHAR(255)` | Sí | |
| `status` | enum `ConsumptionStatus` | No | Default `REGISTERED` |
| `registered_by_account_id` | `INTEGER` FK → `accounts` | No | |
| `registered_by_name` | `VARCHAR(161)` | No | Snapshot del nombre del empleado |
| `created_at` | `TIMESTAMP(3)` | No | Default `now()` |
| `voided_at` | `TIMESTAMP(3)` | Sí | `CHECK`: los tres campos de anulación son todos nulos o todos con valor, según `status` |
| `voided_by_account_id` | `INTEGER` FK → `accounts` | Sí | |
| `voided_reason` | `VARCHAR(500)` | Sí | |

Índices: `(customer_id, created_at)`, `(created_at)`, `(registered_by_account_id, created_at)`, `(status)`.

#### `PointsLot` → tabla `points_lots`

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | `SERIAL` PK | No | |
| `customer_id` | `INTEGER` FK | No | |
| `consumption_id` | `INTEGER` FK, `UNIQUE` | Sí | Lote creado por un consumo |
| `initial_points` | `INTEGER` | No | `CHECK > 0` |
| `remaining_points` | `INTEGER` | No | `CHECK 0 <= remaining <= initial` |
| `accredited_at` | `TIMESTAMP(3)` | No | |
| `expires_at` | `TIMESTAMP(3)` | No | `accredited_at + vigencia` (snapshot) |
| `status` | enum `PointsLotStatus` | No | `ACTIVE`, `CONSUMED`, `EXPIRED` o `VOIDED` |
| `expired_at` | `TIMESTAMP(3)` | Sí | |

Índice para el vencimiento: `(status, expires_at)`.

#### `PointsMovement` → tabla `points_movements` (solo inserción, mismo trigger que auditoría)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `id` | `SERIAL` PK | No | |
| `customer_id` | `INTEGER` FK | No | |
| `type` | enum `PointsMovementType` | No | |
| `points` | `INTEGER` | No | `CHECK <> 0`. Signo según el tipo |
| `balance_after` | `INTEGER` | No | Puede ser negativo |
| `consumption_id` | `INTEGER` FK | Sí | Para `CONSUMPTION_CREDIT` y `VOID_REVERSAL` |
| `lot_id` | `INTEGER` FK | Sí | |
| `reason` | `VARCHAR(500)` | Sí | Obligatorio para `MANUAL_ADJUSTMENT` (`CHECK`) |
| `performed_by_account_id` | `INTEGER` FK | Sí | `NULL` = Sistema |
| `performed_by_name` | `VARCHAR(200)` | No | Snapshot o "Sistema" |
| `created_at` | `TIMESTAMP(3)` | No | |

Índices: `(customer_id, created_at)`, `(created_at)`, `(type, created_at)`.

#### `CustomerPoints` → tabla `customer_points` (una fila por cliente)

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `customer_id` | `INTEGER` PK, FK | No | Se crea con el cliente, o al primer movimiento |
| `balance` | `INTEGER` | No | Default `0`. Puede ser negativo. Invariante: `balance = Σ remaining (lotes ACTIVE) − debt` |
| `debt` | `INTEGER` | No | Default `0`, `CHECK >= 0`. Deuda por anulaciones de puntos ya gastados |
| `lifetime_points` | `INTEGER` | No | Default `0`, `CHECK >= 0`. Acumulados para el nivel |
| `updated_at` | `TIMESTAMP(3)` | No | |

Índice: `(lifetime_points)` para el filtro por nivel.

> **Concurrencia:** toda operación que mueve puntos toma `SELECT … FOR UPDATE` sobre la fila de
> `customer_points` del cliente antes de tocar lotes y saldo. Así dos cajeros no descuadran el saldo.

#### `LoyaltyProgramConfiguration` — columnas nuevas

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `silver_min_points` | `INTEGER` | No | Default `300`, `CHECK > 0` |
| `gold_min_points` | `INTEGER` | No | Default `800`, `CHECK > silver_min_points` |

#### `Account` — columna nueva

| Columna | Tipo | Nulo | Regla |
|---|---|---|---|
| `must_change_password` | `BOOLEAN` | No | Default `false`. `true` solo para cuentas de clientes creadas por Cajero o Administrador, hasta que cambien la contraseña |

#### Enums Prisma nuevos

`ConsumptionStatus`, `PointsLotStatus`, `PointsMovementType`, `AuditModule`, `AuditAction` y
`AuditActorType`. `Level` y `AdjustmentDirection` existen solo en la API: no se guardan.

#### Relaciones

```
Customer 1 ── 1 CustomerPoints
Customer 1 ── 0..N Consumption ── 0..1 PointsLot
Customer 1 ── 0..N PointsLot
Customer 1 ── 0..N PointsMovement ──> Consumption?, PointsLot?
Account  1 ── 0..N Consumption (registró / anuló)
LoyaltyProgramConfiguration (version) 1 ── 0..N Consumption
```

---

## 4. Información general

| | |
|---|---|
| **URL base** | `/api` relativa. En desarrollo, el proxy de Vite la manda a `http://localhost:3000`; en producción, un *rewrite* de Vercel |
| **Formato** | JSON. En `POST`, `PUT` y `PATCH` con cuerpo: `Content-Type: application/json` |
| **Autenticación** | `Authorization: Bearer <accessToken>` en todos los endpoints de este documento. El refresh token va en la cookie httpOnly `refresh_token` (`withCredentials: true`) |
| **Autorización** | `@Roles(...)` por endpoint. **Un endpoint sin `@Roles` ni `@Public` queda cerrado para todos**. Las reglas por rol (24 h del cajero, campos que no puede editar) se validan **en el backend**, no solo en la pantalla |
| **Campos desconocidos** | `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`: cualquier campo de más → `400 property X should not exist` |
| **Fechas de entrada** | Filtros por día en `YYYY-MM-DD`, interpretados en hora de Argentina (UTC−03:00), como ya hace la auditoría |
| **Fechas de salida** | ISO 8601 en UTC (`2026-10-16T18:40:00.000Z`). La pantalla las muestra en `dd/mm/aaaa hh:mm` hora de Argentina. Fechas sin hora (`dateOfBirth`, `expiresAt` de vencimientos) en `YYYY-MM-DD` |
| **Montos** | Número JSON con hasta 2 decimales. Sin código de moneda |
| **Puntos** | Siempre enteros. Con signo en los movimientos |
| **Paginación** | `page` (≥ 1, por defecto 1) y `limit` (1–100, por defecto 20). Respuesta `{ items, total, page, limit }` |
| **CORS** | `http://localhost:5173` con credenciales (pasar a variable de entorno para el deploy) |
| **Matriz de permisos** | Ver tabla abajo |

| Endpoints | Administrador | Cajero | Cliente |
|---|---|---|---|
| `/auth/*`, `/health` | público | público | público |
| `/customers` (listado, alta, `:id`, `by-document`, baja) | Sí | Sí | No |
| `/customers/:id/puntos`, `/consumos`, `/movimientos` | Sí | Sí (consumos y movimientos: últimas 24 h) | No |
| `/customers/:id/ajustes-de-puntos` | Sí | No | No |
| `/customers/me`, `/customers/me/*` | No | No | Sí |
| `/consumos/preview`, `POST /consumos`, `PATCH /consumos/:code/anular` | Sí | Sí | No |
| `GET /consumos`, `GET /consumos/:code` | Sí | **No** | No |
| `/movimientos-de-puntos` | Sí | No | No |
| `/loyalty/configuration/*` (incluye `levels`) | Sí | No | No |
| `/auditoria`, `/auditoria/actores` | Sí | No | No |
| `/empleados/*`, `/usuarios/*` | Sí | No | No |
| `/mi-cuenta/password` | Sí | Sí | Sí |

---

## 5. Convenciones de respuestas

**Éxito:**

| Operación | Código | Cuerpo |
|---|---|---|
| Consulta | `200` | El recurso o la página `{ items, total, page, limit }` |
| Alta (`POST /consumos`, `POST …/ajustes-de-puntos`) | `201` | El recurso creado y el resultado (saldo antes y después) |
| Modificación con resultado (`PATCH …/anular`, `PUT …/levels`, `PATCH /customers/me`) | `200` | El recurso actualizado |
| Acción sin resultado (`PATCH /mi-cuenta/password`, `POST /auth/logout`, `PATCH /customers/:id/deactivate`) | `204` | Sin cuerpo |

**Error** (mismo formato que el resto del backend):

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Solo podés anular consumos propios dentro de las 24 hs.",
  "path": "/api/consumos/C-000131/anular",
  "timestamp": "2026-10-16T18:40:00.000Z",
  "code": "VOID_NOT_ALLOWED",
  "details": [{ "field": "reason", "message": "…" }]
}
```

- `code` aparece solo en los errores que lo traen. **El frontend decide por `code`**, nunca por el texto.
- `message` puede ser un `string` o un `string[]` (errores de validación del DTO). Tratarlo como `string | string[]`.
- `details` aparece en los errores de reglas de dominio, para marcar el campo.
- **Mensajes en español** en todo lo nuevo. Esto resuelve en parte la deuda de idiomas mezclados.
- Los filtros de excepciones de los módulos nuevos (`consumptions`, `points`, `audit`) tienen que conocer el `403` y dejar pasar `code`.

**Códigos de error nuevos:**

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `CURRENT_PASSWORD_INCORRECT` | Cambio de contraseña con la actual mal |
| 400 | `PASSWORD_SAME_AS_CURRENT` | Nueva contraseña igual a la actual |
| 400 | `PASSWORD_SAME_AS_DOCUMENT` | Cliente: nueva contraseña igual a su número de documento |
| 403 | `VOID_NOT_ALLOWED` | Cajero anulando un consumo ajeno o con más de 24 h |
| 403 | `FORBIDDEN_FIELD` | Cajero intentando cambiar el documento de un cliente |
| 409 | `CUSTOMER_INACTIVE` | Operar puntos o consumos sobre un cliente dado de baja, o editarlo (`PATCH /customers/:id`) |
| 409 | `CONSUMPTION_ALREADY_VOIDED` | Anular un consumo ya anulado |
| 409 | `POINTS_EQUIVALENCE_NOT_CONFIGURED` | Registrar o previsualizar sin equivalencia configurada |
| 409 | `INSUFFICIENT_BALANCE` | Ajuste `SUBTRACT` mayor que el saldo |
| 409 | `EMAIL_IN_USE` | Email en uso por otro cliente o empleado activo, o por otra cuenta activa (incluye el alta de cliente con cuenta y la reactivación de usuarios) |
| 429 | `TOO_MANY_ATTEMPTS` | Demasiadas contraseñas actuales incorrectas (cambio de contraseña o de email) |

Los existentes siguen igual: `INVALID_CREDENTIALS`, `INVALID_SESSION`, `UNAUTHENTICATED`, `FORBIDDEN` y
`LAST_ADMIN`.

---

## 6. Códigos HTTP

| Código | Significado en este contrato |
|---|---|
| `200 OK` | Consulta o modificación correcta, con cuerpo |
| `201 Created` | Consumo o ajuste creado |
| `204 No Content` | Acción correcta sin cuerpo |
| `400 Bad Request` | Formato o regla de validación; campo desconocido; rango de fechas invertido; `action` sin `module`; contraseña actual incorrecta |
| `401 Unauthorized` | Sin token o token vencido (`UNAUTHENTICATED`). El frontend renueva la sesión y repite una sola vez |
| `403 Forbidden` | El rol no alcanza (`FORBIDDEN`) o regla de permiso de negocio (`VOID_NOT_ALLOWED`, `FORBIDDEN_FIELD`). No se reintenta |
| `404 Not Found` | Cliente, consumo o cuenta inexistente |
| `409 Conflict` | Estado incompatible: cliente inactivo, consumo ya anulado, sin equivalencia, email en uso, último administrador, saldo insuficiente |
| `429 Too Many Requests` | Límite de intentos |
| `500 Internal Server Error` | Inesperado. Mensaje genérico "Unexpected error." |

---

## 7. Cambios respecto del Sprint 2

| # | Dónde | Antes | Ahora |
|---|---|---|---|
| 1 | Auditoría | `category` (`SESSION`, `CUSTOMERS`, `EMPLOYEES`, `CONFIGURATION`), `action` texto libre, filtro `performedBy` por texto parcial | `module` y `action` como enums, `description`, `affectedCustomer`, `operationCode`, `details` como `{label, value}[]`, filtro `actor` exacto, nuevo `GET /auditoria/actores` |
| 2 | Auditoría | Se registraban inicio y cierre de sesión, autorregistro y reactivaciones | Ya no se registran sesión, autorregistro ni alta lógica de cliente. La reactivación de **usuarios** sí (`USER_ACCOUNT_REACTIVATED`) |
| 3 | `GET /customers` | Filtro `name`, orden por `id` | Agrega `q` (nombre, apellido o documento), `level`, `sort=lastName`. Los ítems agregan `balance`, `lifetimePoints` y `level` |
| 4 | `PATCH /customers/:id` | Sin motivo; el Cajero podía cambiar el documento | `reason` (obligatorio para el Administrador); documento solo lo cambia el Administrador |
| 5 | `PATCH /customers/:id/activate` | Existía | **Se elimina** |
| 6 | `PATCH /usuarios/:id/reactivate` | Existía | **Se mantiene**; controla el email entre cuentas activas y se audita |
| 7 | `CustomerStatusAction` | `DEACTIVATED`, `ACTIVATED` | Solo se escribe `DEACTIVATED`. `ACTIVATED` queda para filas viejas |
| 8 | `LoyaltyProgramConfiguration` | Sin niveles | `silverMinPoints`, `goldMinPoints` (versión nueva por cada cambio) |
| 9 | `PATCH /usuarios/:id` (contraseña) | Solo guardaba el hash | Cierra todas las sesiones de la cuenta y audita |
| 10 | Política de contraseña | 8–64, 72 bytes, distinta del email | Igual (la política única queda a futuro). Se agrega solo: en cuentas de cliente, distinta del número de documento |
| 11 | Unicidad de email | Clientes: entre activos. Empleados y cuentas: global | **Entre activos en las tres tablas**, y cruzado entre clientes y empleados activos (detalle en el archivo de verificación) |
| 12 | Sesión del cliente | Sin endpoints propios | `/customers/me*` y `/mi-cuenta/password` |
| 13 | Matriz de permisos | `/customers/*` = Administrador y Cajero | Se agregan las filas de [4](#4-información-general) |
| 14 | `POST /customers` | Creaba solo el cliente (sin cuenta: no podía ingresar a la app) | Crea también la cuenta, con contraseña inicial = documento y `mustChangePassword = true` (evento `customer.created`) |
| 15 | `Account` | Sin marca de cambio obligatorio | Columna `must_change_password`; `login` y `refresh` la devuelven en `user.mustChangePassword` |
| 16 | `PATCH /customers/me` (nuevo) | — | Cambiar el email exige `currentPassword` |

---

## 8. Observaciones

### 8.1 Diferencias del prototipo que este contrato corrige

| # | Prototipo | Contrato |
|---|---|---|
| 1 | La vista previa y el registro **no aplican la bonificación por primer consumo** (US-21, escenario 2) | Se aplica: `bonusPoints` |
| 2 | "Ver más" del Administrador permite **editar los puntos** del cliente | Se saca. Los puntos cambian solo con movimientos (ajuste con motivo) |
| 3 | Tarjetas, consumos y movimientos muestran "DNI" fijo aunque sea pasaporte | Mostrar `documentType` real |
| 4 | Historial del Cliente: "Historial de compras" (corregido en el prototipo el 20/10/2026) | "Historial de consumos" |
| 5 | Mi perfil valida teléfono "mínimo 6 números" | 8 a 15 dígitos, como el resto |
| 6 | Mi perfil exige "letras y números"; el registro no | Por ahora, la regla actual del backend en todas las pantallas; la política única queda a futuro ([3.11](#311-cambios-de-contraseña)) |
| 7 | El panel "Tipos de datos" de Auditoría tiene los campos viejos ("Date", "Empleado", "Filtro: acción") | Actualizar a los de [3.9.4](#394-get-apiauditoria) |
| 8 | Registrar cliente (Caja y Administración): "Recibirá un mail para definir su contraseña" | No hay mail: se crea la cuenta con contraseña inicial = documento y se pide cambiarla al ingresar ([3.11.3](#3113-contraseña-inicial-del-cliente-cargado-en-caja-y-cambio-obligatorio)) |
| 9 | El formulario nuevo de consumo no tiene "Observaciones" (US-21 las pide) | Agregar el campo opcional "Observaciones" (`notes`) |
| 10 | Columnas "Puntos" y "Saldo" en Clientes, sin explicar la diferencia | Se saca la columna "Puntos"; queda "Saldo" |
| 11 | Mi perfil cambia el correo sin pedir nada | Pide la contraseña actual |
| 12 | El filtro de auditoría no tiene la acción "Reactivó cuenta de usuario" | Agregarla al módulo Empleados |
| 13 | No existe la ventana de cambio de contraseña al primer ingreso | Agregarla ([3.11.3](#3113-contraseña-inicial-del-cliente-cargado-en-caja-y-cambio-obligatorio)) |

### 8.2 Reglas de negocio que el backend tiene que garantizar (no solo la pantalla)

- **Cajero:** no lista ni ve el detalle de Consumos (`403`). Solo ve consumos y movimientos de las últimas 24 h de un cliente buscado. Solo anula los suyos dentro de las 24 h.
- **Saldo:** no se calcula en el frontend. La vista previa y los saldos resultantes vienen del backend.
- **Puntos:** se calculan con la versión vigente y quedan en snapshot.
- **Movimientos y auditoría:** son inalterables.
- **Clientes inactivos:** son de solo lectura. No se registran consumos ni ajustes ni se editan. No hay reactivación de clientes ni de empleados (sí de usuarios).
- **Ajustes:** restar nunca deja el saldo negativo.
- **Contraseña inicial:** se crea con el alta en caja, en la misma transacción; el cliente no puede "cambiarla" por su documento.

### 8.3 Decisiones tomadas (17/10/2026)

| # | Tema | Decisión | Dónde impacta |
|---|---|---|---|
| 1 | ¿Un ajuste "Restar" puede dejar el saldo negativo? | **No**: `409 INSUFFICIENT_BALANCE`. El saldo negativo solo nace de una anulación | [3.5](#35-ajustar-puntos-us-24) |
| 2 | ¿Qué es "primer consumo" si el primero se anuló? | El primero `REGISTERED` vigente: si se anula, el siguiente vuelve a recibir la bonificación | [3.1.2](#312-get-apiconsumospreview--vista-previa) |
| 3 | ¿La bonificación suma a los puntos acumulados (nivel)? | **Sí** | [3.1.3](#313-post-apiconsumos--registrar), [3.4](#34-puntos-del-cliente-y-ficha-us-19-us-46) |
| 4 | Columna "Puntos" de Clientes | **Se saca** | [3.8](#38-clientes-del-administrador-pendiente-del-sprint-2) |
| 5 | Filtro "N° doc. cliente" de Auditoría | **Coincidencia parcial** | [3.9.4](#394-get-apiauditoria) |
| 6 | Observaciones del consumo | `notes` opcional y se agrega el campo a la pantalla | [3.1.3](#313-post-apiconsumos--registrar) |
| 7 | ¿Cómo entra a la app un cliente cargado en caja? | Se le crea la cuenta con **contraseña inicial = número de documento**. Al ingresar se abre una ventana para cambiarla; también puede cambiarla desde Mi perfil | [3.11.3](#3113-contraseña-inicial-del-cliente-cargado-en-caja-y-cambio-obligatorio) |
| 8 | Usuarios de empleados dados de baja | **Se mantiene la reactivación de usuarios** (no de empleados ni de clientes). `accounts.employee_id` sigue `UNIQUE` | [3.11.4](#3114-reactivación-de-usuarios-de-empleados), [3.9](#39-auditoría-ítem-aparte) |
| 9 | Foto de perfil del cliente | **Sprint 4** | [3.10](#310-vista-del-cliente-inicio-historial-perfil-y-cerrar-sesión) |
| 10 | Cambiar el email desde Mi perfil | **Pide la contraseña actual** | [3.10.4](#3104-patch-apicustomersme) |
| 11 | Estado de un lote cuyo consumo se anuló | `VOIDED` (Anulado). Revisada el 20/10/2026 por la máquina de estados Movimiento de puntos de la Definición del Producto (antes: `CONSUMED`, sin estado nuevo). Lo dispara solo US-22 | [3.2.2](#322-patch-apiconsumoscodeanular) |
| 12 | Política de contraseña única | **Decisión a futuro.** Mientras tanto rige la regla actual del backend (más "distinta del documento" para clientes) | [3.11](#311-cambios-de-contraseña) |

**Queda abierto (por la decisión #7):** si la ventana de cambio de contraseña se puede postergar ("Ahora no")
o es obligatoria. El contrato la toma como **postergable**; la variante obligatoria está descripta en
[3.11.3](#3113-contraseña-inicial-del-cliente-cargado-en-caja-y-cambio-obligatorio).

### 8.4 Implementación sugerida

- **Módulos nuevos:**
  - `consumptions` (consumos, vista previa, anulación).
  - `points` (lotes, movimientos, saldo, ajustes, vencimiento y cálculo de nivel).
- **Comunicación entre módulos:** `points` expone `PointsService` con `acreditar`, `revertir`, `ajustar`, `vencerLotes` y `resumen`. `consumptions` lo usa dentro de la misma transacción ambiente (`PrismaTransactionRunner`). Se evita el ciclo: `consumptions → points → loyalty`, y `points` no importa `consumptions`.
- **Dependencia:** agregar `@nestjs/schedule` para el vencimiento.
- **Alta de cliente con cuenta:** `customers` publica `customer.created` dentro de su transacción (con `customerId`, email y documento normalizado). `accounts` lo escucha y crea la cuenta con `mustChangePassword = true`, igual que con `employee.deactivated`. Así no aparece el ciclo `customers` ↔ `accounts`.
- **Tests e2e mínimos:**
  - Registrar con y sin bonificación.
  - Anular propio < 24 h, propio > 24 h, ajeno (Cajero), cualquiera (Administrador) y ya anulado.
  - Saldo negativo y regularización a 0.
  - Vencimiento parcial y total.
  - Nivel que sube y baja.
  - Auditoría de cada acción y que **no** registre sesión ni acciones del cliente.
  - `/customers/me` con otro rol (`403`).
  - Cambio de contraseña: actual incorrecta, igual a la actual e igual al documento.
  - Alta de cliente en caja: crea la cuenta; login con el documento devuelve `mustChangePassword: true`; después de cambiarla, `false`.
  - Cambio de email desde Mi perfil sin contraseña y con contraseña incorrecta.
  - Ajuste "Restar" mayor que el saldo (`409`).
  - Reactivación de usuario con el email tomado por otra cuenta activa (`409`).

---

## 9. Resumen por historia

| US | Título | RF | Endpoints | Pantallas |
|---|---|---|---|---|
| US-19 | Consultar cliente | RF-017 / RF-025 / RF-029 | `GET /customers/:id`, `GET /customers/:id/puntos`, `GET /customers/me`, `GET /customers/me/puntos`, `GET /customers` (Administrador) | Ficha del cliente, Inicio del Cliente, Clientes del Administrador |
| US-21 | Registrar consumo y cálculo automático de puntos | RF-019 / RF-020 / RF-023 | `GET /customers/by-document`, `GET /consumos/preview`, `POST /consumos` | Buscar cliente, Consumo registrado |
| US-22 | Anular consumo | RF-021 | `GET /customers/:id/consumos`, `PATCH /consumos/:code/anular` | Buscar cliente → Ver movimientos de las últimas 24 hs; Consumos → detalle |
| US-23 | Consultar consumos | RF-022 | `GET /consumos`, `GET /consumos/:code`, `GET /customers/:id/consumos`, `GET /customers/me/consumos` | Consumos (Administrador), ficha, Historial del Cliente |
| US-24 | Ajustar puntos | RF-024 | `POST /customers/:id/ajustes-de-puntos` | Ficha del cliente → modal Ajustar puntos |
| US-25 | Vencimiento automático de puntos | RF-026 | Proceso diario (sin endpoint); se ve en `nextExpirations` y en movimientos `EXPIRATION` | Inicio del Cliente, ficha, Movimientos de puntos |
| US-26 | Consultar movimientos de puntos | RF-027 | `GET /movimientos-de-puntos`, `GET /customers/:id/movimientos`, `GET /customers/me/movimientos` | Movimientos de puntos (Administrador), ficha, Historial del Cliente |
| US-27 | Configurar niveles | RF-028 | `GET`/`PUT /loyalty/configuration/levels` | Configuración → Puntos → Niveles |
| US-17 | Registrar cliente (ajuste) | RF-015 | `POST /customers` ahora crea la cuenta con contraseña inicial | Caja → Nuevo cliente; Clientes → + Registrar cliente |
| US-46 | Identificar cliente en mostrador | Deriva de RF-017 (RNF-2) | `GET /customers/by-document`, `GET /customers/:id/puntos` | Buscar cliente |
| US-57 | Registrar auditoría | RF-062 | Escritura interna en cada operación ([3.9.3](#393-qué-se-guarda-en-el-detalle-de-cada-acción)) | — |
| US-58 | Consultar auditoría | RF-063 | `GET /auditoria`, `GET /auditoria/actores` | Auditoría |
| — | Clientes del Administrador (pendiente del Sprint 2; cubre US-19 del lado del Administrador, US-18 y US-20) | RF-016 / RF-017 / RF-018 | `GET /customers`, `PATCH /customers/:id`, `PATCH /customers/:id/deactivate`, `POST /customers` | Clientes → Ver más / Ver ficha / Registrar cliente |
| **US-59 (nueva)** | Ver y editar mi perfil, cambiar mi contraseña (también la inicial, con la ventana de cambio al ingresar) y cerrar sesión | **RF-065 (nuevo)**\* | `GET`/`PATCH /customers/me`, `PATCH /mi-cuenta/password`, `POST /auth/logout`, campo `mustChangePassword` del login | Mi perfil, ventana "Cambiá tu contraseña" |
| — | Cambio de contraseña y reactivación de usuario de empleado (ajuste de US-06 y US-07) | RF-06 / RF-07 | `PATCH /usuarios/:id`, `PATCH /usuarios/:id/reactivate` | Configuración → Empleados → Cambiar contraseña / Reactivar usuario |

\* **RF-064 ya está tomado** por el registro de clientes (SCRUM-160). Por eso la historia de perfil usa
**RF-065**. Hay que agregar US-59 y RF-065 al Product Backlog y a la Definición del Producto, y marcar al
Cliente como rol de esa historia en la tabla de Roles del Sistema.
