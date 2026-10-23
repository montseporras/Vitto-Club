# Historias del Sprint 3: qué hay que hacer y cómo se acepta

> **Para qué es este archivo.** No usamos Jira, así que este es el tablero del sprint:
> - **quién hace qué:** sección 0;
> - **en qué orden:** sección 1;
> - **qué falta decidir:** sección 2;
> - **qué tiene que cumplir cada historia para darla por terminada:** sección 3.
>
> **Este archivo dice QUÉ hay que lograr. El CÓMO exacto está en el contrato**
> (`docs/sprint-3/API_CONTRACT_SPRINT_3.md`) y, para las pantallas, en el prototipo
> (`docs/prototipo/v2/`). Si un criterio de acá choca con el contrato, **manda el contrato**. Hay que
> avisar para corregir este archivo.

## Cómo se usa

**Equipo**

1. **Anotate.** Poné tu nombre en la tabla de la sección 0, en la capa que te toca (backend o frontend), y
   el nombre de tu rama.
2. **Pedile la historia a Claude:** `/historia US-21 backend Tu-Nombre`. Si preferís escribirlo a mano, usá
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

**Etiquetas de los criterios**

| Etiqueta | Quién lo cumple |
|---|---|
| `[B]` | Backend |
| `[F]` | Frontend |
| `[B+F]` | Las dos capas: el backend devuelve el dato o el error, y el frontend lo muestra |

---

## 0. Asignaciones

**Estados:** Sin empezar · En curso · En revisión · Hecha.

| Ítem | Título | Backend: responsable | Backend: rama | Frontend: responsable | Frontend: rama | Carpeta del front | Estado |
|---|---|---|---|---|---|---|---|
| BASE | Modelo de datos nuevo y módulo `points` | | | — (no tiene pantalla) | — | — | Sin empezar |
| US-57 | Registrar auditoría (cambios de la auditoría) | | | — (no tiene pantalla) | — | — | Sin empezar |
| US-58 | Consultar auditoría | | | | | `features/audit` | Sin empezar |
| US-46 | Identificar cliente en mostrador | Jazmín | `feature/US-19-consultar-cliente-back` | | | `features/cashier` | En revisión |
| US-21 | Registrar consumo y cálculo de puntos | | | | | `features/cashier` | Sin empezar |
| US-22 | Anular consumo | | | | | `features/cashier` | Sin empezar |
| US-23 | Consultar consumos | | | | | A confirmar (ver P8) | Sin empezar |
| US-19 | Consultar cliente (ficha e inicio del Cliente) | Jazmín | `feature/US-19-consultar-cliente-back` | | | `features/cashier` (ficha) y `features/my-account` (inicio) | En revisión |
| US-24 | Ajustar puntos | | | | | `features/cashier` (modal de la ficha) | Sin empezar |
| US-25 | Vencimiento automático de puntos | | | — (no tiene pantalla) | — | — | Sin empezar |
| US-26 | Consultar movimientos de puntos | Jazmín | `feature/US-26-movimientos-puntos-back` | | | A confirmar (ver P8) | En curso |
| US-27 | Configurar niveles | Jazmín | `feature/US-27-configurar-niveles-back` | | | `features/points` (tarjeta en Configuración → Puntos) | En revisión |
| US-17-AJ | Alta de cliente con cuenta y contraseña inicial | | | | | `features/cashier` y `features/customers` | Sin empezar |
| CLI-ADM | Clientes del Administrador | | | | | `features/customers` | Sin empezar |
| PERFIL | Mi perfil, contraseña y cerrar sesión del Cliente (número de US a confirmar, ver P1) | | | | | `features/my-account` | Sin empezar |
| EMP-PASS | Contraseña y reactivación de usuarios de empleados | | | | | `features/employees` | Sin empezar |
| CORR | Correcciones de los Sprints 1 y 2 (`VERIFICACION_SPRINTS_1_2.md`, §11) | | | | | Según el cambio | Sin empezar |

> **Ramas:** `<tipo>/US-XX-<descripcion-corta>`. Por ejemplo: `feature/US-21-registrar-consumo-back` o
> `feature/US-21-registrar-consumo-front`.

---

## 1. Orden y piezas compartidas

```text
BACKEND
  BASE ─────────┬──> US-46 ──> US-21 ──> US-22 ──> US-23
  (modelo y     │                 │
   points)      │                 └──> US-19, US-24, US-26, US-25
                └──> US-27
  US-57 ──────────> (todas las que auditan: US-21, 22, 24, 25, 27, US-17-AJ, CLI-ADM, EMP-PASS) ──> US-58
  US-17-AJ ───────> PERFIL (la ventana "Cambiá tu contraseña" necesita mustChangePassword)
  CORR (unicidad de email entre activos) ──> US-17-AJ, CLI-ADM, EMP-PASS, PERFIL

FRONTEND
  Puede empezar todo en paralelo con MSW, siguiendo el contrato. No espera al backend.
```

**Piezas compartidas.** Cada una tiene un solo dueño. Las demás historias la **usan**, no la reconstruyen.

| Pieza | Dueño | La usan |
|---|---|---|
| Tablas `consumptions`, `points_lots`, `points_movements` y `customer_points`; columnas de niveles; `accounts.must_change_password`; enums de puntos y consumos | **BASE** | US-21, 22, 23, 24, 25, 26, 27, US-17-AJ |
| `PointsService` (`acreditar`, `revertir`, `ajustar`, `vencerLotes`, `resumen`) y el cálculo de nivel | **BASE** | US-19, 21, 22, 24, 25, 26, 46, CLI-ADM |
| Tabla `audit_logs` nueva, enums `AuditModule`, `AuditAction` y `AuditActorType`, y `AuditService.capture` con la forma nueva | **US-57** | Todas las que auditan |
| `GET /customers/:id/puntos` | **US-46** | US-19, US-21, US-22 y US-24 (para mostrar el saldo) |
| `GET /customers/:id/consumos` | **US-22** | US-19 (pestaña de la ficha) |
| `GET /customers/:id/movimientos` | **US-26** | US-19 (pestaña de la ficha) y US-46 (panel) |
| Modal "Anular consumo" (frontend) | **US-22** | US-23 (detalle del consumo). Se exporta desde el `index.ts` del feature |
| Modal "Ajustar puntos" (frontend) | **US-24** | US-19 (botón en la ficha y en la alerta de saldo negativo) |
| Diálogo "Cerrar sesión" (frontend) | Ya existe para Cajero y Administrador | PERFIL lo reutiliza |

---

## 2. Pendientes que hay que decidir

**Claude: si tu historia figura en la columna "Afecta", preguntá antes de empezar.** Cuando el equipo
decida, se completa la columna "Decisión" y se corrige el contrato si hace falta.

| # | Pendiente | Afecta | Decisión |
|---|---|---|---|
| P1 | **Número de la historia del perfil.** El contrato la llama **US-59**, pero en la Definición del Producto **US-59 ya es "Autorregistrar cliente" (RF-064)**. Además, la tabla de Epics ya nombra **US-60** y **RF-065** en EP01. ¿Qué número lleva el perfil? | PERFIL | |
| P2 | **Ventana "Cambiá tu contraseña": ¿se puede postergar ("Ahora no") o es obligatoria?** El contrato la toma como postergable. La variante obligatoria está en la §3.11.3 | PERFIL, US-17-AJ | |
| P3 | **El Cajero perdió "Editar datos" y la baja de clientes en el prototipo v2.** O se recupera en el prototipo, o se cambia el actor de US-18 y US-20 (`VERIFICACION_SPRINTS_1_2.md`, §7, P1 y P2) | CLI-ADM, CORR | |
| P4 | **US-57, escenario 4 original:** "registrar en la auditoría los intentos sin permiso". El contrato (§3.9) no lo incluye: no hay acción para eso y el `403` no se audita. ¿Se saca el escenario o se agrega al contrato? | US-57 | |
| P5 | **US-47** ("resumen del cliente en 2 segundos") figura en el Sprint 3 del backlog, pero no está en el pedido del sprint. ¿Entra? | US-46 | |
| P6 | **¿Cuándo se crea la fila de `customer_points`?** Con el alta del cliente o en su primer movimiento. El contrato admite las dos | BASE | |
| P7 | **Vencimiento a demanda.** ¿Con qué comando se corre (nombre del script) y qué valor por defecto tiene `POINTS_EXPIRATION_CRON_ENABLED` en cada entorno? | US-25 | |
| P8 | **Carpeta del frontend** para las pantallas del Administrador "Consumos" y "Movimientos de puntos". No existe un feature para ellas. Propuestas: `features/consumptions` y `features/points-movements` | US-23, US-26 | |
| P9 | **Tests del frontend.** La Definición del Producto dice Vitest y React Testing Library, pero no están instalados. ¿Se suman en este sprint? | Todo el frontend | |
| P10 | **¿Está mergeada en `develop` la rama `feature/SCRUM-161-registrar-auditoria`?** US-57 parte de ese código | US-57 | |

---

## 3. Historias

Formato de cada historia:

- **Ficha:** historia, roles, secciones del contrato, pantallas del prototipo, dependencias y lo que queda
  fuera de alcance.
- **Criterios de aceptación** (CA), escritos como *Dado / Cuando / Entonces*.
- **Casos de prueba** del backend y **recorrido** del frontend.
- **Antes de codear:** lo que hay que confirmar.

---

### BASE — Modelo de datos nuevo y módulo `points` (solo backend)

| | |
|---|---|
| **Qué es** | No es una historia del backlog. Es la base que necesitan casi todas las historias del sprint. Se hace una sola vez, para que no haya cinco migraciones distintas sobre las mismas tablas |
| **Contrato** | §3.12 (modelo), §2.2 (enums), §3.4.1 (resumen de puntos), §3.6.3 (lotes y vencimiento), §3.7 (cálculo de nivel), §8.4 (diseño de módulos) |
| **Depende de** | Nada |
| **Fuera de alcance** | Endpoints HTTP (cada historia tiene los suyos) y la auditoría (US-57) |

