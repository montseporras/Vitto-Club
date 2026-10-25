# US-21 (frontend): qué se cumple del contrato y qué no

Registrar consumo, rama `feature/US-21-registrar-consumo-front`. Se comparó el código con el
contrato (`docs/sprint-3/API_CONTRACT_SPRINT_3.md`, §3.1), los criterios CA-21.x de
`docs/sprint-3/HISTORIAS_SPRINT_3.md` y el prototipo `docs/prototipo/v2/RegistrarConsumo.html`.

No se modificó ninguna fuente de verdad. Lo que no coincide queda anotado para que el equipo decida
si se corrige el código o se lleva al contrato.

Solo se evalúan los criterios de la capa frontend (`[F]` y `[B+F]`). Los `[B]` son del backend.

## 1. Lo que se cumple tal cual

| Criterio | Qué dice el contrato | Dónde está en el código |
|---|---|---|
| CA-21.1 | La vista previa sale de `GET /consumos/preview`, con debounce de 300 ms. No llama si el monto es inválido. Muestra "Se acreditarán X puntos", "Saldo resultante" y "Equivalencia vigente" | `RegisterConsumptionForm.tsx` (`useDebounce(…, 300)`, sin cuentas locales) |
| CA-21.3 (pantalla) | Con bonificación, la pantalla agrega "(incluye N de bonificación por primer consumo)" | `ConsumptionRegistered.tsx`, fila "Puntos acreditados" |
| CA-21.8 | El monto acepta `50000`, `50.000`, `12500,50` y `12.500,50`, y se envía como número JSON. Mensajes: vacío, formato inválido y ≤ 0 | `schemas/consumption.schema.ts` (`parseAmount`, `AMOUNT_MESSAGES`) |
| CA-21.9 | "Consumo registrado" con código, fecha y hora (Argentina), cliente con el tipo de documento real, monto, puntos acreditados, observaciones (o "—"), saldo antes → después y "Registrado por" | `ConsumptionRegistered.tsx` |
| CA-21.9 (nivel) | Si `levelUp` es `true`, agrega "¡{Nombre} subió a nivel {X}!" | `ConsumptionRegistered.tsx`: recuadro verde arriba de las filas |
| CA-21.9 (toast) | Toast "Consumo C-000141 registrado: +500 pts." | `ConfirmConsumptionModal.tsx`. La subida de nivel ya no va en el toast |
| CA-21.10 | "Ver detalle" aparece solo para el Administrador | `IdentifyCustomerPage.tsx` pasa `canViewDetail` solo si el rol es `ADMIN` (ver §2.4 sobre lo que hace) |
| CA-21.11 | `409 CUSTOMER_INACTIVE` → "El cliente está dado de baja. No se pueden registrar consumos." | `api/consumption-errors.ts` |
| CA-21.12 | `409 POINTS_EQUIVALENCE_NOT_CONFIGURED` → "Todavía no se configuró la equivalencia de puntos. Pedíselo a un administrador." | `api/consumption-errors.ts` |
| §3.1.3 (body) | Se envía solo `customerId`, `amount` y `notes`. Vacío va como `null` | `ConfirmConsumptionModal.tsx` (`notes.trim() \|\| null`) |
| §3.1.3 (errores) | Se decide por `code`, no por el texto | `consumptionError()` |
| §8.1 #3 | Muestra el tipo de documento real, no "DNI" fijo | `ConsumptionRegistered.tsx` usa `DOCUMENT_TYPES[documentType]` |
| §3.1.1 | Cliente de baja se trata como no encontrado, con el enlace "Registrar cliente" | `IdentifyCustomerPage.tsx` (de US-46) |

## 2. Lo que no se cumple tal cual

### 2.1 "Registrar otro consumo" no vuelve a la búsqueda

| | |
|---|---|
| **Contrato** | CA-21.10 y §3.1.3: "Registrar otro consumo" **vuelve a la búsqueda** |
| **Código** | Vuelve al formulario del monto, vacío, **con el mismo cliente** cargado |
| **Por qué** | Decisión de Denise: el cliente tiene que seguir visible tras registrar (antes no se veía bien). La búsqueda desde cero la hace el botón "Buscar otro cliente" |
| **Para decidir** | Si se mantiene, llevarlo al contrato. Si no, que "Registrar otro consumo" llame a `searchAnother()` |

### 2.2 Las observaciones están en el modal, no debajo del monto

| | |
|---|---|
| **Contrato** | §3.1.3 y CA-21.7: el campo "Observaciones (opcional)" va **debajo del monto**. El prototipo lo ubica ahí también, antes de la vista previa |
| **Código** | El campo está dentro del modal de confirmación (`ConfirmConsumptionModal.tsx`) |
| **Por qué** | Decisión de Denise, junto con el modal. Se veia muy sobrecargada la pestaña de consultar cliente. Además, así se obliga al cajero a confirmar el consumo y evitar que lo toque sin querer ya que el nuevo modal es de confirmación, mismo que se menciona abajo |
| **Se cumple igual** | Opcional, hasta 255 caracteres con contador, vacío se guarda como `null`, se muestra "—" en "Consumo registrado" |

