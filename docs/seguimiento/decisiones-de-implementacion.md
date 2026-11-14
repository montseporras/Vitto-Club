# Decisiones de implementación (Sprints 3 y 4)

> **Para qué es este archivo.** Junta en un solo lugar las decisiones, aclaraciones y huecos que cada
> persona dejó anotados al programar su historia. Sale de las 13 notas `documentation-updates-*.md` que
> quedaron dentro del código, de `docs/seguimiento/` y del cierre del Sprint 3.
>
> **Armado el 09/11/2026** a pedido de Deni, en la rama `docs/actualizacion-docu-pasada`.
>
> **No es fuente de verdad.** Si algo de acá choca con un contrato, manda el contrato. Lo que haya que llevar
> al contrato está marcado en la sección 4.

**De dónde sale cada cosa**

| Nota original | Historia | Capa | Quién decidió |
|---|---|---|---|
| `backend/src/points/documentation-updates-us25.md` | US-25 | Backend | Melisa |
| `backend/src/rewards/documentation-updates-us37.md` | US-37 | Backend | Melisa |
| `backend/src/redemptions/documentation-updates-us43.md` | US-43 | Backend | Melisa |
| `backend/src/redemptions/documentation-updates-us44.md` | US-44 | Backend | Melisa |
| `backend/src/redemptions/documentation-updates-us45.md` | US-45 | Backend | Melisa |
| `frontend/src/features/cashier/documentation-compliance-us21.md` | US-21 | Frontend | Denise |
| `frontend/src/features/cashier/documentation-updates-us24.md` | US-24 | Frontend | Melisa |
| `frontend/src/features/cashier/documentation-updates-us46.md` | US-46 | Frontend | Melisa |
| `frontend/src/features/customers/documentation-updates-cli-adm.md` | CLI-ADM | Frontend | Melisa |
| `frontend/src/features/my-account/documentation-updates-us39.md` | US-39 | Frontend | Deni (con aclaraciones de Tomás) |
| `frontend/src/features/redemptions/documentation-updates-us40.md` | US-40 | Frontend | Deni |
| `frontend/src/features/redemptions/documentation-updates-us42.md` | US-42 | Frontend | Deni |
| `frontend/src/features/redemptions/documentation-updates-us43.md` | US-43 | Frontend | Deni |
| `docs/seguimiento/emp-pass-frontend.md` | EMP-PASS | Frontend | Montse |
| `docs/seguimiento/diferencias-prototipo-frontend.md` | Alineación visual (19/10) | Frontend | Denise |
| `docs/sprint-4/CIERRE_SPRINT_3.md` §3 | S3-01 a S3-42 | Las dos | Varios |