**Criterios de aceptación**

- **CA-BASE.1 [B] Migración.** Crea, con las columnas, `CHECK` e índices de la §3.12:
  - las tablas `consumptions`, `points_lots`, `points_movements` y `customer_points`;
  - en la configuración, `silver_min_points` y `gold_min_points` (300 y 800 por defecto; la versión vigente
    queda con esos valores);
  - en las cuentas, `must_change_password` (en `false`);
  - los enums `ConsumptionStatus`, `PointsLotStatus` y `PointsMovementType`.
- **CA-BASE.2 [B] Movimientos inalterables.** Dado un movimiento de puntos guardado, cuando se intenta un
  `UPDATE`, un `DELETE` o un `TRUNCATE` sobre `points_movements`, entonces la base lo rechaza (el mismo
  trigger que la auditoría).
- **CA-BASE.3 [B] Acreditar.**
  - Dado un cliente **sin** deuda, cuando se acreditan N puntos, entonces:
    - se crea un lote `ACTIVE` con `remaining = N`;
    - `expires_at` es la acreditación más la vigencia vigente (snapshot);
    - el saldo sube N.
  - Dado un cliente **con** deuda D, cuando se acreditan N puntos, entonces:
    - primero se cancela la deuda;
    - solo si sobra (N > D) se crea un lote por N − D.