### 2.3 Hay un modal de confirmación que no existe en el contrato ni en el prototipo

| | |
|---|---|
| **Contrato y prototipo** | El botón "Registrar consumo" registra directo. En `RegistrarConsumo.html` el único diálogo es el de anulación. El contrato no menciona una confirmación previa |
| **Código** | "Registrar consumo" abre un modal "Registrar consumo" con la vista previa, las observaciones y los botones "Cancelar" y "Aceptar". Recién "Aceptar" registra |
| **Por qué** | Decisión de Denise para evitar registros por error.|
| **Para decidir** | Llevarlo al contrato y al prototipo, o sacarlo. Si se saca, las observaciones vuelven al formulario (§2.2) |

### 2.4 "Ver detalle" no hace nada

| | |
|---|---|
| **Contrato** | CA-21.10 y §3.1.3: "Ver detalle" va a `GET /consumos/:code`, el detalle del consumo, solo para el Administrador |
| **Código** | El botón aparece para el Administrador pero está **deshabilitado**: no navega a ningún lado |
| **Por qué** | El detalle del consumo es de **US-23** (sección Consumos del Administrador) y todavía no existe en el frontend. No hay ninguna ruta de consumos en `src/app/router/`, y ni el contrato ni las historias dicen cuál será la URL. `CLAUDE.md` prohíbe inventar rutas. `HISTORIAS_SPRINT_3.md` (US-21, fuera de alcance) aclara que en esta historia "Ver detalle" solo navega |
| **Qué falta** | Que el equipo defina la ruta del detalle (por ejemplo, algo como `/admin/consumos/C-000144`). Entonces: habilitar el botón y navegar en `ConsumptionRegistered.tsx` |

### 2.5 "Buscar otro cliente" no está en el contrato ni en el prototipo

| | |
|---|---|
| **Código** | Botón "Buscar otro cliente", arriba de la búsqueda, solo mientras hay un cliente a la vista (`IdentifyCustomerPage.tsx`) |
| **Por qué** | Decisión de Denise: sin él, para cambiar de cliente hay que borrar el documento a mano. Así ahorras segundos |
| **Para decidir** | Llevarlo al contrato y al prototipo, o sacarlo |

### 2.6 La pantalla "Consumo registrado" no ocupa toda la pantalla

| | |
|---|---|
| **Contrato y prototipo** | "Consumo registrado" reemplaza la pantalla de búsqueda. El contrato dice que "Registrar otro consumo" vuelve a la búsqueda |
| **Código** | Se muestra **en lugar del formulario del monto**, debajo de la tarjeta del cliente (con el saldo ya actualizado) y arriba del panel de movimientos |
| **Por qué** | Consecuencia de §2.1: como el cliente sigue a la vista, la pantalla comparte lugar con la tarjeta |
| **Se cumple igual** | Las 8 filas, el aviso de nivel y los botones |

### 2.7 El aviso de nivel está arriba de las filas, no como una fila "Aviso"

| | |
|---|---|
| **Contrato** | §3.1.3 lista el "Aviso" al final de la tabla de filas |
| **Prototipo** | Lo muestra como un recuadro verde destacado, **arriba** de las filas |
| **Código** | Sigue al prototipo (recuadro verde arriba). El contrato no define la posición, solo el texto, así que no es un choque de datos |

## 3. Textos que no están en el contrato ni en el prototipo

Conviene sumarlos al contrato o al prototipo, o cambiarlos.

| Texto | Dónde aparece | Observación |
|---|---|---|
| "Ingresá un monto válido menor a 9999999999." | Monto mayor al máximo (`AMOUNT_MESSAGES.max`) | El contrato fija el máximo `9999999999.99` pero no da el mensaje. No se encontró en `RegistrarConsumo.html` |
| "No se pudo buscar el cliente." | Cualquier error de la vista previa o del registro que no sea uno de los dos 409 (`consumptionError`) | Es el texto de la búsqueda, reutilizado. No es del todo preciso para un error al registrar |
| "Cargando…" | Modal, mientras llega la vista previa | Mismo texto que ya se usó en US-46 |
| "Registrar consumo" (título del modal) y "Aceptar" | `ConfirmConsumptionModal.tsx` | Parte del modal de §2.3 |
| "Buscar otro cliente" | `IdentifyCustomerPage.tsx` | Ver §2.5 |

## 4. Para el resumen final y el equipo

- **Mocks.** El saldo de Martín (id 2) es −350 y `lifetimePoints` 150, pero sus movimientos sumarían −500.
  Es un dato de ejemplo que no cuadra con su historial (`src/mocks/handlers/cashier.handlers.ts`).
  No es parte de US-21 y no se tocó.
- **Verificación hecha.** `npm run lint` y `npm run build` pasan. El recorrido manual con mocks se hizo
  con el Administrador (Sofía Ríos, $30.000: sube a Plata con bonificación de 45 pts).
- **Pendiente de verificar a mano:** los dos 409 (monto $777 y $666 en los mocks), el rol Cajero (sin
  "Ver detalle") y el Escape del modal.
- **HISTORIAS_SPRINT_3.md, tabla de asignaciones:** US-21 figura como "Sin empezar" y sin responsable de frontend.
  Está desactualizada.