**14/11/2026 (ARRASTRE-S4, A4-09):** las notas del backend de US-25, US-43, US-44 y US-45 se borraron del código (todo su contenido está en este archivo y en `docs/`). Sigue `backend/src/rewards/documentation-updates-us37.md`, porque tiene un dato que no está en ningún otro documento: una recompensa `DISABLED` por stock que además vence no cambia de motivo con el proceso diario (solo toma las `ACTIVE`); pasa a `EXPIRED` la próxima vez que se reevalúa, por ejemplo al editarla. Las del frontend siguen en el código. Ver la [pregunta 1](#preguntas-abiertas).

---

## 1. Sprint 3

Las decisiones S3-01 a S3-42 ya están escritas en `docs/sprint-4/CIERRE_SPRINT_3.md` §3 (puntos y
consumos, Clientes del Administrador, auditoría, perfil y contraseñas, pantallas del mostrador). Acá va lo
que **no** está ahí.

### 1.1 US-25 — Vencimiento automático de puntos (backend)

- Cron `5 0 * * *`, zona `America/Argentina/Cordoba`. Comando a demanda: `npm run points:expire`.
- `POINTS_EXPIRATION_CRON_ENABLED`: prendido por defecto (sin la variable también), `false` en los e2e.
- Una transacción por lote: bloquea `customer_points` (`FOR UPDATE`) y el lote (`FOR UPDATE SKIP LOCKED`).
  Si un lote falla, se deshace solo ese y se reintenta en la próxima corrida.
- El lote vence **entero** (`remaining = 0`); `debt` y `lifetimePoints` no cambian. Movimiento
  `EXPIRATION` a nombre de "Sistema". Auditoría `POINTS_EXPIRED`: "Venció N pts de {cliente}", con
  "Puntos vencidos" (signo "−"), "Fecha del lote" y "Saldo resultante" (guion común en negativos).
- Clientes dados de baja: se excluyen.
- `vencerLotes` lo hizo US-25 y no BASE; para eso extendió `InsertMovementData` y `PointsLot`.
- Los datos del cliente para la auditoría se leen con Prisma desde el repositorio de `points`.

### 1.2 US-21 — Registrar consumo (frontend, Denise)

| Decisión | Contrato / prototipo | Qué se hizo |
|---|---|---|
| "Registrar otro consumo" | Vuelve a la búsqueda (CA-21.10) | Vuelve al formulario del monto **con el mismo cliente** cargado. "Buscar otro cliente" hace la búsqueda desde cero |
| Observaciones | Debajo del monto (CA-21.7) | Dentro de un **modal de confirmación** "Registrar consumo" (vista previa, Observaciones con contador n/255, Cancelar · Aceptar). El prototipo se cambió a mano el 27/10 para que coincida |
| Modal de confirmación | No existe | Existe: "Registrar consumo" abre el modal y recién "Aceptar" registra, para evitar registros por error |
| "Buscar otro cliente" | No existe | Botón arriba de la búsqueda mientras hay un cliente a la vista |
| "Consumo registrado" | Reemplaza la pantalla | Reemplaza solo el formulario, debajo de la tarjeta del cliente |
| Aviso de nivel | El contrato lo lista al final | Recuadro verde arriba de las filas, como el prototipo |
| "Ver detalle" | Va al detalle del consumo | Quedó deshabilitado en US-21 porque no había ruta. **Ya está resuelto:** hoy navega a `/admin/consumos/:code` (US-23) |

### 1.3 US-24 — Ajustar puntos (frontend, Melisa)

- El modal es `features/cashier/components/AdjustPointsModal.tsx`; lo abre la ficha del Administrador
  (encabezado y alerta de saldo negativo). Se podría mover a `features/customers`.
- "Restar" más que el saldo: se siguió el contrato (botón deshabilitado y "No se puede restar más que el
  saldo disponible."), no el prototipo.
- `reason` con `maxLength` 500: el mensaje de más de 500 no aparece nunca.
- "Regularizar a 0": completa Sumar, el valor absoluto del saldo y "Regularización por anulación de
  consumo".
- Toast: "Ajuste aplicado: {±n} pts. Nuevo saldo: {n} pts.".
- Componente nuevo `Textarea`.

### 1.4 US-46 — Buscar cliente del Mostrador (frontend, Melisa)

- P3: se sacó "Editar datos" del Mostrador. P5: la vieja US-47 ("resumen del cliente en 2 segundos") entra como criterio de US-46; el Seguimiento v1.5 la eliminó y corrió la numeración.
- `level.nextMinPoints` en Oro = `null`; `progressPercent` con `Math.round` (S3-03, S3-04).
- `EditCustomerForm`, `CustomerSummary`, `useUpdateCustomer` y su mock quedaron sin uso; se borraron el 09/11 (`fix/cerrar-sprint4`).
- Tokens y recetas nuevos: `--color-negative`, `Badge accent`, `formSectionTitleStyles`, `pointsToneStyles`.

### 1.5 CLI-ADM — Clientes del Administrador (frontend, Melisa)

- **El documento no se edita**, tampoco el Administrador. La pantalla lo muestra bloqueado con "El
  documento no se puede modificar." Es la decisión D-03 del 25/10; el backend lo cumple desde el 09/11 (`UpdateCustomerDto` ya no acepta el documento).
- Se movió el formulario de alta a `CustomerRegistrationForm.tsx` para usarlo en Caja y en Clientes.
- `customer-errors.ts` decide por `code === 'CUSTOMER_INACTIVE'` y no por el texto.
- Paginador "Página X de Y" (20 por página) y búsqueda con debounce de 300 ms (S3-20).
- Menú del Administrador con opciones deshabilitadas "Próx." (S3-21; hoy son 7 opciones, NAV del 25/10).
- Piezas nuevas: `Pagination`, `TableRow highlight`, `SideNav` con opciones deshabilitadas,
  `segmentedTabsStyles`, `ComingSoon` con descripción opcional, `isoToDisplayDateOnly`, `formatMoney`,
  `domain/statuses.ts`.

### 1.6 EMP-PASS — Contraseña y reactivación de usuarios (frontend, Montse)

- La pantalla exige solo lo del backend: 8 a 64 caracteres, 72 bytes, distinta del mail.
- Ayuda compartida de `PasswordField`: "Entre 8 y 64 caracteres. No puede ser igual al mail." (cambia
  también alta de cuenta y alta de empleado).
- `409 EMAIL_IN_USE` al reactivar: "El mail de este usuario ya lo usa otra cuenta activa.".
- **El generador hace contraseñas de 8 caracteres** (D-05, resuelta el 25/10; el contrato S3 §3.11 se corrigió el 09/11).

### 1.7 Alineación visual con el prototipo (19/10, Denise)

- Regla: lo programado manda en lo funcional; el prototipo, en lo visual.
- Se mantuvieron a propósito (D-38): "Niveles" como sección propia de Configuración (hoy está dentro de
  Puntos), sin "Cancelar" en "Registrar cliente" y en "Registrarme".
- `FormSection` con título en mayúsculas y línea debajo en todos los formularios.
- Color del panel de marca: se usó `accent-600` en lugar del `#b8653d` del prototipo.

---

## 2. Sprint 4

### 2.1 US-37 — Deshabilitar y habilitar automáticamente (backend, Melisa)

- `RewardsAvailabilityService.reevaluarDisponibilidad(reward, hoyArgentina)` corre en la transacción de
  quien llama, guarda, audita y devuelve `"ENABLED" | "DISABLED" | null` (el `availabilityChange` de
  `PATCH /recompensas/:id`). Quien llama tiene que haber bloqueado la recompensa.
- **Si fallan dos condiciones, el motivo es "Vencida"** (la primera que falla). Si una `DISABLED` cambia de
  motivo, se actualiza y se audita `REWARD_DISABLED` con el nuevo.
- `motivoNoDisponible(reward, hoy)` para US-36 (activar una no disponible).
- Proceso diario: 00:05 y al iniciar; solo toma `ACTIVE` con `expires_at < hoy` (las que vencen hoy siguen
  hasta las 23:59); `FOR UPDATE SKIP LOCKED`, una transacción por recompensa; no toca los canjes
  Confirmados (CA-37.6). Si falla al iniciar, el servidor arranca igual.
- El comando a demanda también corre el proceso de inicio (dos corridas, idempotente).
- Variable `REWARDS_EXPIRATION_CRON_ENABLED`. **No se agregaron** el script `rewards:expire`, la variable
  en `.env.example` ni el apagado en `test/setup-e2e-env.ts` (decisión de no tocar configuración
  compartida).

### 2.2 US-43 — Rechazar y cancelar (backend, Melisa)

- Rechazar: motivo recortado de 5 a 500 ("El motivo es obligatorio.", "Indicá un motivo de al menos 5
  caracteres.", "El motivo no puede superar los 500 caracteres."). Orden: normalizar → vencer al leer
  (fuera de la transacción) → bloquear → validar estado. Un canje que **ya estaba** `EXPIRED` da
  `REDEMPTION_NOT_CONFIRMED` ("Vencido").
- Cancelar: `404` "No existe el canje." si es ajeno o no existe, sin vencer nada. No se audita;
  `resolvedBy` queda en `null`.
- **Eventos nuevos** en `shared/events/domain-events.ts`: `reward.deactivated` y `reward.deleted`
  (`{ rewardId }`), y `RedemptionsRejectedResult` (`{ rejectedRedemptions }`), que devuelven los listeners
  de `redemptions` para los tres eventos (incluido `customer.deactivated`). Se publican con `emitAsync`
  dentro de la transacción.
- `rechazarConfirmados(filtro, motivo)`: solo los Confirmados **vigentes**; los vencidos que el barrido
  no marcó se **vencen**, no se rechazan.
- **Dos vistas del canje** (`redemption-response.dto.ts`): la de empleado (con `customer`, `origin`,
  `confirmedBy`, `resolvedBy`, saldos; sin `canCancel`) y la del Cliente (sin datos de empleados, con
  `canCancel`).
- Baja de cliente: `deactivate` devuelve `{ lostBalance, rejectedRedemptions }`; la auditoría suma "Canjes
  rechazados: {n}" después de "Saldo perdido", solo si n > 0.
- `redemptions` importa `EmployeesModule` para el nombre del empleado (como `consumptions`).

### 2.3 US-44 — Vencimiento del canje (backend, Melisa)

- "Vencer al leer" (`vencerVencidos(filtro)`) **antes** de abrir la transacción del caso de uso, nunca
  adentro (si no, el rollback se lleva el vencimiento). Filtros: `{ code }`, `{ customerId }`,
  `{ all: true }`.
- Barrido cada 5 minutos y al iniciar; `resolved_at = expires_at` (no la hora del barrido); auditoría
  `REDEMPTION_EXPIRED` como Sistema. No toca saldo, stock ni `used_count`.
- Variable `REDEMPTIONS_EXPIRATION_CRON_ENABLED`. Igual que US-37: no se agregaron el script, la variable
  en `.env.example` ni el apagado en los e2e.

### 2.4 US-45 — Consultar canjes (backend, Melisa)

- `GET /customers/:id/canjes` con un cliente inexistente: `404` "No existe el cliente." (sin `code`). Con
  un cliente dado de baja: `[]`.
- `GET /canjes`: `page` 1 y `limit` 20 por defecto, máximo 100 (también en Mis canjes).
- Mensajes de los query params: los de Movimientos y Consumos para fechas ("fromDate no es una fecha válida
  (YYYY-MM-DD)", "fromDate no puede ser posterior a toDate") y el estilo de `ListAuditQueryDto` para el
  resto ("status no es un estado válido", "order debe ser desc o asc", etc.).
- `code` parcial: mayúsculas, sin espacios ni guiones, "contiene"; no valida el alfabeto.
- `documentNumber` que queda vacío al normalizar: se ignora el filtro.
- `rewardName` se compara con `translate()` (sin tildes ni mayúsculas), sobre el snapshot del canje.

### 2.5 US-39 — Catálogo (frontend, Deni)

- ~~La pestaña Canjes abre en "Catálogo"; `?vista=mis` abre "Mis canjes".~~ Cambió el 12/11/2026, a pedido
  de Denise: la pestaña Canjes abre en "Mis canjes" (a la izquierda) y "Catálogo" va a la derecha; el
  Catálogo se abre con `?vista=catalogo`.
- Inicio del Cliente, a pedido de Denise (12/11/2026): la tarjeta "Recompensas" se reemplazó por las primeras
  5 recompensas del catálogo (con "Canjear") y, al final, el botón "Ver catálogo completo", que abre Canjes en
  Catálogo. El botón se ve siempre; sin recompensas dice "No hay recompensas disponibles por ahora.". **Hay
  que llevarlo al contrato S4 §3.5 y a CA-39.6.**
- Historial del Cliente, a pedido de Denise (12/11/2026): un solo título "Historial" y un selector
  "Consumos / Puntos" que muestra una lista por vez, en vez de las dos una debajo de la otra. Abre en
  Consumos y no recuerda la opción. Los subtítulos "Historial de consumos" y "Historial de puntos" quedan
  ocultos (solo para lectores de pantalla). **Hay que llevarlo al contrato S3 §3.10.2.**
- "Te faltan {n} pts" solo cuando lo único que falta es saldo.
- El aviso de saldo negativo va solo en el Catálogo (el prototipo lo pone arriba de las dos vistas).
- El tooltip del botón deshabilitado va en un `span` (los navegadores no muestran el `title` de un botón
  deshabilitado).
- Tarjeta de Inicio "Tenés un canje para usar": el Confirmado más reciente (`order=desc`, aclaración de
  Tomás). Si la consulta falla, la tarjeta no aparece.
- `CatalogReward` no trae `updatedAt` (aclaración de Tomás, como el ejemplo de §3.5.1).
- Se borró `RewardsComingSoonCard` (US-19).

### 2.6 US-40 — Confirmar canje (frontend, Deni)

- `Reward` y la etiqueta de vencimiento viven en `features/rewards`.
- Errores de Caja sin texto propio (`CUSTOMER_INACTIVE`, `404`): se muestra el `message` del backend.
- La cuenta regresiva en 0 dice "El canje venció".
- En Caja, Confirmar queda deshabilitado con el mensaje de saldo (el prototipo lo muestra al apretar).
- `ConfirmedRedemption` usa solo los campos que ven las dos rutas.
- Colores de la etiqueta: Contorno = borde de acento; Neutro = `Badge neutral`; Destacado = `Badge accent`.
- Imagen genérica: ícono de regalo sobre degradado.
- "Sí, aplicar" abre "Registrar uso".

### 2.7 US-42 — Registrar uso (frontend, Deni)

- Con un error, desaparece Confirmar; con `REDEMPTION_EXPIRED` y `REDEMPTION_NOT_CONFIRMED` queda solo
  "Cancelar" (el contrato dice "sin botones").
- Se agregó la fila "Cliente" del prototipo; no el aviso al apretar "Listo".
- El panel de Caja vuelve a pedir la lista cuando un canje llega a 0.
- `redemptionCode` se agregó a `PointsMovement`, pero ninguna pantalla lo muestra todavía.
- "Canjeaste {recompensa}" en el historial del Cliente: no se hizo (no lo pedía ningún criterio de US-42).
- `RegisterUseModal` avisa con `onUsed` y la pantalla vuelve a pedir el saldo en silencio, para que no se
  cierre la ventana.

### 2.8 US-43 — Rechazar y cancelar (frontend, Deni)

- Con un error final queda solo "Volver".
- Los errores al cancelar se muestran **dentro del diálogo**, no en el toast (el toast es solo de éxito).
- El textarea del motivo **no** tiene `maxLength`: se valida y se muestra el mensaje de más de 500.
- El chip de motivo rápido queda marcado; editar el texto no lo desmarca.
- Encabezado "Cliente: … · Recompensa: …" y placeholder del prototipo.
- Rechazar y cancelar no vuelven a pedir saldo ni movimientos (no cambian).

---

## 3. Textos que no están en el contrato ni en el prototipo

| Texto | Dónde | Historia |
|---|---|---|
| "Cargando…" | Varias pantallas | US-21, US-24, US-46, CLI-ADM |
| "Ingresá un monto válido menor a 9999999999." | Monto mayor al máximo | US-21 |
| "No se pudo buscar el cliente." | Búsqueda y, reutilizado, errores de la vista previa y del registro | US-21, US-46 |
| "Registrar consumo" (título del modal), "Aceptar", "Buscar otro cliente" | Registrar consumo | US-21 |
| "El máximo es 1.000.000 puntos.", "No se pudo aplicar el ajuste.", "Aplicando…" | Ajustar puntos | US-24 |
| "No se pudieron cargar los movimientos." | Panel del Mostrador | US-46 |
| "No se pudo cargar el listado de clientes.", "No se pudo cargar el cliente.", "No se pudieron cargar los consumos.", "No se pudo guardar el cliente.", "No se pudo eliminar el cliente.", "Guardando…", "Eliminando…", "Página X de Y", "Anterior", "Siguiente" | Clientes | CLI-ADM |
| "Entre 8 y 64 caracteres. No puede ser igual al mail." | Contraseñas de empleados | EMP-PASS |
| "El canje venció" | Cuenta regresiva en 0 | US-40 |

## 4. Huecos de los contratos (para que el equipo los lleve al contrato)

| Contrato | Hueco | Qué se hizo |
|---|---|---|
| S3 §3.1.3 | Mensaje del monto máximo | "Ingresá un monto válido menor a 9999999999." |
| S3 §3.5.1 | Mensaje del máximo de puntos | "El máximo es 1.000.000 puntos." |
| S3 §3.1.4 | Panel de canjes fijo "No tiene puntos suficientes…" | Resuelto en el Sprint 4 (D-16) |
| S4 §3.5.1 | `updatedAt` en el catálogo | Se omite |
| S4 §3.5.1 | "Te faltan" con Deshabilitadas o saldo negativo | Solo si lo único que falta es saldo |
| S4 §3.5.1 | Orden de "Tenés un canje para usar" | `order=desc` |
| S4 §3.7.2 | Texto con la cuenta regresiva en 0 | "El canje venció" |
| S4 §3.7.2, §3.9.2, §3.10.2 | Qué mostrar con `CUSTOMER_INACTIVE`, `404` y errores finales | El `message` del backend |
| S4 §3.7.1 | Campos de `{ redemption }` en la ruta del Cliente | Los que ven las dos rutas |
| S4 §3.1 | Colores de la etiqueta de vencimiento | Ver 2.6 |
| S4 §3.3 | Archivo de la imagen genérica | Ícono de regalo sobre degradado |
| S4 §3.10.2 | `maxLength` del motivo, chips, encabezado, placeholder | Ver 2.8 |
| S4 §3.10.3 | Dónde se muestran los errores al cancelar | Dentro del diálogo |
| S4 §3.12 | `page`/`limit`, mensajes de query params, `404` de `GET /customers/:id/canjes` | Ver 2.4 |
| S4 §3.4 | Motivo cuando fallan dos condiciones; `updatedAt` al deshabilitar solo | "Vencida"; sube en el listado |
| S4 §8.4 | `confirmedCount`: puerto o subconsulta ("elegir uno y documentarlo") | Se lee la tabla `redemptions` desde el repositorio de `rewards` (US-34) |

## 5. Diferencias entre contrato, prototipo, Jira y código (no resueltas)

- **PD-4 y PD-5:** resueltas en los documentos del producto: la Definición del Producto v1.4 (09/11) pasa
  `confirmarCanje()` a US-40 y el Seguimiento v1.7 corrige los textos de US-43 y US-44 (sin reintegro).
- **Comentario viejo:** `frontend/src/features/employees/schemas/employee.schema.ts:63` todavía dice que el generador
  hace 12 caracteres (el código hace 8).
- **D-02, D-03 y CLI-DOC:** resueltas en el backend el 09/11 (`fix/cerrar-sprint4`).
- **Prototipo:** el archivo único no coincide con `v2/`; falta el script de desempaquetado (D-37).
- **Modales:** `Modal` no se cierra con Escape; cada uno suma su listener.

---

## Preguntas abiertas

Son de producto o de contrato, o las dejó anotadas alguien para que decida el equipo. **No las resolví.**

| # | Pregunta | De dónde sale |
|---|---|---|
| D-06 | Anular un consumo con el lote ya vencido: hoy el cliente pierde los puntos dos veces | Cierre S3 |
| D-07 | Consumo de 0 puntos: ¿se registra el movimiento por 0? | Cierre S3 |
| D-08 | Auditoría del cambio de contraseña propio de un empleado | Cierre S3 |
| D-09 | Dos textos distintos para `409 EMAIL_IN_USE` | Cierre S3 |
| D-10 | `409` sin `code` cuando el Administrador cambia el email de un cliente a uno en uso | Cierre S3 |
| D-11 | Mensajes en inglés del Sprint 2 | Cierre S3 |
| D-12 | Borrar `customer.reactivated` y `ACTIVATED` | Cierre S3 |
| D-13 | Orden por apellido con tildes | Cierre S3 |
| D-15 | Límite de intentos en memoria | Cierre S3 |
| D-17 | ✅ Decidida (S5-30): se saca Vitest del Seguimiento y se hace el CI con GitHub Actions | Cierre S3 |
| D-18 | `GET /customers/:id/status-history` sin pantalla | Cierre S3 |
| D-19 | Límite de intentos de login, limpieza de sesiones, `npm audit`, verificación de email | Cierre S3 |
| D-35 | Cuándo pasa `develop` a `main` | Cierre S3 |
| D-37 | Reexportar el prototipo y subir el script | Cierre S3 |
| D-38 | Diferencias del prototipo que el frontend mantuvo a propósito | Cierre S3 |
| PD-3 | ✅ Decidida (S5-13): `GET /movimientos-de-puntos` se elimina en el Sprint 5 | Contrato S4 |
| PD-6 | ✅ Decidida (S5-14): no hay aviso de canje rechazado; el Cliente lo ve en Mis canjes | Contrato S4 |
| US-21 | ¿Se llevan al contrato el modal de confirmación, "Buscar otro cliente" y "Registrar otro consumo" con el mismo cliente? | US-21 front |
| US-24 | ¿Se mueve `AdjustPointsModal` a `features/customers`? | US-24 front |
| A-07 | ¿Sigue haciendo falta la ficha del cliente para el Cajero? | Cierre S3 |
