# Historias del Sprint 4: qué hay que hacer y cómo se acepta

> **Para qué es este archivo.** No usamos Jira, así que este es el tablero del sprint:
> - **quién hace qué:** sección 0;
> - **en qué orden:** sección 1;
> - **qué falta decidir:** sección 2;
> - **qué tiene que cumplir cada historia para darla por terminada:** sección 3.
>
> **Este archivo dice QUÉ hay que lograr. El CÓMO exacto está en el contrato**
> (`docs/sprint-4/API_CONTRACT_SPRINT_4.md`) y, para las pantallas, en el prototipo
> (`docs/prototipo/v2/`). Si un criterio de acá choca con el contrato, **manda el contrato**. Hay que
> avisar para corregir este archivo.
>
> **Versión 1.1 (27/10/2026):** foto de la recompensa al Sprint 5; filas de Recompensas y Canjes sin
> botones (clic → modal); buscadores de cliente por tipo y número de documento; recompensa por nombre en
> Canjes. Se agrega el ítem **CLI-DOC**.

## Cómo se usa

**Equipo**

1. **Anotate.** Poné tu nombre en la tabla de la sección 0, en la capa que te toca (backend o frontend), y
   el nombre de tu rama.
2. **Pedile la historia a Claude:** `/historia US-40 backend Tu-Nombre`. Si preferís escribirlo a mano, usá
   la plantilla de la sección 8 de `CLAUDE.md`.
3. **Leé el Plan previo que te manda Claude antes de decirle que siga.** Revisá que:
   - liste **todos** los criterios CA de tu historia;
   - cite datos concretos del contrato;
   - no tenga dudas sin responder.
4. **Cuando termines, actualizá el estado** en la tabla de la sección 0.
5. **Si un criterio está mal o falta algo:**
   - no lo cambies acá directamente;
   - avisá al grupo;
   - primero se corrige el contrato y después este archivo.

**Claude**

- Hacé solo la historia y la capa del pedido.
- Cumplí todos sus criterios: los `[B]` si sos backend; los `[F]` si sos frontend; los `[B+F]`, en la parte
  que te toca.