- **CA-BASE.4 [B] Revertir un consumo.** Dado un consumo con su lote, cuando se revierte, entonces:
  - del lote se descuenta `min(remaining, totalPoints)` y el lote pasa a `VOIDED` (Anulado);
  - lo que falta se suma a `debt`;
  - el saldo puede quedar negativo.

  `VOIDED` es un estado final del lote y lo dispara solo esta operación (decisión #11, revisada el 20/10/2026).
- **CA-BASE.5 [B] Ajustar.**
  - `ADD`: cancela la deuda primero; con lo que sobra, crea un lote.
  - `SUBTRACT`: descuenta de los lotes `ACTIVE` en orden de vencimiento (FIFO). Si los puntos superan el
    saldo, o si el saldo es negativo, responde el error de dominio `INSUFFICIENT_BALANCE`.
  - Un lote que llega a 0 pasa a `CONSUMED`.
- **CA-BASE.6 [B] Invariante.** Después de cualquier operación, `balance = Σ remaining (lotes ACTIVE) − debt`.
  Lo verifica un test unitario en cada caso.
- **CA-BASE.7 [B] Acumulados.**
  - `lifetimePoints` sube con las acreditaciones de consumo (incluida la bonificación) y baja con las
    reversiones.
  - **No cambia** con los ajustes, los vencimientos ni los canjes.
- **CA-BASE.8 [B] Nivel.**
  - Es el mayor nivel cuyo mínimo es ≤ `lifetimePoints`.
  - `next`, `pointsToNext` y `progressPercent` se calculan con las fórmulas de la §3.4.1.
  - En Oro: `next = null`, `pointsToNext = 0` y `progressPercent = 100`.
- **CA-BASE.9 [B] Resumen.** `resumen(customerId)` devuelve exactamente la forma de la §3.4.1. En
  `nextExpirations` van como máximo 5 lotes `ACTIVE` con saldo, ordenados por vencimiento, con la fecha en
  `YYYY-MM-DD` (hora de Argentina).
- **CA-BASE.10 [B] Concurrencia.** Toda operación toma `SELECT … FOR UPDATE` sobre la fila de
  `customer_points` del cliente antes de tocar lotes y saldo.

**Casos de prueba (unitarios)**
- Acreditar sin deuda.
- Acreditar con deuda menor que lo acreditado.
- Acreditar con deuda mayor que lo acreditado.
- Revertir con el lote entero.
- Revertir con el lote parcialmente gastado (genera deuda).
- `SUBTRACT` FIFO entre dos lotes.
- `SUBTRACT` mayor que el saldo.
- `SUBTRACT` con saldo negativo.
- Nivel en el borde exacto: 300 → Plata y 299 → Bronce.
- Progreso en Oro.

**Antes de codear, confirmá:** P6.

---

### US-57 — Registrar auditoría (solo backend)

| | |
|---|---|
| **Historia** | Como Sistema, quiero registrar de forma inalterable las operaciones relevantes indicando usuario, fecha, hora y acción, para garantizar la trazabilidad |
| **Contrato** | §3.9.1 (reglas), §3.9.2 (enums), §3.9.3 (detalle por acción), §3.9.6 (cambios en la base y migración de lo ya registrado) |
| **Depende de** | P10: el código de auditoría de la rama `feature/SCRUM-161` |
| **Fuera de alcance** | La consulta (US-58). La auditoría de las acciones nuevas del sprint la escribe cada historia (US-21, 22, 24, 25, 27…); esta historia deja lista la base y migra lo que ya se auditaba |

**Criterios de aceptación**

- **CA-57.1 [B] Tabla nueva.** `audit_logs` queda con las columnas, los índices y los enums de la §3.9.6.
  `category` y la columna de texto `action` se reemplazan por `module`, `action_code` y `description`.
- **CA-57.2 [B] Filas viejas.** Dadas filas viejas en la tabla, cuando corre la migración, entonces se
  completan según la tabla "Cómo migrar" de la §3.9.6. Las de sesión, autorregistro y alta lógica de
  cliente quedan con `module = NULL`. Para hacerlo, el trigger se desactiva y se vuelve a activar **dentro
  de la misma migración**.
- **CA-57.3 [B] Inalterable.** Dado un registro de auditoría, cuando se intenta modificarlo o borrarlo,
  entonces la base lo rechaza.
- **CA-57.4 [B] Actor.**
  - El actor siempre es un empleado (`EMPLOYEE`, con su `accountId` y el nombre como snapshot) o
    `SYSTEM` (con `accountId = null` y `performedBy = "Sistema"`).
  - Dada una acción hecha por un cliente, entonces **no** se registra.
- **CA-57.5 [B] Lo que deja de registrarse.** Dado un inicio o un cierre de sesión, o un autorregistro,
  cuando ocurre, entonces no se escribe nada en la auditoría. Hay que sacar las llamadas de
  `auth.controller.ts` y de `customer-registration.controller.ts`.
- **CA-57.6 [B] Acciones que ya se auditaban, con la forma nueva.** Cuando ocurre cualquiera de estas
  acciones, se registra con su código, su `description` y las filas de `details` en el orden de la §3.9.3:
  - `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED` y `EMPLOYEE_DEACTIVATED`;
  - `USER_ACCOUNT_CREATED`, `USER_ACCOUNT_UPDATED` y `USER_ACCOUNT_DEACTIVATED`;
  - `CUSTOMER_CREATED`, `CUSTOMER_UPDATED` y `CUSTOMER_DEACTIVATED`;
  - `POINTS_EQUIVALENCE_UPDATED`, `POINTS_VALIDITY_UPDATED` y `FIRST_CONSUMPTION_BONUS_UPDATED`.
- **CA-57.7 [B] Configuración sin cambios.** Dado un guardado de configuración que no cambia ningún valor,
  entonces igual se registra, con la fila "Cambios: Se guardó sin modificar valores". El
  `PUT /loyalty/configuration` completo registra una entrada **por cada sección** que cambió.
- **CA-57.8 [B] Misma transacción.** Dado que falla la escritura de la auditoría, cuando se ejecuta la
  operación, entonces la operación se deshace entera.
- **CA-57.9 [B] Datos completos.** Una entrada nueva sin `module`, `action_code`, `description` o actor no
  se guarda.
- **CA-57.10 [B] Nunca contraseñas.** Ningún `details` guarda contraseñas ni hashes.

**Casos de prueba (e2e)**
- Cada acción de CA-57.6 genera exactamente una entrada, con sus `details`.
- Login y logout no generan entradas.
- `UPDATE` o `DELETE` directo sobre la tabla falla.
- Si la auditoría falla, no queda la operación.

**Antes de codear, confirmá:** P4 y P10.

---

### US-58 — Consultar auditoría

| | |
|---|---|
| **Historia** | Como Administrador, quiero consultar el historial de operaciones con filtros, para controlar quién hizo qué y cuándo |
| **Roles** | Solo el Administrador |
| **Contrato** | §3.9.2 (enums y filtro dependiente), §3.9.4 (`GET /auditoria`), §3.9.5 (`GET /auditoria/actores`), §8.1 #7 y #12, decisión #5 |
| **Prototipo** | `Auditoria.dc.html` y, en el archivo principal, `adminScreen === 'auditoria'` |
| **Depende de** | US-57 (backend) |
| **Fuera de alcance** | Exportar. El panel "Tipos de datos" es documentación del prototipo: **no** va en la aplicación |

**Criterios de aceptación**

- **CA-58.1 [B+F] Permisos.** Dado un Cajero o un Cliente, cuando llama a `/auditoria` o a
  `/auditoria/actores`, entonces recibe `403`. En el frontend, la sección solo aparece en el menú del
  Administrador.
- **CA-58.2 [B+F] Listado.**
  - Columnas: chevron, Fecha y hora (`dd/mm/aaaa hh:mm`, hora de Argentina), Realizado por (con un ícono
    distinto para empleado y para Sistema), Módulo (badge) y Acción (`description`).
  - Orden: fecha descendente y, a igual fecha, id descendente.
  - Sale paginado de a 10, con "Mostrando 1–10 de N", Anterior y Siguiente.
- **CA-58.3 [F] Fila expandible.** Al hacer clic en una fila se ven:
  - "Cliente afectado" (nombre y documento), si hay;
  - "Detalle": los pares `label`/`value` tal cual llegan. Si no hay, "Sin datos adicionales.".
- **CA-58.4 [B+F] Filtro "Realizado por".** Las opciones son "Todos", las cuentas de empleados de
  `GET /auditoria/actores` (activas e inactivas, por apellido) y "Sistema" (`SYSTEM`). El filtro es exacto
  por `actor`.
- **CA-58.5 [B+F] Filtros "Módulo" y "Acción".**
  - "Recompensas (Próximamente)" y "Misiones (Próximamente)" aparecen deshabilitados.
  - "Acción" está deshabilitado y muestra "Todas" mientras "Módulo" sea "Todos". Vuelve a "Todas" cada vez
    que cambia el módulo.
  - Solo muestra las acciones de ese módulo.
  - En Empleados incluye "Reactivó cuenta de usuario".
  - En el backend, `action` sin `module`, o de otro módulo, responde `400`.
- **CA-58.6 [B+F] Filtros por documento.** "Tipo doc." y "N° doc. cliente". La búsqueda es por
  **coincidencia parcial** (`3011` encuentra `30111222`) y el número se normaliza.
- **CA-58.7 [F] Filtro "Fecha".**
  - Cualquiera: sin `fromDate` ni `toDate`.
  - Hoy: hoy a hoy.
  - Últimos 7 días: hoy − 6 a hoy.
  - Este mes: día 1 a hoy.
  - Rango personalizado: calendario con "Limpiar" y "Listo".

  Todo en hora de Argentina.
- **CA-58.8 [B] Rango de fechas.** `fromDate > toDate`, o `date` junto con un rango, responden `400`.
- **CA-58.9 [B] Filas sin módulo.** El listado excluye siempre las filas con `module = NULL`.
- **CA-58.10 [F] Limpiar.** "Limpiar filtros" vuelve todo a los valores por defecto. Sin resultados:
  "No hay registros para los filtros seleccionados".

**Casos de prueba (e2e):**
- Cada filtro por separado.
- `action` sin `module` → `400`.
- Rango invertido → `400`.
- Coincidencia parcial de documento.
- Cajero → `403`.
- Las filas viejas de sesión no aparecen.
- `actores` incluye a los empleados inactivos.

**Recorrido del frontend:**
- Cada combinación de módulo y acción.
- Cada opción de fecha.
- Expandir una fila con cliente afectado y otra sin él.
- La paginación.
- El estado vacío.

---

### US-46 — Identificar cliente en mostrador

| | |
|---|---|
| **Historia** | Como Cajero, quiero identificar a un cliente en el mostrador mediante su número de documento y tipo, para obtener sus puntos acumulados, nivel, canjes y recompensas |
| **Roles** | Cajero y Administrador (es la primera opción del menú de los dos) |
| **Contrato** | §3.1.1 (búsqueda, sin cambios de contrato), §3.4.1 (`GET /customers/:id/puntos`), §3.1.4 (panel de canjes, recompensas y movimientos) |
| **Prototipo** | `RegistrarConsumo.dc.html` (búsqueda y tarjeta del cliente) y, en el archivo principal, `empleadoScreen === 'consumo'` y `adminScreen === 'consumo'` |
| **Depende de** | BASE |
| **Fuera de alcance** | Registrar el consumo (US-21). Panel de consumos de 24 h y anulación (US-22). Canjes y recompensas reales (Sprint 4) |

**Criterios de aceptación**

- **CA-46.1 [F] Formulario.** Selector de tipo de documento (DNI o Pasaporte), número y botón **Buscar**. El
  número acepta puntos (`38.456.123`).
- **CA-46.2 [B+F] Cliente activo.**
  - Dado un cliente activo, cuando se busca, entonces aparece la tarjeta con:
    - nombre y apellido;
    - badge "Nivel X";
    - documento, con el **tipo real**;
    - saldo actual.
  - El saldo y el nivel salen de `GET /customers/:id/puntos`.
  - Un saldo negativo se ve en rojo y con signo.
- **CA-46.3 [F] Cliente dado de baja.** Dado un cliente con `active: false`, cuando se busca, entonces se
  trata como no encontrado: "No existe un cliente con ese DNI." y el enlace **Registrar cliente**.
- **CA-46.4 [F] Cliente que no existe.**
  - Dado un `404`, se muestra "No existe un cliente con ese {DNI | pasaporte}." y **Registrar cliente**.
  - El enlace lleva al Cajero a "Nuevo cliente" y al Administrador a "Clientes".
- **CA-46.5 [F] Número vacío.** Dado el número vacío, se muestra "Ingresá el número de documento." y no
  se llama al backend.
- **CA-46.6 [B] Endpoint de puntos.** `GET /customers/:id/puntos`:
  - devuelve la forma exacta de la §3.4.1 para Administrador y Cajero;
  - el Cliente recibe `403`;
  - un id inexistente da `404`;
  - un id no numérico da `400`.
- **CA-46.7 [B+F] Panel de canjes, recompensas y movimientos.**
  - El botón dice "Ver canjes, recompensas y movimientos de las últimas 24 hs" para el Cajero, y
    "…y últimos movimientos" para el Administrador.
  - Al abrirlo muestra:
    - "No tiene canjes." (fijo hasta el Sprint 4);
    - "No tiene puntos suficientes…" (fijo hasta el Sprint 4);
    - los movimientos de `GET /customers/:id/movimientos?limit=5`. El Cajero ve solo las últimas 24 h; lo
      fuerza el backend (US-26).

**Casos de prueba (e2e):**
- Puntos de un cliente con lotes, de uno con deuda y de uno sin movimientos.
- Cliente → `403`.
- Id inexistente → `404`.

**Recorrido del frontend:**
- DNI con y sin puntos.
- Pasaporte.
- Cliente inactivo.
- `404`.
- Número vacío.
- Saldo negativo.
- Cajero y Administrador (texto del panel y destino de "Registrar cliente").

**Antes de codear, confirmá:** P5.

---

### US-21 — Registrar consumo y cálculo automático de puntos

| | |
|---|---|
| **Historia** | Como Cajero, quiero registrar un consumo asociado a un cliente, para que el sistema calcule y acredite automáticamente sus puntos y actualice su nivel. En el backlog dice "compra": en el sistema se llama **Consumo** |
| **Roles** | Cajero y Administrador |
| **Contrato** | §3.1.2 (`GET /consumos/preview`), §3.1.3 (`POST /consumos` y pantalla "Consumo registrado"), §3.3.3 (tipo `Consumption`), §2.2, §3.9.3 (`CONSUMPTION_REGISTERED`), decisiones #2, #3 y #6, §8.1 #1, #3 y #9 |
| **Prototipo** | `RegistrarConsumo.dc.html` (monto, vista previa y "Consumo registrado"). **Ojo:** el prototipo calcula los puntos en la pantalla y no aplica la bonificación. En la aplicación, todo viene de `/consumos/preview` |
| **Depende de** | BASE, US-46 y, para la auditoría, US-57 |
| **Fuera de alcance** | Anular (US-22). Detalle del consumo (US-23): el botón "Ver detalle" solo navega |

**Criterios de aceptación**

- **CA-21.1 [B+F] Vista previa.**
  - Dado un cliente activo y la equivalencia $1.000 = 10 pts, cuando se escribe 1.550, entonces se muestra:
    - "Se acreditarán 15 puntos";
    - "Saldo resultante: …";
    - "Equivalencia vigente: $1.000 = 10 pts".
  - Los valores salen de `GET /consumos/preview`; la pantalla no calcula nada.
  - La llamada tiene un debounce de 300 ms, y no se hace si el monto es inválido.
- **CA-21.2 [B] Truncado.** `points = floor(amount / baseAmount × pointsAwarded)`: $1.550 → 15 pts.
- **CA-21.3 [B+F] Bonificación por primer consumo.**
  - Dado un cliente **sin ningún consumo `REGISTERED`** y una bonificación configurada, cuando se previsualiza
    o se registra, entonces `bonusPoints` es:
    - con `PERCENTAGE`: `floor(points × valor / 100)`;
    - con `FIXED_AMOUNT`: el valor.
  - Además, `isFirstConsumption` es `true`.
  - En "Consumo registrado" se agrega "(incluye N de bonificación por primer consumo)".
- **CA-21.4 [B] Primer consumo anulado.** Dado que el único consumo del cliente está anulado, cuando se
  registra otro, entonces vuelve a recibir la bonificación (decisión #2).
- **CA-21.5 [B] Registro.** Dado un monto válido, cuando se confirma, entonces en **una sola transacción**:
  - se crea el consumo `REGISTERED`, con el snapshot de la equivalencia y de la versión;
  - se acreditan `totalPoints` (primero cancelan la deuda; con lo que sobra, se crea un lote);
  - se registra el movimiento `CONSUMPTION_CREDIT`, con `balanceAfter`;
  - se suma `totalPoints` a `lifetimePoints` (incluida la bonificación, decisión #3);
  - se audita `CONSUMPTION_REGISTERED`, con sus `details`.

  La respuesta es `201`, con la forma de la §3.1.3.
- **CA-21.6 [B] El servidor decide.** Dado un body con fecha, puntos, cajero o equivalencia, entonces la
  respuesta es `400 property X should not exist`:
  - la fecha la pone el servidor;
  - el responsable sale del token;
  - los puntos los calcula el backend.
- **CA-21.7 [B+F] Observaciones.** Campo opcional "Observaciones (opcional)" debajo del monto, de hasta 255
  caracteres. Vacío se guarda como `null`, y en la confirmación se muestra "—".
- **CA-21.8 [F] Formato del monto.**
  - Acepta `50000`, `50.000`, `12500,50` y `12.500,50`, y se envía como número JSON.
  - Errores:
    - vacío: "Ingresá el monto del consumo.";
    - formato inválido: "Formato inválido. Usá solo números, por ejemplo 50.000 o 12.500,50.";
    - ≤ 0: "El monto debe ser mayor a 0.".
- **CA-21.9 [F] Pantalla "Consumo registrado".** Muestra:
  - el código;
  - la fecha y hora (hora de Argentina);
  - el cliente, con el tipo de documento real;
  - el monto;
  - los puntos acreditados;
  - las observaciones;
  - el saldo antes → después;
  - "Registrado por".

  Si `levelUp` es `true`, agrega "¡{Nombre} subió a nivel {X}!". Además aparece el toast
  "Consumo C-000141 registrado: +500 pts.".
- **CA-21.10 [F] Botones.** "Registrar otro consumo" vuelve a la búsqueda. "Ver detalle" aparece **solo para
  el Administrador**.
- **CA-21.11 [B+F] Cliente dado de baja.** Dado un cliente que se dio de baja entre la búsqueda y el
  registro, entonces la respuesta es `409 CUSTOMER_INACTIVE` y se muestra "El cliente está dado de baja. No
  se pueden registrar consumos.".
- **CA-21.12 [B+F] Sin equivalencia.** Dado que no hay equivalencia configurada, entonces la respuesta es
  `409 POINTS_EQUIVALENCE_NOT_CONFIGURED` y se muestra "Todavía no se configuró la equivalencia de puntos.
  Pedíselo a un administrador.".
- **CA-21.13 [B] Permisos.** Un Cliente o una petición sin token reciben `403` o `401` en `/consumos/preview`
  y en `POST /consumos`.

**Casos de prueba (e2e):**
- Registrar sin bonificación.
- Registrar con bonificación en porcentaje y fija.
- Primer consumo anulado y luego otro.
- Cliente con deuda que registra un consumo (cancela la deuda primero).
- Subida de nivel (`levelUp`).
- Campos de más → `400`.
- Cliente inactivo → `409`.
- Sin equivalencia → `409`.
- Cliente → `403`.
- Auditoría escrita, con sus filas.
- El consumo conserva el snapshot después de cambiar la equivalencia.

**Recorrido del frontend:**
- Los cuatro formatos de monto.
- Los errores locales.
- La vista previa con bonificación.
- Confirmación con y sin observaciones.
- `levelUp`.
- Cada `409`.
- Cajero sin "Ver detalle".

---

### US-22 — Anular consumo

| | |
|---|---|
| **Historia** | Como Cajero, quiero anular un consumo revirtiendo los puntos acreditados y actualizando el nivel, para corregir errores de registro. Los consumos **no se editan**: si el monto estaba mal, se anula y se registra uno nuevo |
| **Roles** | Cajero (solo consumos propios y dentro de las 24 h) y Administrador (cualquiera `REGISTERED`) |
| **Contrato** | §3.2 (regla del sprint), §3.2.1 (`GET /customers/:id/consumos`), §3.2.2 (`PATCH /consumos/:code/anular` y modal), §3.9.3 (`CONSUMPTION_VOIDED`), decisión #11 |
| **Prototipo** | `RegistrarConsumo.dc.html` (panel "Ver movimientos de las últimas 24 hs") y `Consumos.dc.html` (modal "Anular consumo") |
| **Depende de** | US-21 |
| **Fuera de alcance** | La sección Consumos del Administrador (US-23). Ajustar el saldo negativo (US-24) |

**Criterios de aceptación**

- **CA-22.1 [B] El Cajero solo ve las últimas 24 h.**
  - Dado un Cajero, cuando pide `GET /customers/:id/consumos` (aunque mande `last24h=false`), entonces
    recibe solo los consumos de las últimas 24 h.
  - El Administrador, por defecto, recibe todos.
- **CA-22.2 [B] `canVoid` y `voidableUntil`** se calculan para quien consulta, según la tabla de la §3.2.1:
  - Administrador: `canVoid` si el consumo está `REGISTERED`, y `voidableUntil = null`.
  - Cajero con un consumo propio: `canVoid` si está `REGISTERED` y antes de las 24 h; `voidableUntil` es la
    fecha de registro más 24 h.
  - Cajero con un consumo ajeno: `canVoid = false`.
- **CA-22.3 [F] Panel "Ver movimientos de las últimas 24 hs".**
  - Es una tabla con: Código, Fecha y hora, Monto, Puntos, Registrado por, Estado (badge) y el botón
    "Anular consumo".
  - Si `canVoid` es `false`, el botón queda deshabilitado, con el tooltip "Solo podés anular consumos propios
    dentro de las 24 hs".
  - El texto de arriba cambia según el rol (§3.2.1).
  - Vacío: "No hay consumos de este cliente en las últimas 24 hs.".
- **CA-22.4 [B] Anulación del Administrador.** Dado un Administrador y un consumo `REGISTERED` de cualquier
  fecha y de cualquier cajero, cuando lo anula con un motivo válido, entonces la respuesta es `200`.
- **CA-22.5 [B+F] Cajero sin permiso.** Dado un Cajero y un consumo **ajeno**, o propio con **más de 24 h**,
  cuando intenta anularlo (aun llamando directo a la API), entonces recibe `403 VOID_NOT_ALLOWED`, y se
  muestra "Solo podés anular consumos propios dentro de las 24 hs.".
- **CA-22.6 [B+F] Ya anulado.** Dado un consumo ya anulado, cuando se intenta anular, entonces la respuesta
  es `409 CONSUMPTION_ALREADY_VOIDED` y se muestra "Este consumo ya está anulado.".
- **CA-22.7 [B] Efectos.** En una transacción:
  - el consumo pasa a `VOIDED`, con `voidedAt`, `voidedBy` y `voidReason`;
  - se revierten **todos** los puntos, incluida la bonificación (lote → `VOIDED`; lo ya gastado pasa a
    deuda);
  - se registra el movimiento `VOID_REVERSAL` por `−totalPoints`;
  - `lifetimePoints` baja, y **el nivel puede bajar**;
  - se audita `CONSUMPTION_VOIDED`, con el motivo.

  `VOIDED` es un estado final.
- **CA-22.8 [B+F] Motivo.**
  - Es obligatorio, de 5 a 500 caracteres, sin espacios en los extremos.
  - Mensajes: "El motivo de anulación es obligatorio." y "Indicá un motivo de al menos 5 caracteres.".
- **CA-22.9 [B] Código del consumo.** Si `:code` no cumple `^C-\d{6}$`, la respuesta es `400`. Si no existe,
  `404`: "No existe el consumo {code}.".
- **CA-22.10 [F] Modal "Anular consumo C-000131".** Muestra:
  - el texto fijo de la §3.2.2;
  - Código, Cliente, Monto y Puntos a revertir;
  - "Saldo: {saldo actual} pts → **{saldo − totalPoints} pts**". El saldo actual sale de
    `GET /customers/:id/puntos`; esta resta es la única cuenta que hace la pantalla.
  - Si el resultado es < 0, la alerta de saldo negativo.
  - El campo de motivo y los botones Volver y Confirmar anulación.
- **CA-22.11 [F] Después de anular.**
  - Toast: "Consumo C-000131 anulado. Se revirtieron 500 pts.".
  - Pregunta: "¿Registrar un nuevo consumo para este cliente?". Si la respuesta es "Sí", queda el mismo
    cliente cargado y el monto vacío.
  - Se actualizan el saldo y la tabla.
- **CA-22.12 [F] Modal reutilizable.** El modal se exporta desde el `index.ts` del feature, para que US-23 lo
  use en el detalle del consumo.

**Casos de prueba (e2e):**
- Cajero: propio < 24 h → `200`; propio > 24 h → `403`; ajeno → `403`.
- Administrador: cualquiera → `200`.
- Ya anulado → `409`.
- Motivo de 4 caracteres → `400`.
- Código `131` → `400`.
- Código inexistente → `404`.
- Lote parcialmente gastado → saldo negativo y deuda.
- El nivel baja.
- La bonificación se revierte.
- Cajero con `last24h=false` → solo 24 h.
- Auditoría escrita.

**Recorrido del frontend:**
- Cajero con un consumo propio y otro ajeno.
- Administrador.
- Alerta de saldo negativo.
- Motivo corto.
- Cada error.
- "Sí, registrar consumo".

---

### US-23 — Consultar consumos

| | |
|---|---|
| **Historia** | Como Cliente, quiero consultar mi historial de consumos, para revisar mis consumos registrados en el programa. En este sprint, además, el **Administrador** tiene la sección Consumos |
| **Roles** | Administrador (sección Consumos y detalle) y Cliente (su historial). El **Cajero no tiene la sección** |
| **Contrato** | §3.3 (listado, detalle y tipo), §3.10.2 (`GET /customers/me/consumos`), §8.1 #4 |
| **Prototipo** | `Consumos.dc.html` (listado y detalle). En el archivo principal: `adminScreen === 'consumos'` y, para el Cliente, `clienteTab === 'historial'` ("Historial de consumos") |
| **Depende de** | US-21, y US-22 para el botón "Anular consumo" del detalle |
| **Fuera de alcance** | Las pestañas de la ficha (US-19) |

**Criterios de aceptación**

- **CA-23.1 [B+F] Solo el Administrador.** Dado un Cajero, cuando llama a `GET /consumos` o a
  `GET /consumos/:code`, entonces recibe `403 FORBIDDEN`. "Consumos" no aparece en el menú del Cajero.
- **CA-23.2 [B+F] Tarjetas.** Consumos, Monto total y Puntos otorgados, con los `totals` de la respuesta:
  - `count` incluye los anulados;
  - `amountTotal` y `pointsTotal` cuentan solo los `REGISTERED`.

  Debajo: "Monto total y puntos otorgados no incluyen consumos anulados.".
- **CA-23.3 [B+F] Filtros.**
  - Fechas (calendario de rango), Cliente (DNI o nombre), Estado (Todos, Registrado, Anulado) y Cajero.
  - Se aplican **al apretar Filtrar**; hasta entonces, la etiqueta dice "Sin aplicar".
  - En el backend:
    - `q` con 3 dígitos o más busca en el documento (parcial);
    - si no, busca en nombre y apellido, sin distinguir mayúsculas ni tildes;
    - `fromDate > toDate` → `400`.
- **CA-23.4 [F] Tabla.**
  - Columnas: Código, Fecha y hora, Cliente (nombre y documento con su tipo real), Monto, Puntos, Registrado
    por, Estado y "Ver".
  - De a 8 por página, con "Mostrando 1–8 de 17".
  - Vacío: "No hay consumos para los filtros seleccionados".
- **CA-23.5 [B+F] Detalle.**
  - Muestra "← Volver a Consumos", el código con su badge y estas filas:
    - fecha y hora;
    - cliente (con enlace a la ficha) y documento;
    - monto;
    - **equivalencia aplicada, del snapshot**;
    - puntos;
    - observaciones (o "—");
    - registrado por.
  - Si el consumo está `VOIDED`, se agrega el bloque "Anulación": fecha, anulado por, puntos revertidos y
    motivo.
  - Si está `REGISTERED`, aparece el botón "Anular consumo", que abre el modal de US-22.
- **CA-23.6 [B] Errores del detalle.** Código con formato inválido → `400`. Código inexistente → `404`.
- **CA-23.7 [B+F] Historial del Cliente.**
  - `GET /customers/me/consumos` devuelve solo los consumos del cliente del token.
  - **No** trae `registeredBy`, `voidedBy`, `canVoid` ni `voidableUntil`.
  - La pantalla dice "**Historial de consumos**" (no "de compras") y muestra: Fecha, Monto, "+N pts" y
    Estado (Registrado o Anulado).
  - Vacío: "Todavía no tenés consumos.".
- **CA-23.8 [B] Un Cliente no ve datos de otro.** `customerId` sale del token. Un Administrador o un Cajero
  que llaman a `/customers/me/consumos` reciben `403`.

**Casos de prueba (e2e):**
- Totales con anulados.
- Cada filtro.
- `q` numérico vs. `q` de texto con tildes.
- Rango invertido → `400`.
- Cajero → `403` en el listado y en el detalle.
- Detalle anulado con su bloque de anulación.
- `/me/consumos` con otro rol → `403`.
- `/me/consumos` sin campos de empleados.

**Recorrido del frontend:**
- Filtros que se aplican solo con Filtrar.
- Paginación.
- Detalle anulado y detalle registrado (con "Anular").
- Enlace a la ficha.
- Historial del Cliente vacío y con datos.

**Antes de codear, confirmá:** P8 (carpeta del frontend).

---

### US-19 — Consultar cliente (ficha e inicio del Cliente)

| | |
|---|---|
| **Historia** | Como Cliente, quiero consultar mis datos, saldo de puntos, nivel, misiones vigentes, canjes disponibles y confirmados, para conocer mi situación en el programa. En este sprint, además, está la **ficha del cliente** para el Cajero y el Administrador |
| **Roles** | Cliente (Inicio), Cajero y Administrador (ficha) |
| **Contrato** | §3.4.1 (puntos y ficha), §3.10.1 (Inicio y `GET /customers/me/puntos`), §3.7 ("Dónde se muestra el nivel"), decisión #9 |
| **Prototipo** | `FichaCliente.dc.html` (ficha) y, en el archivo principal, la vista `cliente`, pestaña Inicio |
| **Depende de** | BASE, US-46 (`/customers/:id/puntos`), US-22 y US-26 (endpoints de las pestañas) |
| **Fuera de alcance** | Misiones y canjes (Sprints 4 y 5: "Próximamente"). Foto de perfil (Sprint 4). El modal de ajuste (US-24): la ficha solo lo abre |

**Criterios de aceptación**

- **CA-19.1 [F] Encabezado de la ficha.**
  - "← Volver", el nombre y el botón **Registrar consumo** (Cajero y Administrador).
  - **Ajustar puntos**: solo para el Administrador.
- **CA-19.2 [B+F] Saldo y alerta.**
  - El saldo actual va en número grande, en rojo si es < 0.
  - Si `negativeBalance` es `true`, aparece la alerta "Saldo negativo por anulación de consumo. Requiere
    ajuste del Administrador.". Para el Administrador, la alerta tiene el botón "Ajustar puntos".
- **CA-19.3 [B+F] Nivel.**
  - Badge "Nivel X" y barra con `progressPercent`.
  - Texto "Le faltan {n} pts para {siguiente}", o "Nivel máximo alcanzado" si es Oro.
- **CA-19.4 [F] Puntos por vencer.** "{n} pts vencen el {dd/mm/aaaa}" con el primer elemento de
  `nextExpirations`, o "Sin puntos por vencer".
- **CA-19.5 [F] Datos del cliente.** Documento (con su tipo real), Fecha de alta, Email y Teléfono (o "—").
  Salen de `GET /customers/:id`.
- **CA-19.6 [B+F] Pestañas según el rol.**
  - **Administrador:** "Últimos consumos" y "Movimientos de puntos", con 5 ítems cada una y "Ver todos"
    (lleva a Consumos o a Movimientos, filtrado por el cliente).
  - **Cajero:** "Consumos de las últimas 24 hs" y "Movimientos de las últimas 24 hs", **sin** "Ver" ni
    "Ver todos". El límite de 24 h lo impone el backend.
- **CA-19.7 [B] Inicio del Cliente.** `GET /customers/me/puntos` devuelve la misma forma que
  `/customers/:id/puntos`, solo para el rol `CUSTOMER` y con el cliente del token. Para otro rol, `403`.
- **CA-19.8 [F] Inicio del Cliente.** Muestra:
  - "Puntos disponibles para canjear" y el saldo;
  - el badge de nivel;
  - "Puntos acumulados: **N pts**", la barra y "Te faltan {n} pts para llegar a {nivel}" (o "¡Llegaste al
    nivel máximo!");
  - los próximos vencimientos ("{n} pts · vencen el {dd/mm/aaaa}", o "No tenés puntos por vencer.");
  - la tarjeta "Recompensas · El catálogo y los canjes van a estar disponibles próximamente.";
  - el avatar vacío.
- **CA-19.9 [F] Aviso de saldo negativo (Cliente).** Si `negativeBalance` es `true`: "Tu saldo tiene un
  ajuste pendiente. Comunicate con el restaurante para regularizarlo.".

**Casos de prueba (e2e):** `/customers/me/puntos` con un Cliente (`200`), con un Cajero (`403`) y sin token
(`401`).

**Recorrido del frontend:**
- Ficha como Cajero y como Administrador.
- Cliente en Bronce, Plata y Oro.
- Saldo negativo.
- Sin vencimientos.
- Inicio del Cliente con y sin saldo negativo.

---

### US-24 — Ajustar puntos

| | |
|---|---|
| **Historia** | Como Administrador, quiero ajustar los puntos de un cliente registrando motivo, responsable y fecha, para corregir situaciones excepcionales (por ejemplo, regularizar un saldo negativo por anulación) |
| **Roles** | **Solo el Administrador** |
| **Contrato** | §3.5 (`POST /customers/:id/ajustes-de-puntos` y modal), §3.9.3 (`POINTS_ADJUSTED`), decisión #1 |
| **Prototipo** | `FichaCliente.dc.html` (botón y modal "Ajustar puntos") |
| **Depende de** | BASE, US-19 (ficha) y US-57 (auditoría) |
| **Fuera de alcance** | Editar puntos desde "Ver más" de Clientes: **se sacó** (§8.1 #2) |

**Criterios de aceptación**

- **CA-24.1 [B+F] Permisos.** El Cajero y el Cliente reciben `403 FORBIDDEN`. El botón solo se ve para el
  Administrador.
- **CA-24.2 [B] Sumar.** Dado `ADD` con N puntos, entonces:
  - primero se cancela la deuda;
  - con lo que sobra, se crea un lote con la vigencia vigente;
  - se registra el movimiento `MANUAL_ADJUSTMENT` (+N), con el motivo y `balanceAfter`;
  - la respuesta es `201`, con la forma de la §3.5.1.
- **CA-24.3 [B+F] Restar.**
  - Dado `SUBTRACT` con N ≤ saldo, se descuenta en orden de vencimiento (FIFO).
  - Dado N > saldo, o un saldo negativo, la respuesta es `409 INSUFFICIENT_BALANCE`: "No se puede restar más
    que el saldo disponible.".
  - La pantalla lo impide antes: si la vista previa da < 0, deshabilita "Confirmar ajuste" y muestra el mismo
    mensaje.
- **CA-24.4 [B] El nivel no cambia.** Después de un ajuste, `lifetimePoints` y el nivel quedan iguales.
- **CA-24.5 [B+F] Validaciones.**
  - `points`: entero, > 0 y ≤ 1.000.000. Mensajes: "Ingresá la cantidad de puntos." y "Tiene que ser un
    número entero mayor a 0.".
  - `reason`: obligatorio, de 1 a 500 caracteres. Mensaje: "El motivo es obligatorio.".
- **CA-24.6 [B+F] Cliente dado de baja.** La respuesta es `409 CUSTOMER_INACTIVE`: "El cliente está dado de
  baja.". Cliente inexistente → `404`.
- **CA-24.7 [F] Modal.** Muestra:
  - la cabecera (nombre, documento y "Saldo actual");
  - el selector Sumar o Restar;
  - la cantidad;
  - el motivo;
  - la vista previa "Saldo: {actual} pts → **{resultado} pts**", calculada en la pantalla (permitido por la
    §3.5);
  - los botones Cancelar y Confirmar ajuste.
- **CA-24.8 [F] Regularizar a 0.** Solo si el saldo es < 0, aparece el atajo **Regularizar a 0**. Completa:
  - `ADD`;
  - el valor absoluto del saldo;
  - el motivo "Regularización por anulación de consumo".
- **CA-24.9 [F] Después de confirmar.**
  - Toast: "Ajuste aplicado: +350 pts. Nuevo saldo: 0 pts.".
  - Se actualizan el saldo, la alerta y los movimientos de la ficha.
- **CA-24.10 [B] Auditoría.** `POINTS_ADJUSTED`, con Cantidad (con signo), Saldo resultante y Motivo.

**Casos de prueba (e2e):**
- `ADD` con deuda (regulariza a 0).
- `ADD` sin deuda (crea un lote).
- `SUBTRACT` FIFO.
- `SUBTRACT` mayor que el saldo → `409`.
- `SUBTRACT` con saldo negativo → `409`.
- Decimales → `400`.
- Cajero → `403`.
- Inactivo → `409`.
- `lifetimePoints` sin cambios.
- Auditoría escrita.

**Recorrido del frontend:**
- Regularizar a 0.
- Restar más que el saldo (botón deshabilitado).
- Cada error.
- Cajero sin el botón.

---

### US-25 — Vencimiento automático de puntos (solo backend)

| | |
|---|---|
| **Historia** | Como Sistema, quiero descontar automáticamente los puntos vencidos sin afectar movimientos posteriores, para mantener el saldo consistente |
| **Contrato** | §3.6.3 (proceso), §3.12 (`points_lots`), §3.9.3 (`POINTS_EXPIRED`), §8.4 (dependencia `@nestjs/schedule`, ya autorizada) |
| **Depende de** | BASE y US-57 |
| **Fuera de alcance** | Endpoint HTTP: **no existe**. Notificar el vencimiento (US-48, Sprint 5) |

**Criterios de aceptación**

- **CA-25.1 [B] Horario.** El proceso corre todos los días a las **00:05, hora de Argentina** (cron
  `5 0 * * *`, zona `America/Argentina/Cordoba`).
- **CA-25.2 [B] Vencimiento.** Dado un lote `ACTIVE` con `expiresAt <= ahora` y `remaining > 0`, cuando
  corre el proceso, entonces, en una transacción por lote:
  - se registra el movimiento `EXPIRATION` por `−remaining`, con `balanceAfter`;
  - el lote pasa a `EXPIRED`, con `expiredAt`, y **vence entero**;
  - se audita `POINTS_EXPIRED`, con actor **Sistema**.
- **CA-25.3 [B] Lo que no toca.** El vencimiento no cambia `lifetimePoints` (ni el nivel), ni los movimientos
  posteriores.
- **CA-25.4 [B] Idempotencia.** Dado que el proceso corre dos veces, entonces un lote `EXPIRED` no se vuelve
  a procesar. Dos instancias no procesan el mismo lote (`FOR UPDATE SKIP LOCKED` o *advisory lock*).
- **CA-25.5 [B] Snapshot.** La fecha de vencimiento es la del lote (snapshot). Cambiar la vigencia en la
  configuración no corre los lotes ya creados.
- **CA-25.6 [B] Para probar.** El proceso se puede apagar con `POINTS_EXPIRATION_CRON_ENABLED` y correr a
  demanda con un comando o script, **no** con un endpoint HTTP.

**Casos de prueba:**
- Lote vencido con saldo parcial y con saldo completo.
- Lote sin saldo: no genera movimiento.
- Lote que no venció: no se toca.
- Correr dos veces.
- `lifetimePoints` sin cambios.
- Auditoría con actor Sistema.
- Cambio de vigencia posterior.

**Antes de codear, confirmá:** P7.

---

### US-26 — Consultar movimientos de puntos

| | |
|---|---|
| **Historia** | Como Cliente, quiero consultar el historial de movimientos de mis puntos con fecha, cantidad, motivo y estado, para conocer cómo se conformó mi saldo. En este sprint, además, el **Administrador** tiene la sección Movimientos de puntos |
| **Roles** | Administrador (todos los clientes), Cajero (un cliente, últimas 24 h) y Cliente (los suyos) |
| **Contrato** | §3.6 (tipo `PointsMovement`, §3.6.1 y §3.6.2), §3.10.2 (`GET /customers/me/movimientos`), §2.2 (textos para el Cliente) |
| **Prototipo** | `MovimientosPuntos.dc.html` y, en el archivo principal, `adminScreen === 'movimientos'` y `clienteTab === 'historial'` ("Historial de puntos") |
| **Depende de** | BASE y US-21 (para tener movimientos) |
| **Fuera de alcance** | Movimientos `REDEMPTION` reales (Sprint 4). El valor ya existe para el filtro |

**Criterios de aceptación**

- **CA-26.1 [B] Movimientos de un cliente.** `GET /customers/:id/movimientos`:
  - para el Cajero, `last24h` se fuerza a `true`;
  - acepta el filtro `type` y la paginación;
  - el orden es por fecha descendente y, a igual fecha, por id descendente.
- **CA-26.2 [B] `description` la arma el backend:**
  - `Consumo C-000131`;
  - `Anulación de C-000131`;
  - `Ajuste: {motivo}`;
  - `Vencimiento de lote del dd/mm/aaaa`.
- **CA-26.3 [B] Lote y responsable.**
  - `lot` viene con su `status` para los créditos, los ajustes que crearon lote y los vencimientos.
  - `performedBy` es el empleado o `{ actorType: 'SYSTEM', accountId: null, name: 'Sistema' }`.
- **CA-26.4 [B+F] Sección del Administrador.**
  - `GET /movimientos-de-puntos` es solo para el Administrador; el Cajero recibe `403`.
  - Columnas: Fecha y hora, Cliente (nombre y documento), Tipo (badge con ícono), Detalle / origen, Puntos
    (verde si es +, rojo si es −), Saldo resultante (rojo si es < 0) y Realizado por.
  - Filtros: Cliente (DNI o nombre), Fechas y Tipo. Se aplican con **Filtrar**.
  - De a 10 por página.
  - Vacío: "No hay movimientos para los filtros seleccionados".
- **CA-26.5 [F] Pestaña de la ficha.**
  - Columnas: Fecha y hora, Tipo (badge), Detalle y Puntos.
  - Vacío: "Este cliente todavía no tiene movimientos de puntos.".
- **CA-26.6 [B+F] Historial de puntos del Cliente.**
  - `GET /customers/me/movimientos` **no** trae `performedBy` ni `customer`.
  - El texto de cada movimiento sale de la tabla de la §2.2. Por ejemplo, "Sumaste {n} pts por tu consumo".
  - Se muestra la cantidad con signo y el estado del lote (Vigente, Consumido, Vencido o Anulado) si viene.
  - Vacío: "Todavía no tenés movimientos.".
- **CA-26.7 [B] Permisos.** `/customers/me/movimientos` con un rol que no sea Cliente responde `403`.

**Casos de prueba (e2e):**
- Un movimiento de cada tipo, con su `description`.
- El Cajero solo ve 24 h.
- Filtros del Administrador.
- `/me` sin `performedBy`.
- Cajero → `403` en `/movimientos-de-puntos`.

**Recorrido del frontend:**
- Los badges de cada tipo.
- Los colores y signos.
- Los filtros con Filtrar.
- La pestaña de la ficha.
- El historial del Cliente con cada tipo.

**Antes de codear, confirmá:** P8 (carpeta del frontend).

---

### US-27 — Configurar niveles

| | |
|---|---|
| **Historia** | Como Administrador, quiero definir los niveles de fidelización y su puntaje mínimo, para establecer la mecánica de niveles |
| **Roles** | Solo el Administrador |
| **Contrato** | §3.7 (reglas, `GET` y `PUT /loyalty/configuration/levels`, pantalla y mensajes), §3.9.3 (`LEVELS_UPDATED`) |
| **Prototipo** | Configuración (engranaje) → **Puntos** → tarjeta **Niveles**, debajo de "Equivalencia de puntos" (`guardarNiveles` en el archivo principal). **Ojo:** el ítem "Niveles de fidelización" del menú de configuración (`configScreen === 'niveles'`, marcado "Próximamente") es el diseño viejo y **no** se usa |
| **Depende de** | BASE y US-57 |
| **Fuera de alcance** | **Beneficios** de cada nivel: están pendientes de definir y no se muestran ni se guardan. Crear o renombrar niveles: son fijos |

**Criterios de aceptación**

- **CA-27.1 [B] Leer.** `GET /loyalty/configuration/levels` devuelve los tres niveles (Bronce desde 0, no
  editable), `configurationVersion` y `updatedAt`.
- **CA-27.2 [B] Guardar.** Dados `silverMinPoints` y `goldMinPoints` válidos, cuando se guarda, entonces:
  - se crea una **nueva versión** de la configuración, copiando el resto de los valores;
  - se audita `LEVELS_UPDATED`, con el antes y el después;
  - la respuesta es `200`, con la forma del `GET`.
- **CA-27.3 [B+F] Validaciones.**
  - Los dos campos son enteros. Plata > 0 y Oro > Plata.
  - Mensajes:
    - "Completá este campo.";
    - "Ingresá un número entero, sin decimales.";
    - "El umbral de Plata debe ser mayor que 0";
    - "El umbral de Oro debe ser mayor que el de Plata".
- **CA-27.4 [B] Recálculo inmediato.** Después de guardar, el nivel de cada cliente cambia sin ningún
  proceso aparte: el nivel no se guarda, se calcula al leer.
- **CA-27.5 [B] Configuración completa.** `GET /loyalty/configuration/current` y
  `PUT /loyalty/configuration` incluyen `silverMinPoints` y `goldMinPoints`. En el `PUT` son opcionales; si
  se omiten, se copian de la versión vigente.
- **CA-27.6 [F] Tarjeta.**
  - Los dos textos de la §3.7.
  - Las filas: Bronce "Desde 0 puntos" (sin input), Plata "Desde [input] puntos" y Oro "Desde [input]
    puntos".
  - El botón Guardar.
  - Al guardar: "Niveles actualizados. Se recalculó el nivel de los clientes.".
- **CA-27.7 [B+F] Permisos.** El Cajero recibe `403` y no ve Configuración.

**Casos de prueba (e2e):**
- `GET` inicial (300 y 800).
- `PUT` válido: versión nueva.
- Oro ≤ Plata → `400`.
- Decimales → `400`.
- Un cliente cambia de nivel después del `PUT`.
- Auditoría con antes y después.
- Cajero → `403`.

---

### US-17-AJ — Alta de cliente con cuenta y contraseña inicial (ajuste de US-17)

| | |
|---|---|
| **Qué cambia** | Cuando el Cajero ("Nuevo cliente") o el Administrador ("+ Registrar cliente") dan de alta un cliente, ahora se crea también **su cuenta**, con **contraseña inicial = número de documento** y `mustChangePassword = true` (decisión #7) |
| **Contrato** | §3.11.3 (completo), §3.8.4, §3.9.3 (`CUSTOMER_CREATED`), §8.1 #8 |
| **Prototipo** | Caja → "Nuevo cliente" (`empleadoScreen === 'altaCliente'`) y Clientes → "+ Registrar cliente" |
| **Depende de** | BASE (`must_change_password`), CORR (unicidad de email entre activos) y US-57 |
| **Fuera de alcance** | La ventana "Cambiá tu contraseña" y `PATCH /mi-cuenta/password` (PERFIL) |

**Criterios de aceptación**

- **CA-17AJ.1 [B] Alta con cuenta.** Dado un alta válida en `POST /customers`, entonces, en la **misma
  transacción**, se crea:
  - el cliente;
  - su cuenta, con rol `CUSTOMER`, el email del cliente, el hash del **documento normalizado** (en
    mayúsculas si es pasaporte) y `mustChangePassword = true`.

  Se hace con el evento `customer.created`, que escucha `accounts`, para que `customers` no importe
  `accounts` (ADR 005).
- **CA-17AJ.2 [B] Email en uso.** Dado un email que ya usa otra cuenta activa, entonces la respuesta es
  `409 EMAIL_IN_USE` y **no se crea nada**: ni el cliente ni la cuenta.
- **CA-17AJ.3 [B] La contraseña inicial no pasa por la política.** Un DNI de 7 dígitos es válido como
  contraseña inicial.
- **CA-17AJ.4 [B] La respuesta no cambia.** Es `201` con el `Customer`, como antes. **No** devuelve la
  contraseña.
- **CA-17AJ.5 [B] Login y refresh.** Dado el cliente recién creado, cuando ingresa con su email y su
  documento, entonces accede, y `user.mustChangePassword` es `true`. Para los empleados y los clientes
  autorregistrados, es siempre `false`.
- **CA-17AJ.6 [B] Autorregistro sin cambios.** El cliente elige su contraseña y nace con
  `mustChangePassword = false`.
- **CA-17AJ.7 [B] Clientes que ya existen sin cuenta.** Una migración o un script de una sola vez les crea la
  cuenta con el mismo criterio. Solo a los activos, y solo si su email no lo usa otra cuenta activa. Los que
  chocan se **listan** para resolverlos a mano.
- **CA-17AJ.8 [B] Auditoría.** `CUSTOMER_CREATED`, con la fila "Cuenta de acceso: Creada, contraseña
  inicial = número de documento". **Nunca** se guarda el valor.
- **CA-17AJ.9 [F] Mensaje.** En Caja y en Administración, después del alta: "Cliente registrado. Ingresa con
  su mail y su número de documento como contraseña; al entrar se le va a pedir que la cambie.". **Se saca**
  "Recibirá un mail para definir su contraseña".

**Casos de prueba (e2e):**
- Alta → existe la cuenta.
- Login con el documento → `mustChangePassword: true`.
- Pasaporte en mayúsculas.
- Email en uso → `409` y no queda el cliente.
- Autorregistro → `false`.
- Auditoría sin el valor de la contraseña.

**Antes de codear, confirmá:** P2.

---

### CLI-ADM — Clientes del Administrador (pendiente del Sprint 2)

| | |
|---|---|
| **Qué es** | La pantalla "Clientes" del menú del Administrador. Cubre US-19 (del lado del Administrador), US-18 y US-20 |
| **Roles** | Administrador. El Cajero usa los mismos endpoints desde Caja, con sus restricciones |
| **Contrato** | §3.8 (completo: listado, "Ver más", Editar, Eliminar, "+ Registrar cliente" y "Ver ficha"), §1 ("Existentes que cambian" y "se eliminan"), §3.9.3 (`CUSTOMER_UPDATED` y `CUSTOMER_DEACTIVATED`), decisión #4 |
| **Prototipo** | `adminScreen === 'clientes'` en el archivo principal (tabla, "Ver más", "Editar", "Eliminar" y "+ Registrar cliente") |
| **Depende de** | BASE (saldo y nivel), US-57, CORR (baja de la cuenta, unicidad de email) y US-17-AJ (alta con cuenta) |
| **Fuera de alcance** | Reactivar clientes: **no existe**. Editar puntos: **se sacó**, se usa el ajuste de US-24. Lo que hace el Cajero en Caja (P3) |

**Criterios de aceptación**

- **CA-CLI.1 [B] Listado.** `GET /customers` agrega los parámetros:
  - `q`: nombre, apellido o documento normalizado, coincidencia parcial. Junto con `name`, responde `400`.
  - `level`: filtra por el nivel calculado.
  - `sort=lastName|id`: el valor por defecto sigue siendo `id`.

  Cada ítem agrega `balance`, `lifetimePoints` y `level`, sin quitar nada de lo que ya viene.
- **CA-CLI.2 [F] Tabla.**
  - Solo clientes activos (`active=true`), ordenados por apellido (`sort=lastName`).
  - Columnas: Apellido, Nombre, Nivel (badge), Saldo (rojo si es < 0), Fecha de alta, Estado, "Ver más" y
    "Ver ficha".
  - **Sin la columna "Puntos"** (decisión #4).
  - Filtros: Buscar ("Apellido, nombre o documento") y Nivel (Todos los niveles, Bronce, Plata u Oro).
  - Vacío: "Sin resultados para esa búsqueda.".
- **CA-CLI.3 [F] "Ver más".**
  - Muestra el documento, Nivel, Saldo, Acumulados, Teléfono, Mail y Estado.
  - Botones: Eliminar, Cerrar y Editar.
- **CA-CLI.4 [B+F] Editar.**
  - Se editan Nombre, Apellido, Teléfono, Mail y, **solo el Administrador**, el tipo y el número de
    documento.
  - **No** hay campo de puntos.
  - "Motivo del cambio (obligatorio)" es `reason`: obligatorio para el Administrador. Si falta: "Indicá el
    motivo del cambio para continuar.".
  - Al guardar: "Cliente actualizado y registrado en auditoría.".
- **CA-CLI.5 [B] Documento y Cajero.** Dado un Cajero que manda `documentType` o `documentNumber` en
  `PATCH /customers/:id`, entonces la respuesta es `403 FORBIDDEN_FIELD`.
- **CA-CLI.6 [B] Clientes inactivos.** Dado un cliente inactivo, cuando se intenta editarlo, entonces no se
  permite.
- **CA-CLI.7 [B] Documento corregido.** Dado un cliente con `mustChangePassword = true`, cuando el
  Administrador corrige su documento, entonces la contraseña inicial pasa a ser el documento nuevo, en la
  misma transacción. Si el cliente ya cambió la contraseña, no se toca.
- **CA-CLI.8 [B] Email corregido.** Dado que se corrige el email, entonces también cambia el email de acceso
  (evento `customer.email-changed`, ya existente).
- **CA-CLI.9 [B+F] Eliminar (baja lógica).**
  - El diálogo dice "¿Seguro que querés eliminar a **{nombre}**? Va a dejar de aparecer en el listado y no
    se puede deshacer.".
  - Usa `PATCH /customers/:id/deactivate` (`204`) y, en la misma transacción:
    - el cliente queda inactivo;
    - **su cuenta queda inactiva y se cierran sus sesiones** (se publica `customer.deactivated`);
    - se audita `CUSTOMER_DEACTIVATED`, con "Saldo perdido: N pts".
  - Mensaje: "Cliente eliminado.".
- **CA-CLI.10 [B] Sin reactivación.** `PATCH /customers/:id/activate` **ya no existe** (`404`).
- **CA-CLI.11 [F] "+ Registrar cliente".**
  - Es el mismo formulario que "Nuevo cliente" de Caja: Nombre, Apellido, Fecha de nacimiento (opcional),
    Tipo y Número de documento, Mail y Teléfono (opcional).
  - El documento es texto.
  - Usa el mensaje de CA-17AJ.9.
- **CA-CLI.12 [F] "Ver ficha".** Abre la ficha de US-19 con el rol de Administrador.

**Casos de prueba (e2e):**
- `q` por documento parcial.
- `q` junto con `name` → `400`.
- Filtro por nivel.
- `sort=lastName`.
- Ítems con `balance` y `level`.
- Administrador sin `reason` → `400`.
- Cajero con documento → `403`.
- Corrección de documento con `mustChangePassword`.
- La baja deja la cuenta inactiva y el login falla.
- `activate` → `404`.
- Auditorías.

**Antes de codear, confirmá:** P3, si tu tarea toca también la parte del Cajero.

---

### PERFIL — Mi perfil, contraseña y cerrar sesión del Cliente (número de US a confirmar, ver P1)

| | |
|---|---|
| **Historia** | Como Cliente, quiero ver y editar mis datos de contacto, cambiar mi contraseña (también la inicial, con la ventana de cambio al ingresar) y cerrar sesión, para mantener mi cuenta al día y segura |
| **Roles** | Cliente. `PATCH /mi-cuenta/password` admite cualquier rol, pero la pantalla existe solo para el Cliente |
| **Contrato** | §3.10.3 (`GET /customers/me`), §3.10.4 (`PATCH /customers/me`), §3.10.5 (cerrar sesión), §3.11 (política), §3.11.1 (`PATCH /mi-cuenta/password`), §3.11.3 (ventana "Cambiá tu contraseña"), decisiones #9, #10 y #12, §8.1 #5, #6, #11 y #13 |
| **Prototipo** | `MiPerfil.dc.html` y, en el archivo principal, `clienteTab === 'perfil'` (se abre desde el ícono de la barra superior). **La ventana "Cambiá tu contraseña" no está en el prototipo**: el texto y los campos salen del contrato, §3.11.3 |
| **Depende de** | US-17-AJ (`mustChangePassword` en login y refresh) y CORR (unicidad de email entre activos) |
| **Fuera de alcance** | Foto de perfil (Sprint 4: "Cambiar foto" deshabilitado). Auditoría: lo que hace el cliente **no** se audita |

**Criterios de aceptación**

- **CA-PER.1 [B] Mi perfil.** `GET /customers/me` devuelve la forma de la §3.10.3, solo para el Cliente y
  con el cliente del token. Para otro rol, `403`.
- **CA-PER.2 [F] "Mis datos" (solo lectura, como texto, sin inputs).** Muestra:
  - la foto, con "Cambiar foto" deshabilitado;
  - nombre y apellido;
  - el documento ("DNI 30111222", con su tipo real);
  - la fecha de alta;
  - "Para cambiar estos datos, comunicate con el restaurante.".
- **CA-PER.3 [B+F] "Datos de contacto".**
  - Se editan el teléfono (opcional, 8 a 15 dígitos), el correo (obligatorio) y la fecha de nacimiento
    (opcional, no futura, año ≥ 1900).
  - Se envía **solo lo que cambió**.
  - Cancelar y Guardar cambios están **deshabilitados si no hay cambios**.
  - Toast: "Datos actualizados".
- **CA-PER.4 [B] Lo que no se edita.** Dado un body con `firstName`, `lastName`, `documentType` o
  `documentNumber`, entonces la respuesta es `400 property X should not exist`.
- **CA-PER.5 [B+F] Cambiar el correo.**
  - Cuando el cliente modifica el correo, aparece "Contraseña actual" (con mostrar y ocultar) y la ayuda
    "Para cambiar el correo con el que ingresás, confirmá tu contraseña.". Si vuelve al valor original, el
    campo desaparece.
  - Errores en el backend:
    - sin `currentPassword` → `400`: "Ingresá tu contraseña actual para cambiar el correo";
    - contraseña incorrecta → `400 CURRENT_PASSWORD_INCORRECT`, y **no se guarda nada**, tampoco el
      teléfono ni la fecha;
    - correo en uso por otro activo → `409 EMAIL_IN_USE`: "Ese correo ya está registrado".
  - Si el correo cambia, cambia también el email de acceso, y la sesión actual sigue abierta.
- **CA-PER.6 [B] Límite de intentos.** Más de 5 contraseñas actuales incorrectas en 15 minutos responden
  `429 TOO_MANY_ATTEMPTS`: "Hiciste demasiados intentos. Probá de nuevo en unos minutos.". El contador se
  comparte con el cambio de contraseña.
- **CA-PER.7 [F] "Mi situación en el programa".** Saldo, Nivel y Acumulados (de `/customers/me/puntos`),
  con el aviso de saldo negativo.
- **CA-PER.8 [B+F] Cambiar contraseña.** `PATCH /mi-cuenta/password`, con `currentPassword` y
  `newPassword`. La respuesta es `204` y:
  - se guarda el hash nuevo;
  - `mustChangePassword` pasa a `false`;
  - **se cierran todas las otras sesiones**, y la actual sigue abierta.
- **CA-PER.9 [B+F] Política de contraseña.** Cada regla con su mensaje bajo el campo:
  - entre 8 y 64 caracteres;
  - como máximo 72 bytes;
  - distinta del mail;
  - distinta de la actual (`PASSWORD_SAME_AS_CURRENT`);
  - distinta del documento (`PASSWORD_SAME_AS_DOCUMENT`).

  Si la actual no coincide: `400 CURRENT_PASSWORD_INCORRECT` (**`400`, no `401`**).
- **CA-PER.10 [F] Formulario de cambio de contraseña.**
  - Campos: Contraseña actual, Nueva contraseña (con la ayuda "Entre 8 y 64 caracteres. No puede ser tu mail
    ni tu número de documento.") y Confirmar nueva contraseña, cada uno con mostrar y ocultar.
  - "Las contraseñas no coinciden" lo valida solo la pantalla.
  - Toast: "Contraseña actualizada". Los campos se vacían.
- **CA-PER.11 [F] Ventana "Cambiá tu contraseña".**
  - Dado un login o un refresh con `mustChangePassword = true`, entonces, antes del Inicio y encima de todo,
    se abre la ventana con el título, el texto y los campos de la §3.11.3.
  - "Contraseña actual" lleva la ayuda "Es tu número de documento, sin puntos.".
  - Al cambiarla: toast "Contraseña actualizada", y la ventana no vuelve a aparecer.
  - Con "Ahora no": la ventana se cierra y **vuelve a aparecer en el próximo ingreso** (según P2).
- **CA-PER.12 [B+F] Cerrar sesión.**
  - El botón va al final del perfil.
  - El diálogo dice "¿Querés cerrar sesión? Vas a salir de tu cuenta y volver a la pantalla de ingreso."
    (Cancelar o Cerrar sesión).
  - Llama a `POST /auth/logout`.
  - Se borran el token y el usuario, y se va al login, **aunque la llamada falle**.
- **CA-PER.13 [B] Sin auditoría.** Ni `PATCH /customers/me` ni el cambio de contraseña de un cliente escriben
  en la auditoría.

**Casos de prueba (e2e):**
- `/customers/me` con otro rol → `403`.
- `PATCH` solo con el teléfono.
- `PATCH` con el email sin contraseña.
- `PATCH` con el email y una contraseña incorrecta (no se guarda nada).
- `PATCH` con el email en uso.
- Campos prohibidos → `400`.
- Cambio de contraseña con la actual incorrecta, igual a la actual, igual al documento e igual al mail.
- Cambio correcto: `mustChangePassword` pasa a `false` y las otras sesiones se cierran.
- `429` al sexto intento.
- Sin auditoría.

**Recorrido del frontend:**
- Guardar deshabilitado sin cambios.
- Cambiar el correo (aparece y desaparece "Contraseña actual").
- Cada error.
- La ventana al ingresar, "Ahora no" y el reingreso.
- Cerrar sesión con el backend caído.

**Antes de codear, confirmá:** P1 y P2.

---

### EMP-PASS — Contraseña y reactivación de usuarios de empleados (ajuste de US-06 y US-07)

| | |
|---|---|
| **Qué cambia** | Cuando el Administrador cambia la contraseña de un empleado, se cierran sus sesiones y se audita. La **reactivación de usuarios** se mantiene, pero ahora controla que el email no esté en uso por otra cuenta activa (decisión #8) |
| **Roles** | Administrador |
| **Contrato** | §3.11.2, §3.11.4, §3.11 (política), §3.9.3 (`USER_ACCOUNT_UPDATED` y `USER_ACCOUNT_REACTIVATED`) |
| **Prototipo** | Configuración → Empleados → empleado → Usuario del sistema → "Cambiar contraseña" y "Reactivar usuario" (`configScreen === 'empleados'`) |
| **Depende de** | US-57 y CORR (unicidad de email entre activos) |
| **Fuera de alcance** | Reactivar **empleados**: no existe |

**Criterios de aceptación**

- **CA-EMP.1 [B] Cambio de contraseña.** Dado `PATCH /usuarios/:id` con `{ password }`, entonces:
  - se guarda el hash nuevo;
  - **se cierran todas las sesiones** de esa cuenta;
  - se audita `USER_ACCOUNT_UPDATED`, con la fila "Contraseña: Modificada".

  El rol **no** viaja por este endpoint (se cambia desde `PATCH /empleados/:id`).
- **CA-EMP.2 [B] Cuenta inactiva.** Dada una cuenta inactiva, cuando se intenta cambiarle la contraseña,
  entonces la respuesta es `409`.
- **CA-EMP.3 [F] Pantalla de cambio de contraseña** (ya existe; se ajustan los textos de la §3.11.2):
  - Antes de guardar: "Vas a cambiar la contraseña de **{nombre}**. La anterior deja de funcionar en cuanto
    guardes.".
  - Después de guardar: "Se cambió la contraseña de **{nombre}**…", con "Copiar" y la nota "Pasásela al
    empleado ahora: después no se vuelve a mostrar.".
- **CA-EMP.4 [F] La pantalla no exige más que el backend.** Si el Administrador escribe la contraseña a
  mano, la pantalla solo exige la regla de la §3.11. El generador (12 caracteres) sigue igual.
- **CA-EMP.5 [B] Reactivar usuario.** `PATCH /usuarios/:id/reactivate`:
  - cuenta ya activa → `409`;
  - empleado dado de baja → `409`;
  - email usado por otra cuenta activa → `409 EMAIL_IN_USE`: "El mail de este usuario ya lo usa otra cuenta
    activa.";
  - si funciona, conserva la contraseña y se audita `USER_ACCOUNT_REACTIVATED` ("Estado del usuario:
    Inactivo → Activo").
- **CA-EMP.6 [F] Diálogo de reactivación.** "¿Reactivar el usuario de **{nombre}**? Va a poder volver a
  ingresar al sistema con la contraseña que tenía.".

**Casos de prueba (e2e):**
- Después del cambio de contraseña, el refresh de una sesión vieja falla.
- Cambio sobre una cuenta inactiva → `409`.
- Reactivar con el email tomado → `409 EMAIL_IN_USE`.
- Reactivar bien y loguearse con la contraseña vieja.
- Auditorías.

---

### CORR — Correcciones de los Sprints 1 y 2

**No tiene criterios propios.** Todo está en `docs/sprint-3/VERIFICACION_SPRINTS_1_2.md`:

| Qué | Dónde |
|---|---|
| Lista priorizada de cambios | §11 |
| Unicidad de email entre activos y migración | §3 |
| La baja del cliente desactiva su cuenta | §3.3 |
| Quitar la reactivación de clientes | §4 |
| Validaciones campo por campo | §6 |
| Casos de regresión que tienen que seguir pasando | §10 |

**Cómo se reparte:** cada fila de la §11 que alguien tome se anota acá abajo, con su responsable. Claude toma
los criterios de la sección indicada.

| Fila de la §11 | Responsable | Rama | Estado |
|---|---|---|---|
| | | | |

**Antes de codear, confirmá:** P3, si tocás algo de US-18 o US-20.