- Si la historia tiene algo en la sección 2 (pendientes) que la afecta, **preguntá antes de empezar**.
- Si un dato de la tabla de la sección 0 que necesitás está vacío, **preguntá**.
- **Las pantallas buenas del prototipo** son los componentes `Recompensas.html`, `GestionCanjes.html`,
  `CanjePorCodigo.html`, `CanjeAccion.html` y `ClienteCanjes.html`, más el panel de `RegistrarConsumo.html`.
  La lógica vieja de canjes que quedó en `pagina-principal.html` (estado "Pendiente", 30 minutos,
  reintegros) **no se usa** (contrato §8.1 #5).

**Etiquetas de los criterios**

| Etiqueta | Quién lo cumple |
|---|---|
| `[B]` | Backend |
| `[F]` | Frontend |
| `[B+F]` | Las dos capas: el backend devuelve el dato o el error, y el frontend lo muestra |

**Las cinco reglas del sprint** (contrato, encabezado y decisión S4-1). Si una historia parece pedir otra
cosa, manda esto:

1. El canje nace **Confirmado**.
2. Confirmar **no descuenta nada**.
3. Dura **15 minutos**.
4. Puntos y stock se descuentan **al registrar el uso**, y ahí se valida contra la base.
5. Cancelar, rechazar y vencer **no reintegran nada**.

---

## 0. Asignaciones

**Estados:** Sin empezar · En curso · En revisión · Hecha.

| Ítem | Título | Backend: responsable | Backend: rama | Frontend: responsable | Frontend: rama | Carpeta del front | Estado |
|---|---|---|---|---|---|---|---|
| ARRASTRE-S3 | Cierre del Sprint 3 (`CIERRE_SPRINT_3.md`) | | | | | Según el ítem | Sin empezar |
| BASE-4 | Modelo de recompensas y canjes, módulos y `PointsService.canjear` | | | — (no tiene pantalla) | — | — | Sin empezar |
| US-34 | Crear recompensa | | | | | `features/rewards` | Sin empezar |
| US-35 | Editar recompensa | | | | | `features/rewards` | Sin empezar |
| US-36 | Activar / desactivar recompensa | | | | | `features/rewards` | Sin empezar |
| US-37 | Deshabilitar / habilitar automáticamente | | | — (no tiene pantalla propia) | — | — | Sin empezar |
| US-38 | Eliminar recompensa | | | | | `features/rewards` | Sin empezar |
| US-39 | Consultar catálogo de recompensas | | | | | `features/my-account` (pestaña Canjes) | Sin empezar |
| US-40 | Confirmar canje | | | | | `features/my-account` (Cliente) y `features/redemptions` (Caja) | Sin empezar |
| US-41 | Canjes por código | | | | | `features/redemptions` | Sin empezar |
| US-42 | Registrar uso del canje | | | | | `features/redemptions` (ventana compartida) y `features/cashier` (panel) | Sin empezar |
| US-43 | Rechazar / cancelar canje | | | | | `features/redemptions` (rechazar) y `features/my-account` (cancelar) | Sin empezar |
| US-44 | Vencer canje automáticamente | | | — (no tiene pantalla propia) | — | — | Sin empezar |
| US-45 | Consultar canjes | | | | | `features/redemptions` (Admin y Caja) y `features/my-account` (Mis canjes) | Sin empezar |
| CLI-DOC | Clientes: filtro por tipo y número de documento | | | | | `features/customers` | Sin empezar |
| NAV | Ajustes de navegación del 25/10 | — (no toca backend) | — | | | `app/` (layouts y router) y `features/customers` (ficha) | Sin empezar |

> **Ramas:** `<tipo>/US-XX-<descripcion-corta>`. Por ejemplo: `feature/US-40-confirmar-canje-back` o
> `feature/US-40-confirmar-canje-front`.

---

## 1. Orden y piezas compartidas

```text
BACKEND
  ARRASTRE-S3 (auditoría de consumos, trigger y CHECK de puntos, US-25 mergeada)
     │
     ▼
  BASE-4 ──┬──> US-34 ──> US-35 ──> US-36 ──> US-38
           │       └──> US-37 (reglas dentro de US-35 y US-42; proceso diario aparte)
           │
           └──> US-40 ──> US-41 ──> US-42 ──> US-43
                   │                   │
                   └──> US-44 <────────┘  (vencer al leer lo usan US-41, 42, 43 y 45)
                   └──> US-45
  US-36 y US-38 (desactivar/eliminar) ──> rechazo automático de canjes (US-43, parte Sistema)

FRONTEND
  Todo en paralelo con MSW, siguiendo el contrato. No espera al backend.
  NAV primero (menús y rutas), porque las demás pantallas cuelgan de ahí.
```

**Piezas compartidas.** Cada una tiene un solo dueño. Las demás historias la **usan**, no la reconstruyen.

| Pieza | Dueño | La usan |
|---|---|---|
| Tablas `rewards`, `redemptions`; columna `points_movements.redemption_id`; enums; `CHECK` e índices parciales | **BASE-4** | Todas |
| Módulos `rewards` y `redemptions` (esqueleto, repositorios, tipos `Reward` y `Redemption`) | **BASE-4** | US-34 a US-45 |
| `PointsService.canjear` (FIFO, movimiento `REDEMPTION`) | **BASE-4** | US-42 |
| Generador del código de canje | **BASE-4** | US-40 |
| "Vencer al leer" (`vencerVencidos`) y el barrido de 5 minutos | **US-44** | US-41, US-42, US-43, US-45 |
| Disponibilidad de la recompensa (`estaDisponible`, con la fecha de Argentina) | **BASE-4** | US-35, US-37, US-39, US-40, US-42 |
| Rechazo automático de canjes (`rechazarConfirmados(motivo)`) y listeners de `reward.deactivated`, `reward.deleted` y `customer.deactivated` | **US-43** | US-36, US-38, baja de clientes |
| Etiqueta de vencimiento ("Vence en {n} d", "Agotada", etc.) (frontend) | **US-39** | US-34, US-35 (listado), US-40 |
| Cuenta regresiva del canje (frontend) | **US-40** | US-41, US-42, US-45 |
| Ventana "Registrar uso del canje" (frontend) | **US-42** | Panel de Caja, Canjes por código, Canjes del Administrador |
| Ventana "Rechazar canje" con motivos rápidos (frontend) | **US-43** | Las mismas tres pantallas |
| Ventana "Canjear recompensa" de Caja con "¿Aplicar el canje ahora?" (frontend) | **US-40** | Panel de Caja |
| Modal "Crear / Editar recompensa" (frontend). La fila abre el modal; abajo tiene Desactivar/Activar, Eliminar, Cancelar y Confirmar cambios | **US-34** (formulario) y **US-35** (modo edición) | US-36 y US-38 agregan la acción de su botón |
| Modal "Canje {código}" (detalle con Cerrar, Rechazar y Aplicar) (frontend) | **US-45** | US-42 y US-43 (los botones abren sus ventanas) |

---

## 2. Pendientes que hay que decidir

**Claude: si tu historia figura en la columna "Afecta", preguntá antes de empezar.** Cuando el equipo
decida, se completa la columna "Decisión" y se corrige el contrato si hace falta.

| # | Pendiente | Afecta | Decisión |
|---|---|---|---|
| PD-1 | ~~Dónde se guardan las fotos de las recompensas~~ | — | **Cerrado:** la foto pasa al Sprint 5 (S4-17, 27/10, Deni) |
| PD-2 | ~~Foto de perfil del Cliente: ¿entra en el Sprint 4?~~ | — | **Cerrado:** pasa al Sprint 5 junto con la foto de la recompensa (27/10) |
| PD-3 | `GET /movimientos-de-puntos` quedó sin pantalla: ¿se mantiene? Propuesta: sí, hasta el Sprint 5 | NAV (solo si se decide borrarlo) | |
| PD-4 | Máquina de estados "Canje" de la Definición del Producto: `confirmarCanje()` figura en US-41 | Solo documentación | |
| PD-5 | Textos de US-43 y US-44 en el backlog ("reintegrando puntos…") y RF del Story Map | Solo documentación | |
| PD-6 | ¿Se avisa al Cliente cuando un canje suyo se rechaza? Propuesta: no en este sprint | US-43 | |

> **Corrección de `DECISIONES_PO_2026-10-25.md`:** la regla 2 de CANJE (validar saldo y stock "disponibles"
> al confirmar) **quedó reemplazada** por la decisión S4-2 del contrato: el saldo se valida solo en la
> pantalla al confirmar, y de verdad al usar. No es un pendiente: está decidido.

---

## 3. Historias

Formato de cada historia:

- **Ficha:** historia, roles, secciones del contrato, pantallas del prototipo, dependencias y lo que queda
  fuera de alcance.
- **Criterios de aceptación** (CA), escritos como *Dado / Cuando / Entonces*.
- **Casos de prueba** del backend y **recorrido** del frontend.
- **Antes de codear:** lo que hay que confirmar.

---

### ARRASTRE-S3 — Cierre del Sprint 3

**No tiene criterios propios.** Todo está en `docs/sprint-4/CIERRE_SPRINT_3.md` (las secciones 1 a 3 y 12-A
del borrador v0 del contrato del Sprint 4). Lo mínimo antes de BASE-4:

| Qué | Por qué bloquea |
|---|---|
| Mergear US-25 (vencimiento de puntos) | BASE-4 suma dos procesos más con `@nestjs/schedule` y el mismo patrón |
| Auditar `CONSUMPTION_REGISTERED` y `CONSUMPTION_VOIDED` | La auditoría de canjes copia ese patrón |
| Trigger de solo inserción y `CHECK` de `points_movements` | BASE-4 agrega un `CHECK` a la misma tabla |
| Decisiones D-02 y D-03 del 25/10 (permisos de `PATCH /customers` y documento) | La baja de clientes ahora rechaza canjes |

| Fila de `CIERRE_SPRINT_3.md` | Responsable | Rama | Estado |
|---|---|---|---|
| | | | |

---

### BASE-4 — Modelo de recompensas y canjes (solo backend)

| | |
|---|---|
| **Qué es** | No es una historia del backlog. Es la base que necesitan todas las del sprint. Se hace una sola vez, para que no haya varias migraciones sobre las mismas tablas |
| **Contrato** | §3.15 (modelo), §2 (enums), §3.1 (tipo `Reward` y "disponible"), §3.6 (tipo `Redemption` y código), §8.4 (módulos y `PointsService.canjear`) |
| **Depende de** | ARRASTRE-S3 (lo mínimo de la tabla de arriba) |
| **Fuera de alcance** | Los endpoints (cada historia tiene los suyos), la auditoría de cada acción y los procesos automáticos (US-37 y US-44) |

**Criterios de aceptación**

- **CA-B4.1 [B] Migración.** Crea, con las columnas, `CHECK` e índices de la §3.15:
  - las tablas `rewards` y `redemptions` (sin tabla de fotos: es del Sprint 5);
  - en `points_movements`, la columna `redemption_id` y su `CHECK`;
  - los enums `RewardStatus`, `RewardDisabledReason`, `RedemptionStatus` y `RedemptionOrigin`;
  - el índice único **parcial** del nombre de la recompensa.

  Después de migrar, un test consulta `pg_constraint` y `pg_indexes` y confirma que existen (en el Sprint 3
  los `CHECK` quedaron escritos en el contrato y no en la base).
- **CA-B4.2 [B] Restricciones en la base.** Dado un `INSERT` o `UPDATE` directo que viola una regla, entonces
  la base lo rechaza. Como mínimo:
  - `points = 0` o `stock = -1` en `rewards`;
  - `DISABLED` sin motivo, o `ACTIVE` con motivo;
  - dos recompensas no dadas de baja con el mismo nombre (sin distinguir mayúsculas);
  - un código de canje con `0`, `O`, `1` o `I`, o de otro largo;
  - un canje `REJECTED` sin motivo;
  - un movimiento `REDEMPTION` sin `redemption_id`.
- **CA-B4.3 [B] Nombre libre después de eliminar.** Dada una recompensa `DELETED` llamada "Brunch", cuando se
  inserta otra "brunch" `ACTIVE`, entonces la base la acepta.
- **CA-B4.4 [B] Disponibilidad.** `estaDisponible(reward, hoyArgentina)` devuelve `true` solo si
  `status = ACTIVE`, el stock es `null` o mayor que 0, y la fecha es `null` o mayor o igual que hoy. Tests
  unitarios con: stock `null`, stock 0, vence hoy (disponible), venció ayer (no disponible), `ACTIVE` vencida
  que el proceso todavía no marcó (no disponible).
- **CA-B4.5 [B] Código de canje.**
  - Genera 6 caracteres del alfabeto del contrato con `crypto.randomInt`.
  - Si choca con uno existente, reintenta (hasta 5 veces).
  - `normalizarCodigo(" k7mp-2x ")` devuelve `"K7MP2X"`.
  - Un código que no cumple el formato después de normalizar se trata como inexistente.
- **CA-B4.6 [B] `PointsService.canjear`.**
  - Dado un cliente con lotes de 100 (vence antes) y 200 pts, cuando se canjean 150, entonces el primer lote
    queda `CONSUMED` con 0 y el segundo `ACTIVE` con 150 (FIFO).
  - Se inserta un movimiento `REDEMPTION` por −150, con `balanceAfter`, `redemption_id` y la descripción
    "Canje: {recompensa}".
  - `lifetimePoints` **no cambia**.
  - Con `balance < points` o con deuda, responde `INSUFFICIENT_BALANCE` y no toca nada.
  - Toma `FOR UPDATE` sobre `customer_points` y respeta el invariante del Sprint 3
    (`balance = Σ remaining − debt`).
- **CA-B4.7 [B] Sin reintegro.** No existe ningún método para devolver puntos de un canje (no hay
  `reintegrar`). Un test de arquitectura o una revisión lo confirma.
- **CA-B4.8 [B] Módulos sin ciclos.** `redemptions` importa `rewards` y `points`; `rewards` no importa
  `redemptions`; `points` no importa ninguno de los dos.

**Casos de prueba (unitarios e integración):** los de CA-B4.4 a CA-B4.6, más la migración aplicada sobre una
base con datos del Sprint 3.


---

### US-34 — Crear recompensa

| | |
|---|---|
| **Historia** | Como Administrador, quiero crear una recompensa con nombre, descripción, imagen, puntos requeridos, stock y fecha de vencimiento, para incorporarla al catálogo. **La imagen se carga en el Sprint 5** (S4-17): en este sprint el campo dice "Próximamente" |
| **Roles** | Administrador |
| **Contrato** | §3.1 (tipo `Reward`), §3.2.1 (listado), §3.2.3 (crear y modal), §3.3 (foto: Sprint 5), §3.14 (`REWARD_CREATED`), decisiones S4-12, S4-17 y S4-19 |
| **Prototipo** | `Recompensas.html` (tabla, botón "+ Crear recompensa" y modal) |
| **Depende de** | BASE-4 |
| **Fuera de alcance** | Editar (US-35). Activar, desactivar y eliminar (US-36, US-38) |

**Criterios de aceptación**

- **CA-34.1 [B+F] Listado.**
  - `GET /recompensas` devuelve todas menos las dadas de baja, por última modificación, con `confirmedCount`.
  - La pantalla muestra las columnas de la §3.2.1: imagen genérica, nombre y descripción, puntos, stock
    ("Sin límite"), vencimiento ("No vence"), canjes confirmados, estado y un chevron (›).
  - **Las filas no tienen botones.** Un clic en la fila abre el modal de edición (US-35). Debajo del título:
    "Hacé clic en una recompensa para editarla, desactivarla o eliminarla.".
  - Buscar por nombre (sin mayúsculas ni tildes) y filtro de estado: Todas · Activas · Deshabilitadas ·
    Inactivas.
  - Paginado de a 10: "Mostrando 1–10 de N".
  - Vacío: "No hay recompensas para los filtros seleccionados."
- **CA-34.2 [B+F] Crear con todos los datos.** Dado el formulario completo (nombre, descripción, 150 pts,
  stock 20, vence en 30 días), cuando el Administrador guarda, entonces:
  - se crea en `ACTIVE`;
  - se audita `REWARD_CREATED` con "Puntos · Stock · Vencimiento";
  - la respuesta es `201`;
  - aparece primera en el listado, con el toast "Recompensa guardada.".
- **CA-34.3 [B+F] Sin límite y sin vencimiento.**
  - Dada la casilla "Sin límite de stock", se manda `stock: null` y el listado dice "Sin límite".
  - Dada la casilla "No vence", se manda `expiresAt: null` y el listado dice "No vence".
  - La auditoría guarda "Stock: Sin límite" y "Vencimiento: No vence".
- **CA-34.4 [B+F] Validaciones.** Cada una, en el backend y en la pantalla, con los mensajes de la §3.2.3:
  - nombre vacío o de más de 80;
  - descripción de más de 255 (con contador "n/255");
  - puntos 0, con decimales o más de 1.000.000;
  - stock 0 o más de 100.000 al crear;
  - stock vacío sin la casilla: "Completá este campo o marcá «Sin límite de stock».";
  - fecha anterior a hoy;
  - fecha vacía sin la casilla: "Elegí una fecha o marcá «No vence».".
- **CA-34.5 [B+F] Nombre repetido.** Dada una recompensa "Café + medialuna" que no está dada de baja, cuando
  se crea " café + MEDIALUNA ", entonces la respuesta es `409 REWARD_NAME_IN_USE` y la pantalla muestra "Ya
  existe una recompensa con ese nombre." debajo del campo.
- **CA-34.6 [F] Foto: Próximamente.** En el modal, "Foto que verán los clientes" muestra la imagen genérica, el
  botón "Elegir imagen" **deshabilitado** con la etiqueta "Próximamente" y la ayuda "La carga de imágenes llega
  en el Sprint 5. Mientras tanto, los clientes ven la imagen genérica.". No se manda ninguna foto y `photoUrl`
  vuelve siempre en `null`.
- **CA-34.7 [B] El servidor decide.** Un body con `status`, `usedCount`, `id` o fechas de creación responde
  `400 property X should not exist`.
- **CA-34.8 [B] Permisos.** Cajero y Cliente reciben `403` en `GET` y `POST /recompensas`. Sin token, `401`.

**Casos de prueba (e2e):**
- Crear completa, sin límite y sin vencimiento.
- Cada validación.
- Nombre repetido, y nombre de una dada de baja (`201`).
- `photoUrl` en `null`.
- Auditoría.
- Permisos.

**Recorrido del frontend:**
- Crear (con la foto en "Próximamente").
- Las dos casillas.
- Cada error.
- Buscar y filtrar.
- Paginado.
- Vacío.

---

### US-35 — Editar recompensa

| | |
|---|---|
| **Historia** | Como Administrador, quiero modificar los datos de una recompensa existente, para mantener actualizado el catálogo |
| **Roles** | Administrador |
| **Contrato** | §3.2.2, §3.2.4 (editar y modal), §3.4 (habilitar o deshabilitar al editar), §3.14 (`REWARD_UPDATED`, `REWARD_ENABLED`, `REWARD_DISABLED`), decisiones S4-14 y S4-19 |
| **Prototipo** | `Recompensas.html` → clic en la fila (mismo modal que US-34, en modo edición) |
| **Depende de** | US-34 (modal y validaciones) |
| **Fuera de alcance** | Cambiar el estado a mano (US-36) |

**Criterios de aceptación**

- **CA-35.0 [F] Modal de edición.** Dado el listado, cuando el Administrador hace clic en una fila, entonces se
  abre "Editar recompensa" con los datos cargados, "Estado: {badge} · Canjes confirmados: {n}" debajo del
  título y, abajo, **Desactivar** (o **Activar**) y **Eliminar** a la izquierda y **Cancelar** y **Confirmar
  cambios** a la derecha. No existe un botón "Editar".
- **CA-35.1 [B+F] Editar.** Dada una recompensa, cuando el Administrador cambia el stock de 0 a 20 y aprieta
  **Confirmar cambios**, entonces:
  - se guarda y sube a la primera fila del listado;
  - se audita `REWARD_UPDATED` con "Stock: 0 → 20";
  - si cambió más de un campo, hay una fila por cada uno.
- **CA-35.2 [B] Sin cambios.** Dado un `PATCH` con los mismos valores, entonces responde `200` y **no**
  audita. Un body vacío responde `400` "Indicá al menos un campo para modificar.".
- **CA-35.3 [B+F] Stock y canjes confirmados.**
  - Dada una recompensa con 2 canjes confirmados vigentes, el modal muestra "Hay 2 canjes confirmados. El stock
    no puede ser menor a 2.".
  - Si se guarda stock 1: `409 STOCK_BELOW_CONFIRMED` "El stock no puede ser menor a los 2 canjes
    confirmados.".
  - Al editar sí se acepta stock 0 si no hay confirmados.
- **CA-35.4 [B+F] Cambiar los puntos no afecta lo confirmado.**
  - Dado un canje confirmado por 150 pts, cuando la recompensa pasa a 200, entonces al registrar el uso se
    descuentan **150**.
  - El modal muestra siempre "Los canjes ya confirmados mantienen los puntos con los que se pidieron.".
- **CA-35.5 [B+F] Vuelve a estar disponible.**
  - Dada una recompensa Deshabilitada · Agotada, cuando se repone el stock, entonces pasa a `ACTIVE`, se audita
    `REWARD_ENABLED` (Sistema, "Motivo: Stock repuesto") y la respuesta trae `availabilityChange: "ENABLED"`.
  - Ídem con una Vencida a la que se le extiende la fecha o se marca "No vence" ("Motivo: Fecha de vencimiento
    actualizada").
  - Toast: "Recompensa guardada. La recompensa volvió a estar disponible.".
- **CA-35.6 [B+F] Queda deshabilitada.** Dada una Activa sin confirmados, cuando se guarda con stock 0,
  entonces pasa a `DISABLED` / `OUT_OF_STOCK`, se audita `REWARD_DISABLED` (Sistema, "Motivo: Sin stock") y el
  toast agrega " La recompensa quedó deshabilitada porque no tiene stock o está vencida.".
- **CA-35.7 [B] Inactiva sigue Inactiva.** Dada una Inactiva, editarla no le cambia el estado aunque quede
  disponible.
- **CA-35.8 [B+F] Vencida sin tocar la fecha.** Dada una recompensa vencida, cuando el Administrador edita
  otro campo y deja la fecha vieja, entonces la pantalla y el backend responden "La fecha no puede ser anterior
  a hoy." (tiene que cambiar la fecha o marcar "No vence").
- **CA-35.9 [F] Foto.** Igual que CA-34.6: "Próximamente".
- **CA-35.10 [B] Dada de baja.** `GET` o `PATCH` sobre una recompensa `DELETED` → `404` "No existe la
  recompensa.".
- **CA-35.11 [B] Permisos.** Como en CA-34.8.

**Casos de prueba (e2e):**
- Editar cada campo y verificar la auditoría.
- Sin cambios.
- Stock menor que los confirmados.
- Reponer stock habilita; extender la fecha habilita; stock 0 deshabilita.
- Inactiva no cambia.
- Puntos cambiados y uso de un canje viejo.
- `404`.

**Recorrido del frontend:** abrir desde la fila, editar con y sin confirmados, los tres toasts, la recompensa
vencida y Cancelar (no guarda).

---

### US-36 — Activar / desactivar recompensa

| | |
|---|---|
| **Historia** | Como Administrador, quiero activar o desactivar una recompensa, para controlar su disponibilidad sin eliminarla |
| **Roles** | Administrador |
| **Contrato** | §3.2.5 (activar), §3.2.6 (desactivar), §3.10.4 (rechazo automático), §3.14 (`REWARD_ACTIVATED`, `REWARD_DEACTIVATED`, `REDEMPTION_REJECTED`), decisiones S4-8 y S4-9 |
| **Prototipo** | `Recompensas.html` → clic en la fila → botones **Desactivar** (con diálogo) y **Activar** (sin diálogo) del modal |
| **Depende de** | US-34. El rechazo de canjes lo provee US-43 (si US-43 no está, el listener puede entrar en esta historia y US-43 lo reutiliza) |
| **Fuera de alcance** | Deshabilitar o habilitar por stock o fecha (US-37) |

**Criterios de aceptación**

- **CA-36.1 [B+F] Desactivar sin canjes.** Dada una recompensa Activa sin confirmados, cuando se confirma el
  diálogo "¿Desactivar **{nombre}**? Los clientes no la van a ver en el catálogo.", entonces pasa a
  `INACTIVE`, se audita `REWARD_DEACTIVATED` ("Estado: Activa → Inactiva") y el toast dice "Recompensa
  desactivada.".
- **CA-36.2 [B+F] Desactivar con canjes confirmados.**
  - Dada una recompensa con 2 canjes confirmados vigentes, el diálogo agrega en rojo "Hay 2 canjes confirmados
    de esta recompensa. Se van a rechazar automáticamente.".
  - Al confirmar, en una transacción: los 2 canjes pasan a `REJECTED` con motivo "Recompensa desactivada" y
    `resolvedBy` Sistema; se auditan 2 `REDEMPTION_REJECTED` (Sistema) y `REWARD_DEACTIVATED` con "Canjes
    rechazados: 2".
  - La respuesta trae `rejectedRedemptions: 2` y el toast agrega " Se rechazaron 2 canjes confirmados.".
- **CA-36.3 [B] Desde Deshabilitada.** Una Deshabilitada también se puede desactivar ("Estado: Deshabilitada →
  Inactiva") y pierde el `disabledReason`.
- **CA-36.4 [B+F] Activar disponible.** Dada una Inactiva con stock y sin vencer, cuando se aprieta Activar,
  entonces pasa a `ACTIVE`, se audita `REWARD_ACTIVATED` ("Estado: Inactiva → Activa") y el toast dice
  "Recompensa activada.".
- **CA-36.5 [B+F] Activar sin stock o vencida.** Dada una Inactiva con stock 0 (o vencida), cuando se activa,
  entonces queda `DISABLED` con su motivo, responde `200` (no es error), se audita "Estado: Inactiva →
  Deshabilitada" y el toast dice "Se activó, pero quedó deshabilitada porque no tiene stock o está vencida.
  Reponé el stock o extendé la fecha.".
- **CA-36.6 [B] Transiciones inválidas.** Activar una que no está Inactiva, o desactivar una Inactiva →
  `409 INVALID_REWARD_STATUS`.
- **CA-36.7 [F] Botón del modal según el estado.** En el modal de edición, Activa y Deshabilitada muestran
  "Desactivar"; Inactiva muestra "Activar". El diálogo de Desactivar se abre **encima** del modal; al
  confirmarlo se cierran los dos. Activar cierra el modal y muestra el toast.
- **CA-36.8 [B+F] Catálogo del Cliente.** Una Inactiva **no** aparece en `GET /customers/me/recompensas` ni
  en `GET /recompensas/disponibles`.
- **CA-36.9 [B] Permisos.** Como en CA-34.8.

**Casos de prueba (e2e):**
- Desactivar con 0 y con 2 confirmados (estados, motivos y auditorías).
- Desactivar una Deshabilitada.
- Activar disponible y no disponible.
- Transiciones inválidas.
- Ya no aparece en los catálogos.
- Usar un canje rechazado por la desactivación → `409 REDEMPTION_NOT_CONFIRMED`.

**Recorrido del frontend:** abrir desde la fila, Desactivar con y sin confirmados, Activar, los toasts y el
estado nuevo en la fila.

---

### US-37 — Deshabilitar / habilitar automáticamente (solo backend)

| | |
|---|---|
| **Historia** | Como Sistema, quiero marcar automáticamente una recompensa como agotada al llegar su stock a cero (o vencida al pasar su fecha), para evitar canjes que no se pueden entregar |
| **Roles** | Sistema |
| **Contrato** | §3.4 (reglas y proceso diario), §3.14 (`REWARD_DISABLED`, `REWARD_ENABLED`) |
| **Prototipo** | Las etiquetas "Agotada" y "Vencida" del catálogo y del listado; las filas de Auditoría |
| **Depende de** | BASE-4 |
| **Fuera de alcance** | Las reglas que se disparan al editar (están en US-35) y al usar (están en US-42): esta historia hace **el proceso diario** y la **función compartida** que las otras llaman |

**Criterios de aceptación**

- **CA-37.1 [B] Función compartida.** `reevaluarDisponibilidad(reward)` aplica la tabla de la §3.4 y audita
  `REWARD_DISABLED` o `REWARD_ENABLED` con actor Sistema y el motivo correcto. US-35 y US-42 la llaman; no
  repiten la lógica.
- **CA-37.2 [B] Proceso diario.** Dada una recompensa `ACTIVE` con `expiresAt` = ayer, cuando corre el proceso
  (00:05, hora de Argentina), entonces pasa a `DISABLED` / `EXPIRED` y se audita `REWARD_DISABLED` con
  "Motivo: Vencida".
- **CA-37.3 [B] Vence hoy no se toca.** Dada una recompensa que vence hoy, el proceso de hoy no la cambia
  (sigue canjeable hasta las 23:59).
- **CA-37.4 [B] Al iniciar.** El proceso corre también al levantar el servidor.
- **CA-37.5 [B] Por recompensa.** Si una falla, se deshace solo esa y el resto sigue. Correrlo dos veces no
  duplica auditorías.
- **CA-37.6 [B] Canjes de una recompensa vencida.** No se tocan; al intentar usarlos, `409
  REWARD_NOT_AVAILABLE`.
- **CA-37.7 [B] Variable y comando.** `REWARDS_EXPIRATION_CRON_ENABLED` (prendida por defecto, `false` en los
  e2e) y `npm run rewards:expire`. Documentar las dos en `docs/SETUP.md`.

**Casos de prueba (e2e o integración):**
- Vencida ayer, vence hoy y sin vencimiento.
- Idempotencia.
- Comando a demanda.
- Uso de un canje de una recompensa vencida.

---

### US-38 — Eliminar recompensa

| | |
|---|---|
| **Historia** | Como Administrador, quiero dar de baja lógicamente una recompensa, para retirarla del catálogo sin perder su historial |
| **Roles** | Administrador |
| **Contrato** | §3.2.7, §3.10.4, §3.14 (`REWARD_DELETED`), decisiones S4-8 y S4-13 |
| **Prototipo** | `Recompensas.html` → clic en la fila → botón **Eliminar** del modal (con diálogo encima) |
| **Depende de** | US-34; el rechazo automático de US-43 (o de US-36, si llegó antes) |
| **Fuera de alcance** | Recuperar una recompensa eliminada: **no existe** |

**Criterios de aceptación**

- **CA-38.1 [B+F] Eliminar.** Dada una recompensa en cualquier estado menos `DELETED`, cuando se confirma
  "¿Eliminar **{nombre}**? Va a dejar de aparecer en el catálogo y no se puede deshacer.", entonces pasa a
  `DELETED` con `deletedAt`, se audita `REWARD_DELETED` ("Estado: {antes} → Dada de baja") y el toast dice
  "Recompensa eliminada.".
- **CA-38.2 [B+F] Con canjes confirmados.** Igual que CA-36.2, con el motivo "Recompensa eliminada".
- **CA-38.3 [B] Desaparece.** Una `DELETED` no aparece en `GET /recompensas`, ni en los catálogos, ni se puede
  consultar o editar (`404`).
- **CA-38.4 [B] Conserva el historial.** Los canjes viejos de esa recompensa siguen mostrando su nombre
  (snapshot), y el buscador "Recompensa" de Canjes los encuentra por ese nombre.
- **CA-38.5 [B] Libera el nombre.** Después de eliminar "Brunch para dos", se puede crear otra con ese nombre.
- **CA-38.6 [F] Textos.** El botón dice **"Eliminar"**; el estado, en la auditoría y en los documentos, es
  **"Dada de baja"**; la acción del filtro de Auditoría es "Eliminó recompensa".
- **CA-38.7 [B] Permisos.** Como en CA-34.8. Eliminar dos veces → `404`.

**Casos de prueba (e2e):**
- Eliminar Activa, Deshabilitada e Inactiva.
- Con confirmados.
- `404` posteriores.
- Nombre liberado.
- Canje viejo con el nombre.
- Auditoría.

---

### US-39 — Consultar catálogo de recompensas

| | |
|---|---|
| **Historia** | Como Cliente, quiero consultar el catálogo de recompensas con su estado, puntos requeridos y stock, para decidir qué canjear |
| **Roles** | Cliente |
| **Contrato** | §3.1 (etiqueta de vencimiento y "disponible"), §3.5.1 (catálogo e Inicio), §2.5 (filtros), decisiones S4-2, S4-15 y S4-17 |
| **Prototipo** | `ClienteCanjes.html` → Catálogo; tarjetas de Inicio en `pagina-principal.html` |
| **Depende de** | US-34 |
| **Fuera de alcance** | Confirmar el canje (US-40) |

**Criterios de aceptación**

- **CA-39.1 [B] Qué trae.** `GET /customers/me/recompensas` devuelve `{ balance, items }` con las Activas y
  Deshabilitadas, nunca Inactivas ni dadas de baja. Una `ACTIVE` vencida que el proceso todavía no marcó viene
  como `DISABLED` / `EXPIRED`.
- **CA-39.2 [B+F] Filtros.**
  - "Todas": por puntos ascendentes.
  - "Más canjeadas": por `usedCount` (canjes **Utilizados**) descendente.
  - "Próx. a vencer": solo Activas que vencen en 7 días o menos, por fecha.
  - Vacío: "No hay recompensas disponibles por ahora." o "No hay recompensas que venzan en los próximos 7
    días.".
- **CA-39.3 [F] Tarjeta.** Imagen genérica (la foto es del Sprint 5), nombre, descripción (2 líneas), "{n} pts", etiqueta de
  vencimiento según la §3.1 ("Vence en 3 d" destacada; "Vence hoy"; "No vence"; "Agotada"; "Vencida") y
  **Canjear**.
- **CA-39.4 [F] Canjear deshabilitado** (lo decide la pantalla con `balance`):
  - Deshabilitada → deshabilitado.
  - `balance` 480 y la recompensa cuesta 900 → deshabilitado y debajo "Te faltan 420 pts".
  - `balance` negativo → deshabilitado, con el tooltip "Tenés un ajuste pendiente. Comunicate con el
    restaurante" y el aviso arriba del catálogo.
- **CA-39.5 [F] Encabezado y pie.** "Tenés **{saldo} pts** para canjear" arriba; al pie, "Al canjear recibís
  un código que dura 15 minutos. Los puntos se descuentan recién cuando lo usás en el local.".
- **CA-39.6 [F] Inicio.**
  - La tarjeta "Próximamente" pasa a "Recompensas · Mirá lo que podés canjear con tus {saldo} pts" con "Ver
    catálogo".
  - Si tiene canjes Confirmados vigentes, aparece "Tenés un canje para usar" con "Ver código" (abre Mis
    canjes).
  - La pestaña Canjes de la barra inferior deja de decir "Próx.".
- **CA-39.7 [B] Permisos.** Administrador y Cajero reciben `403` en `/customers/me/recompensas`.

**Casos de prueba (e2e):**
- Cada filtro, con Activas, Deshabilitadas, Inactivas y dadas de baja mezcladas.
- La que vence hoy está en "Próx. a vencer"; la que vence en 8 días, no.
- Vencida sin procesar.
- `balance` correcto.
- Permisos.

**Recorrido del frontend:**
- Saldo suficiente, insuficiente y negativo.
- Los tres filtros.
- Las etiquetas.
- Inicio con y sin canje para usar.

---

### US-40 — Confirmar canje

| | |
|---|---|
| **Historia** | Como Cliente, quiero solicitar el canje de una recompensa cuando tenga puntos suficientes, para obtenerla a cambio de mis puntos, generando un código único registrado en "Mis canjes". También lo puede hacer el Cajero en nombre del cliente, desde la caja |
| **Roles** | Cliente (app), Cajero y Administrador (Caja) |
| **Contrato** | §3.6 (código y tipo `Redemption`), §3.7 (confirmar y pantallas), §3.5.2 (recompensas del mostrador), §3.14 (`REDEMPTION_CONFIRMED`), decisiones S4-1, S4-2, S4-3, S4-5 y S4-6 |
| **Prototipo** | `ClienteCanjes.html` (modal Confirmar y "¡Canje confirmado!"); `CanjeAccion.html` (accion `confirmar`); panel de `RegistrarConsumo.html` ("Recompensas a las que puede acceder") |
| **Depende de** | BASE-4 y US-39 |
| **Fuera de alcance** | Registrar el uso (US-42). "¿Aplicar el canje ahora?" → "Sí" **llama** a US-42 |

**Criterios de aceptación**

- **CA-40.1 [B] Confirmar no descuenta.** Dado un cliente con 480 pts, cuando confirma una recompensa de 150,
  entonces:
  - se crea el canje `CONFIRMED`, con un código de 6 caracteres y `expiresAt = createdAt + 15 min`;
  - se guarda el snapshot de nombre y puntos;
  - el saldo **sigue en 480**;
  - no hay movimientos nuevos;
  - el stock no cambia;
  - la respuesta es `201 { redemption }`.
- **CA-40.2 [B] El backend no valida el saldo** (decisión S4-2). Dado un cliente con 100 pts, cuando se llama
  directo a la API por una recompensa de 400, entonces responde `201`. (La pantalla no lo deja; el uso va a
  fallar en US-42.)
- **CA-40.3 [B+F] Recompensa no disponible.** Dada una recompensa Inactiva, dada de baja, sin stock o vencida,
  la respuesta es `409 REWARD_NOT_AVAILABLE` (`404` si está dada de baja) y la pantalla muestra "Esta
  recompensa ya no está disponible." y refresca el catálogo.
- **CA-40.4 [B] Cliente dado de baja.** `409 CUSTOMER_INACTIVE` en la ruta del mostrador.
- **CA-40.5 [B] Origen y auditoría.**
  - Desde la app: `origin = APP`, `confirmedBy = null` y **no** se audita.
  - Desde la caja: `origin = COUNTER`, `confirmedBy` = el empleado del token, y se audita
    `REDEMPTION_CONFIRMED` (Código del canje · Recompensa · Puntos).
- **CA-40.6 [F] Modal del Cliente.**
  - Imagen genérica, nombre, descripción, "{n} pts".
  - "Saldo: {saldo} pts → {saldo − n} pts al usarlo".
  - El texto de la §3.7.2.
  - Cancelar · Confirmar.
- **CA-40.7 [F] "¡Canje confirmado!".**
  - Código grande, recompensa, puntos.
  - Cuenta regresiva **"Vence en 14:59"** calculada con `expiresAt`; "Vence en menos de 1 min" en el último
    minuto; en rojo con 2 minutos o menos.
  - "Presentá este código en caja.".
  - Botones "Volver al catálogo" y "Ver mis canjes".
- **CA-40.8 [F] Caja: Canjear.**
  - En el panel del cliente, "Recompensas a las que puede acceder" muestra solo las de
    `GET /recompensas/disponibles` con `points <= saldo` (el saldo que ya cargó la búsqueda).
  - Con saldo negativo, ninguna, y el texto "El cliente tiene un ajuste pendiente: no puede canjear.".
  - Canjear abre "Canjear recompensa" con "Confirmá que el cliente acepta el canje. Los puntos se descuentan
    cuando se registra el uso; el canje dura 15 minutos.".
- **CA-40.9 [F] "¿Aplicar el canje ahora?"** Después del `201`:
  - "Sí, aplicar" sigue con la ventana de registrar uso de US-42.
  - "No, después" cierra con el toast "Canje {código} confirmado. Se aplica cuando el cliente lo presente." y
    el canje aparece en "Canjes para usar ahora".
- **CA-40.10 [B] Permisos.**
  - `/customers/me/canjes` es solo del Cliente.
  - `POST /customers/:id/canjes` es solo de Cajero y Administrador.
  - Un Cliente no puede confirmar a nombre de otro (no hay `customerId` en su body: `400` si lo manda).

**Casos de prueba (e2e):**
- Confirmar desde la app y desde la caja: saldo, movimientos, stock y auditoría sin cambios, salvo
  `REDEMPTION_CONFIRMED` en la caja.
- Formato y unicidad del código.
- Recompensa en cada estado no disponible.
- Saldo insuficiente → `201`.
- Cliente inactivo.
- Permisos.

**Recorrido del frontend:**
- Cliente: confirmar y ver la cuenta regresiva.
- Caja: confirmar con "No, después" y con "Sí, aplicar".
- Los errores.

---

### US-41 — Canjes por código

| | |
|---|---|
| **Historia** | Como Cajero, quiero buscar un canje por el código que presenta el cliente, sin identificarlo por documento, para validar la entrega de la recompensa |
| **Roles** | Cajero y Administrador (desde **Caja**) |
| **Contrato** | §3.8 (endpoint y pantalla), §3.6.1 (normalización del código), §3.11 (vencer al leer), decisión S4-7 |
| **Prototipo** | `CanjePorCodigo.html` |
| **Depende de** | US-40 (para que haya canjes) y US-44 (vencer al leer) |
| **Fuera de alcance** | Aplicar (US-42) y rechazar (US-43): los botones **abren** sus ventanas |

**Criterios de aceptación**

- **CA-41.1 [B+F] Buscar.** Dado el código `k7mp 2x`, cuando el Cajero aprieta Buscar, entonces se busca
  `K7MP2X` y se muestra:
  - "Cliente": nombre y documento (tipo real);
  - "Recompensa": nombre, puntos y badge de estado;
  - con `CONFIRMED`: "Vence en {n} min" y los botones **Rechazar** y **Aplicar**.
- **CA-41.2 [B+F] No existe o mal escrito.** Un código que no existe o que no cumple el formato → `404` y
  "Código no encontrado.".
- **CA-41.3 [F] Vacío.** "Ingresá el código del canje." sin llamar al backend.
- **CA-41.4 [B+F] Vencido.** Dado un canje `CONFIRMED` con más de 15 minutos, cuando se busca, entonces el
  backend lo pasa a `EXPIRED` (y lo audita) **antes** de responder, y la pantalla muestra "El canje venció. El
  cliente tiene que pedirlo de nuevo." sin botones.
- **CA-41.5 [F] Otro estado final.** 'El canje ya está en estado "Utilizado".' (o el que sea), sin botones.
- **CA-41.6 [F] Menú.** "Canjes por código" está habilitado **solo en el menú de Caja**, para el Cajero y para
  el Administrador que entra a Caja (NAV).
- **CA-41.7 [B] Permisos.** El Cliente recibe `403`.

**Casos de prueba (e2e):**
- Código con minúsculas, espacios y guiones.
- Inexistente.
- Formato inválido.
- Cada estado.
- Vencido al leer (con auditoría).
- Permisos.

**Recorrido del frontend:** cada caso, más volver a buscar otro código sin recargar.

---

### US-42 — Registrar uso del canje

| | |
|---|---|
| **Historia** | Como Cajero, quiero marcar un canje confirmado como utilizado al entregar la recompensa, para dejar constancia de la entrega. Recién acá se descuentan los puntos y el stock |
| **Roles** | Cajero y Administrador |
| **Contrato** | §3.9 (endpoint, orden de bloqueos y pantallas), §3.12.2 (panel de Caja), §3.4 (stock a 0), §3.13.2 (movimiento), §3.14 (`REDEMPTION_USED`), decisiones S4-1 y S4-7 |
| **Prototipo** | `CanjeAccion.html` (accion `usar`); panel de `RegistrarConsumo.html` ("Canjes para usar ahora"); `CanjePorCodigo.html` (Aplicar); `GestionCanjes.html` (Aplicar) |
| **Depende de** | BASE-4 (`PointsService.canjear`), US-37 (función de disponibilidad), US-44 (vencer al leer) |
| **Fuera de alcance** | Rechazar (US-43): el botón "Rechazar canje" de los errores **abre** su ventana |

**Criterios de aceptación**

- **CA-42.1 [B] Descuento.** Dado un canje `CONFIRMED` de 150 pts de un cliente con 1.240 pts y la recompensa
  con stock 20, cuando se registra el uso, entonces en **una transacción**:
  - se descuentan 150 pts FIFO;
  - se inserta el movimiento `REDEMPTION` por −150 con `redemptionCode`;
  - `lifetimePoints` no cambia;
  - el stock pasa a 19 y `usedCount` suma 1;
  - el canje pasa a `USED`, con `resolvedBy`, `balanceBefore: 1240` y `balanceAfter: 1090`;
  - se audita `REDEMPTION_USED` (Código · Recompensa · Puntos descontados: −150 pts · Saldo resultante: 1.090
    pts).

  La respuesta es `200 { redemption, balanceBefore, balanceAfter }`.
- **CA-42.2 [B] Stock sin límite.** Con `stock: null`, el stock no cambia.
- **CA-42.3 [B] Último del stock.** Con stock 1, después del uso queda 0, la recompensa pasa a `DISABLED` /
  `OUT_OF_STOCK` y se audita `REWARD_DISABLED` (Sistema, "Motivo: Sin stock").
- **CA-42.4 [B+F] Saldo insuficiente.** Dado un cliente con 0 pts y un canje de 400 confirmado, la respuesta es
  `409 INSUFFICIENT_BALANCE`; el canje **sigue `CONFIRMED`**; la pantalla muestra "El cliente no tiene saldo
  suficiente para este canje. Podés rechazarlo." y el botón "Rechazar canje".
- **CA-42.5 [B+F] Recompensa no disponible.** Dada una recompensa que se quedó sin stock (o venció) después de
  confirmar, la respuesta es `409 REWARD_NOT_AVAILABLE`, el canje sigue `CONFIRMED` y la pantalla ofrece
  rechazarlo.
- **CA-42.6 [B+F] Vencido.** Dado un canje con más de 15 minutos, la respuesta es `409 REDEMPTION_EXPIRED`, el
  canje queda `EXPIRED` (confirmado en la base aunque la respuesta sea error) y la pantalla muestra "El canje
  venció. El cliente tiene que pedirlo de nuevo.".
- **CA-42.7 [B] Concurrencia.**
  - Dos usos en paralelo del mismo código: uno `200` y otro `409 REDEMPTION_NOT_CONFIRMED`.
  - Dos canjes (de dos clientes) sobre la última unidad: el primero `200`; el segundo `409
    REWARD_NOT_AVAILABLE`.
  - El saldo nunca se descuenta dos veces.
- **CA-42.8 [B] Puntos del canje.** Se descuenta `redemption.points` (snapshot), aunque la recompensa haya
  cambiado de precio.
- **CA-42.9 [B+F] Panel de Caja.**
  - `GET /customers/:id/canjes` devuelve solo los `CONFIRMED` vigentes, el que vence primero arriba.
  - El bloque "Canjes para usar ahora" muestra recompensa, puntos, "Código **{código}** · Vence en {n} min" y
    los botones **Rechazar** y **Registrar uso**.
  - Vacío: "No tiene canjes para usar.".
  - El panel se refresca después de cada acción.
- **CA-42.10 [F] Ventana "Registrar uso del canje {código}".**
  - El resumen y el texto de la §3.9.2.
  - Cancelar · Confirmar.
  - Resultado: "Canje {código} utilizado. Entregar: {recompensa}." y la tarjeta "Puntos descontados: −{n} pts ·
    Saldo: {antes} → {después} pts".
  - La misma ventana se usa desde el panel, desde Canjes por código y desde Canjes del Administrador.
- **CA-42.11 [B] Permisos.** El Cliente recibe `403`. Un `403` no se audita.

**Casos de prueba (e2e):**
- Uso correcto: saldo, lotes FIFO, movimiento, `lifetimePoints`, stock, `usedCount`, auditoría.
- Stock `null`.
- Última unidad.
- Saldo insuficiente y saldo negativo.
- Recompensa no disponible.
- Vencido.
- Las dos carreras de CA-42.7.
- Puntos cambiados.
- Permisos.

**Recorrido del frontend:**
- Uso desde los tres lugares.
- Cada error y el paso a "Rechazar canje".
- El panel actualizado.

---

### US-43 — Rechazar / cancelar canje

| | |
|---|---|
| **Historia** | Como Cajero (o Administrador), quiero rechazar un canje que no se puede entregar; como Cliente, quiero cancelar un canje que ya no quiero. **Sin reintegro**: no se había descontado nada (en el backlog todavía dice "reintegrando puntos y reponiendo stock", ver PD-5) |
| **Roles** | Cajero y Administrador (rechazar), Cliente (cancelar), Sistema (rechazo automático) |
| **Contrato** | §3.10 (rechazar, pantalla, cancelar y rechazos automáticos), §3.13.1 (baja de cliente), §3.14 (`REDEMPTION_REJECTED`), decisiones S4-8 y S4-11 |
| **Prototipo** | `CanjeAccion.html` (accion `rechazar`, motivos rápidos); `ClienteCanjes.html` (Cancelar canje) |
| **Depende de** | US-40 y US-44 (vencer al leer) |
| **Fuera de alcance** | Avisarle al Cliente (PD-6) |

**Criterios de aceptación**

- **CA-43.1 [B+F] Rechazar.** Dado un canje `CONFIRMED`, cuando el Cajero elige "Sin insumo" y confirma,
  entonces:
  - pasa a `REJECTED` con el motivo y `resolvedBy`;
  - se audita `REDEMPTION_REJECTED` (Código · Recompensa · Motivo);
  - el saldo, los movimientos y el stock **no cambian**;
  - el toast dice "Canje rechazado.".
- **CA-43.2 [B+F] Motivo.**
  - Los chips completan el campo con su texto; "Otro" lo deja vacío.
  - Validaciones de la §3.10.1, en el backend y en la pantalla: vacío, menos de 5 y más de 500 caracteres.
  - La ventana muestra "No se descontó nada, así que no hay puntos ni stock para reintegrar.".
- **CA-43.3 [B+F] No se puede rechazar.**
  - Ya resuelto → `409 REDEMPTION_NOT_CONFIRMED`.
  - Vencido → `409 REDEMPTION_EXPIRED`, y el canje queda `EXPIRED`.
- **CA-43.4 [B+F] Cancelar (Cliente).** Dado un canje propio `CONFIRMED`, cuando el Cliente confirma
  "¿Cancelar el canje de **{recompensa}**? Lo vas a poder volver a pedir si tenés puntos.", entonces:
  - pasa a `CANCELLED`, con `resolvedBy = null`;
  - **no se audita**;
  - no cambia nada más;
  - el toast dice "Canje cancelado.".
- **CA-43.5 [B] Cancelar uno ajeno.** Con el código de otro cliente → `404` "No existe el canje." (no revela
  que existe).
- **CA-43.6 [B+F] Cancelar uno vencido o resuelto.** "El canje ya venció." / "El canje ya no se puede
  cancelar.".
- **CA-43.7 [B] Rechazo automático.** `rechazarConfirmados(filtro, motivo)` pasa a `REJECTED` con actor
  Sistema y audita cada uno. Lo usan:
  - desactivar recompensa ("Recompensa desactivada", US-36);
  - eliminar recompensa ("Recompensa eliminada", US-38);
  - dar de baja un cliente ("Cliente dado de baja"): `PATCH /customers/:id/deactivate` agrega a
    `CUSTOMER_DEACTIVATED` la fila "Canjes rechazados: {n}".

  Va en la misma transacción que la operación que lo dispara, por eventos (`reward.deactivated`,
  `reward.deleted`, `customer.deactivated`).
- **CA-43.8 [B] Permisos.** El Cliente no puede rechazar (`403`); Cajero y Administrador no pueden usar la ruta
  de cancelar del Cliente (`403`).

**Casos de prueba (e2e):**
- Rechazar con cada motivo y cada error.
- Saldo y stock sin cambios.
- Cancelar propio, ajeno, vencido y resuelto (sin auditoría).
- Los tres rechazos automáticos.
- Permisos.

**Recorrido del frontend:**
- Rechazar desde el panel, desde Canjes por código y desde Canjes del Administrador.
- Los chips.
- Cancelar desde Mis canjes.

---

### US-44 — Vencer canje automáticamente (solo backend)

| | |
|---|---|
| **Historia** | Como Sistema, quiero vencer automáticamente los canjes que no se usaron dentro de los 15 minutos. **Sin reintegro** (en el backlog todavía dice "reintegrando puntos y reponiendo el stock", ver PD-5) |
| **Roles** | Sistema |
| **Contrato** | §3.11, §3.14 (`REDEMPTION_EXPIRED`), decisiones S4-3 y S4-4 |
| **Prototipo** | La cuenta regresiva y el estado "Vencido" de `ClienteCanjes.html`, `GestionCanjes.html` y `CanjePorCodigo.html` |
| **Depende de** | BASE-4 |
| **Fuera de alcance** | La cuenta regresiva de la pantalla (US-40) |

**Criterios de aceptación**

- **CA-44.1 [B] Vencer al leer.** `vencerVencidos(filtro)` pasa a `EXPIRED` los `CONFIRMED` con `expires_at
  <= ahora` que toca la consulta. Lo llaman, antes de responder: `GET /canjes/:code`, `usar`, `rechazar`,
  `cancelar`, `GET /canjes`, `GET /customers/:id/canjes` y `GET /customers/me/canjes`.
- **CA-44.2 [B] Se confirma aunque la respuesta sea error.** Dado un `usar` sobre un canje vencido, el pase a
  `EXPIRED` y su auditoría quedan guardados aunque la respuesta sea `409` (transacción aparte).
- **CA-44.3 [B] Barrido.** Cada 5 minutos y al iniciar el servidor, toma todos los `CONFIRMED` vencidos. Uno
  por transacción, con `FOR UPDATE SKIP LOCKED`.
- **CA-44.4 [B] Qué guarda.** `status = EXPIRED`, `resolvedAt = expiresAt` (no la hora del barrido) y
  `resolvedBy` = Sistema. Audita `REDEMPTION_EXPIRED` (Código del canje · Recompensa) con actor Sistema. **No
  toca** saldo, lotes, movimientos ni stock.
- **CA-44.5 [B] Idempotente.** Correr el barrido dos veces, o el barrido y un "al leer" a la vez, no duplica
  estados ni auditorías.
- **CA-44.6 [B] 15 minutos exactos.** Un canje de hace 14:59 no vence; uno de hace 15:00, sí.
- **CA-44.7 [B] Variable y comando.** `REDEMPTIONS_EXPIRATION_CRON_ENABLED` (prendida por defecto, `false` en
  los e2e) y `npm run redemptions:expire`. Documentar en `docs/SETUP.md`.

**Casos de prueba (e2e):** con `expires_at` forzado al pasado:
- cada endpoint que vence al leer;
- el barrido;
- la idempotencia;
- el límite de los 15 minutos;
- la auditoría.

---

### US-45 — Consultar canjes

| | |
|---|---|
| **Historia** | Como Cliente, quiero consultar mis canjes y sus estados, para hacer seguimiento de las recompensas solicitadas. Además: el Cajero ve los canjes para usar del cliente identificado, y el Administrador consulta todos los canjes |
| **Roles** | Cliente (Mis canjes), Cajero y Administrador (panel de Caja), Administrador (pantalla Canjes) |
| **Contrato** | §3.12 (los tres listados), §2.6 (filtro de estado del Cliente), decisiones S4-10, S4-15, S4-18, S4-19 y S4-20 |
| **Prototipo** | `ClienteCanjes.html` → Mis canjes; `GestionCanjes.html`; panel de `RegistrarConsumo.html` |
| **Depende de** | US-40 y US-44 |
| **Fuera de alcance** | Las acciones (US-42 y US-43): los botones **abren** sus ventanas |

**Criterios de aceptación**

- **CA-45.1 [B+F] Mis canjes: filtros.**
  - Estado: Todos · Confirmados · Finalizados.
  - Fecha: Cualquiera · Hoy · Últimos 7 días · Este mes · Día específico · Rango. La pantalla los traduce a
    `fromDate` / `toDate` en hora de Argentina; un rango invertido muestra "La fecha "hasta" no puede ser
    anterior a "desde"." sin llamar.
  - Orden: Más recientes · Más antiguos.
- **CA-45.2 [B] Mis canjes: qué no viaja.** La respuesta del Cliente **no** trae `customer`, `origin`,
  `confirmedBy`, `resolvedBy`, `balanceBefore` ni `balanceAfter`. Trae `canCancel` y, en los rechazados,
  `rejectionReason`.
- **CA-45.3 [F] Mis canjes: ítem.**
  - Recompensa, badge, "{fecha hora} · {n} pts" y "Ver detalle ▾".
  - Los Confirmados aparecen abiertos: código grande, "Vence en {n} min", "Presentá este código en caja." y
    **Cancelar canje**.
  - Utilizado: "Usado el {fecha} a las {hora}" y "Se descontaron {n} pts".
  - Rechazado: "Motivo: {motivo}".
  - Cancelado y Vencido: la fecha.
  - Nunca el nombre de un empleado.
- **CA-45.4 [F] Mis canjes: al llegar a 0.** Cuando la cuenta regresiva de un Confirmado llega a 0, la
  pantalla vuelve a pedir la lista y el canje aparece "Vencido".
- **CA-45.5 [F] Mis canjes: vacíos y pie.**
  - "Todavía no tenés canjes." / "No hay canjes para los filtros elegidos.".
  - Pie: "Si un canje se cancela, se rechaza o vence, no se descuentan puntos. Lo podés volver a pedir si tenés
    puntos.".
- **CA-45.6 [B] Panel de Caja.** `GET /customers/:id/canjes` devuelve solo los Confirmados vigentes (ver
  CA-42.9). Ningún otro estado.
- **CA-45.7 [B+F] Canjes del Administrador: filtros.**
  - **Tipo doc.** (DNI · Pasaporte) + **N° de documento** (coincidencia parcial, normalizado), como en Caja.
    Sin búsqueda por nombre del cliente.
  - **Código** (parcial).
  - **Recompensa:** buscador por nombre (`rewardName`, parcial, sin mayúsculas ni tildes). Encuentra también
    las dadas de baja. **No hay lista** de recompensas.
  - **Estado** (los 5) y **Orden**.
  - **Fechas:** calendario como el de Consumos, con "Limpiar" y "Listo". Un día elegido filtra ese día
    (`fromDate = toDate`); dos días, el rango. Sin elegir: "Cualquier fecha".
  - Se aplican con **Filtrar**; mientras tanto, "Sin aplicar".
- **CA-45.8 [F] Canjes del Administrador: tabla.**
  - Las columnas de la §3.12.3, con un chevron (›) al final.
  - "Vence en {n} min" o "fecha y quién lo resolvió".
  - **Las filas no tienen botones.** Debajo del título: "Hacé clic en un canje para ver el detalle y aplicarlo o
    rechazarlo.".
  - Paginado de a 10.
  - Vacío: "No hay canjes para los filtros seleccionados.".
- **CA-45.9 [F] Canjes del Administrador: modal "Canje {código}".** Un clic en la fila lo abre, con:
  - el badge del estado y, si está Confirmado, "Vence en {n} min";
  - Cliente, Documento, Recompensa, Puntos, Fecha y hora, "Confirmado por" (Cliente (app) o el empleado),
    "Vence" y lo de cada estado (aplicado por, puntos descontados y saldo antes → después; rechazado por y
    motivo; cancelado por el cliente; vencido por el Sistema);
  - abajo: **Cerrar** y, solo si está Confirmado, **Rechazar** y **Aplicar**, que cierran el modal y abren las
    ventanas de US-43 y US-42.
- **CA-45.10 [B] Permisos.**
  - `GET /canjes` es solo del Administrador (el Cajero recibe `403`).
  - `/customers/me/canjes` es solo del Cliente.
  - `/customers/:id/canjes` es de Cajero y Administrador.

**Casos de prueba (e2e):**
- Cada filtro de cada listado (en Canjes: documento parcial con DNI y con Pasaporte, nombre de una recompensa
  dada de baja, un día concreto y un rango).
- Lo que no viaja al Cliente.
- El panel solo con vigentes.
- Vencer al leer en los tres listados.
- Permisos.

**Recorrido del frontend:**
- Mis canjes con cada estado y cada filtro, y la cuenta regresiva hasta 0.
- Canjes del Administrador con cada filtro y el modal de cada estado (Aplicar y Rechazar solo en Confirmado).

---

### CLI-DOC — Clientes: filtro por tipo y número de documento (ajuste de CLI-ADM)

| | |
|---|---|
| **Qué cambia** | El buscador de la pantalla Clientes deja de ser "Apellido, nombre o documento" y pasa a ser **tipo de documento + número**, como en Caja (decisión S4-18, 27/10) |
| **Roles** | Administrador |
| **Contrato** | §3.13.4 de este sprint; §3.8.1 del contrato del Sprint 3 |
| **Prototipo** | `pagina-principal.html`, `adminScreen === 'clientes'` |
| **Depende de** | CLI-ADM (Sprint 3) |
| **Fuera de alcance** | Buscar por nombre o apellido: **ya no existe** en la pantalla |

**Criterios de aceptación**

- **CA-DOC.1 [B] Parámetros nuevos.** `GET /customers` acepta `documentType` (por defecto `DNI`) y
  `documentNumber` (normalizado, coincidencia parcial). `documentType` sin `documentNumber` no filtra.
- **CA-DOC.2 [B] `q` y documento juntos.** `q` + `documentNumber` → `400` "No se puede buscar por q y por
  documento a la vez.". `q` sigue funcionando solo, pero la pantalla no lo usa.
- **CA-DOC.3 [F] Pantalla.** En lugar de "Buscar", los campos **"Tipo de documento"** (DNI · Pasaporte) y
  **"Número de documento"** (placeholder `38.456.123` o `AAB123456` según el tipo). Filtra mientras se escribe,
  con el *debounce* de 300 ms. El filtro "Nivel" queda igual.
- **CA-DOC.4 [B+F] Parcial.** Con DNI y `3522`, aparecen los clientes con documento `35222880` y `35222888`.
  Con Pasaporte y `3522`, no aparece ninguno de esos.

**Casos de prueba (e2e):** número parcial con DNI y con Pasaporte; con puntos y guiones (`35.222`); `q` +
documento (`400`); sin número (lista completa).

**Recorrido del frontend:** cambiar el tipo con un número escrito, borrar el número y combinar con "Nivel".

---

### NAV — Ajustes de navegación del 25/10 (solo frontend)

| | |
|---|---|
| **Qué cambia** | Lo que decidió la PO el 25/10: "Buscar cliente" y "Canjes por código" solo en Caja; "Movimientos de puntos" fuera del menú de Administración; Recompensas y Canjes habilitados |
| **Roles** | Administrador y Cajero |
| **Contrato** | §3.13.3 |
| **Prompts** | `docs/sprint-4/PROMPT_MENU_ADMIN_SIN_CAJA.md` y `docs/sprint-4/PROMPT_SACAR_MOVIMIENTOS_DE_PUNTOS.md` (cada uno tiene sus propios criterios, CA-1 a CA-6) |
| **Prototipo** | `pagina-principal.html` (`adminNavItems`, `empleadoNavItems`), `FichaCliente.html` |
| **Depende de** | Nada. Conviene hacerlo **primero**, porque las pantallas nuevas cuelgan de estos menús |

**Criterios de aceptación**

- **CA-NAV.1 [F] Menú de Administración.** Recompensas · Canjes · Misiones (Próx.) · Clientes · Estadísticas y
  reportes (Próx.) · Auditoría · Consumos. Recompensas y Canjes llevan a sus rutas nuevas (mientras su
  historia no esté hecha, a "Próximamente").
- **CA-NAV.2 [F] Menú de Caja.** Buscar cliente · Nuevo cliente · Canjes por código (habilitado), para Cajero y
  Administrador.
- **CA-NAV.3 [F] Rutas viejas.** La ruta de administración de registrar consumo y la de movimientos de puntos
  redirigen (a Caja y a Clientes o a la ficha, respectivamente), sin pantalla en blanco.
- **CA-NAV.4 [F] Ficha del cliente (Administrador).**
  - "Registrar consumo" lleva a Caja → Buscar cliente con el documento cargado.
  - La pestaña "Movimientos de puntos" muestra todos, paginados de a 10, sin "Ver todos".
- **CA-NAV.5 [F] Barra del Cliente.** La pestaña Canjes se habilita (lleva a la pantalla de US-39 y US-45).
- **CA-NAV.6 [F] Cajero sin cambios** en lo que no es "Canjes por código".

**Recorrido del frontend:** los de cada prompt, con un usuario `ADMIN`, otro `CASHIER` y un Cliente.

**Antes de codear, confirmá:** PD-3, solo si alguien propone borrar `GET /movimientos-de-puntos`.
