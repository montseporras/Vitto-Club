# Cierre del Sprint 4 · Vitto Club

> **Para qué es este archivo.** Describe cómo quedó `develop` al cerrar el Sprint 4, qué no cumple el contrato
> del Sprint 4, qué decisiones se tomaron al programar (y no están en el contrato) y qué pasa al Sprint 5. El
> ítem **ARRASTRE-S4** de `HISTORIAS_SPRINT_5.md` se reparte con este archivo.
>
> **Armado el 09/11/2026** a pedido de Deni, contra `develop` = `origin/develop` = `f4c1171`. Mismo formato que
> `docs/sprint-4/CIERRE_SPRINT_3.md`.
>
> **Decisión de la PO (S5-6, 09/11):** todo lo que no quedó hecho pasa al Sprint 5.

## 1. Estado de `develop` al 09/11/2026

`develop` = `f4c1171` (merge de `fix/cerrar-sprint4`: US-41, CLI-DOC, D-02, D-03 y NAV).

### 1.1 Verificación ejecutada

| Comando | Resultado |
|---|---|
| `backend/ npm run lint` (oxlint) | Sin errores |
| `backend/ npm run build` | Compila |
| `backend/ npm test` | **111 suites, 1543 tests: pasan todos** |
| `backend/ npx tsc --noEmit` | 3 errores, los mismos del Sprint 3 (tipos de `supertest` en `test/audit-query.e2e-spec.ts` y `test/loyalty.e2e-spec.ts`). No afectan el build |
| `backend/ npm run test:e2e` | **No se corrió** en esta revisión (necesita Docker y la base de tests). Hay que correrlo antes de cerrar |
| `frontend/ npm run lint` | Sin errores |
| `frontend/ npm run build` | Compila (aviso de Vite: un bloque de más de 500 kB; no es error) |

### 1.2 Historias del Sprint 4: dónde está cada una

| Ítem | Backend | Frontend |
|---|---|---|
| BASE-4 | ✅ `develop` (Deni, revisó Maga). Con el arreglo `fix/BASE-4-descripcion-canje-back` | — |
| US-34 Crear recompensa | ✅ `develop` | ✅ `develop` (`feature/US-34-38-recompensas-admin-front`). Foto en "Próximamente" (Sprint 5) |
| US-35 Editar recompensa | ✅ `develop` | ✅ `develop` |
| US-36 Activar / desactivar | ✅ `develop` | ✅ `develop` |
| US-37 Deshabilitar / habilitar automáticamente | ✅ `develop` (Melisa) | — |
| US-38 Eliminar recompensa | ✅ `develop` | ✅ `develop` |
| US-39 Catálogo | ✅ `develop` | ✅ `develop` (Deni) |
| US-40 Confirmar canje | ✅ `develop` (con el arreglo `fix/US-40-disponibles-sin-confirmedcount-back`). **Falta el bloqueo de la recompensa** (§2, B1) | ✅ `develop` (Deni) |
| US-41 Canjes por código | ✅ `develop` (`fix/cerrar-sprint4`, 09/11) | ✅ `develop` (`fix/cerrar-sprint4`) |
| US-42 Registrar uso | ✅ `develop` | ✅ `develop` (Deni) |
| US-43 Rechazar / cancelar | ✅ `develop` (Melisa) | ✅ `develop` (Deni) |
| US-44 Vencer canje | ✅ `develop` (Melisa) | — |
| US-45 Consultar canjes | ✅ `develop` (Melisa) | ✅ `develop` |
| CLI-DOC Filtro por documento | ✅ `develop` (09/11) | ✅ `develop` |
| NAV Ajustes de navegación | — | ✅ `develop` (menú "Recompensas", pantalla vieja de Movimientos borrada, 09/11) |
| D-02 / D-03 (del cierre del S3) | ✅ `develop` (09/11): edición y baja solo del Administrador; el documento ya no viaja en el DTO | ✅ |

> **La tabla de asignaciones de `HISTORIAS_SPRINT_4.md` (§0) está desactualizada:** casi todo dice "Sin
> empezar" y está todo mergeado. Hay que completarla con esta tabla (A-10).

### 1.3 Ramas con trabajo fuera de `develop`

| Rama | Commits fuera de `develop` | Qué tienen |
|---|---|---|
| `origin/feature/US-34-crear-recompensa-back`, `US-35-…`, `US-36-…`, `US-38-…` | 1 cada una | Solo un commit de merge sin cambios: el contenido ya está en `develop`. **Se pueden borrar** |
| `origin/main` | — | `main` no recibe `develop` desde el 21/09 (D-35) |

---

## 2. Verificación de `develop` contra el contrato del Sprint 4

Solo lo que **no** cumple. Se revisaron rutas y roles de todos los controllers, el modelo de datos, los
procesos automáticos y los e2e de cada historia; no se repasó campo por campo cada respuesta ni cada texto
de pantalla (eso lo cubren los e2e y el recorrido manual de cada historia).

### Backend

| # | Qué pide el contrato | Qué hay en `develop` | Dónde |
|---|---|---|---|
| B1 ✘ | US-40: bloquear la recompensa al confirmar (anotado por US-35, ítem 7 de las verificaciones) | `RedemptionConfirmationService` la lee con `findById`, **sin `FOR UPDATE`**: un canje se puede colar mientras se baja el stock | `backend/src/redemptions/application/redemption-confirmation.service.ts:46` |
| B2 ✘ | Test: usar un canje rechazado por la desactivación → `409` 'El canje ya está en estado "Rechazado".' | No existe (solo se prueba el caso "Utilizado") | `backend/test/redemptions-use.e2e-spec.ts` |
| B3 ✘ | Scripts `rewards:expire` y `redemptions:expire`; `REWARDS_…` y `REDEMPTIONS_EXPIRATION_CRON_ENABLED` en `.env.example`; apagados en `test/setup-e2e-env.ts` | No se agregaron (US-37 y US-44 no tocaron configuración compartida). Solo los apagan sus propios e2e: en las demás suites los procesos corren al iniciar la app | `backend/package.json`, `backend/.env.example`, `backend/test/setup-e2e-env.ts` |
| B4 ⚠️ | — | Tras D-03 quedaron sin uso el evento `customer.document-changed` (y su listener en `accounts`) y `forbiddenField` | `backend/src/accounts/`, `backend/src/customers/domain/errors/forbidden-field.error.ts` |
| B5 ⚠️ | Contrato S4 §10, PD-3 | `GET /movimientos-de-puntos` sigue existiendo y ya no tiene pantalla (el frontend la borró) | `backend/src/points/http/points-movements.controller.ts` |

### Frontend

| # | Qué pide el contrato | Qué hay en `develop` | Dónde |
|---|---|---|---|
| F1 ⚠️ | Modales que se cierran con Escape (`frontend/CLAUDE.md` §4.10) | `Modal` no lo hace: cada modal agrega su listener (`useEscapeKey`) | `frontend/src/shared/components/ui/Modal.tsx` |
| F2 ⚠️ | — | Comentario viejo: dice que el generador hace 12 caracteres (hace 8, D-05) | `frontend/src/features/employees/schemas/employee.schema.ts:63` |

### Arrastre del Sprint 3 que sigue abierto

| # | Qué falta | Dónde |
|---|---|---|
| A-02 | Trigger de solo inserción de `points_movements` | Migración nueva |
| A-03 | `CHECK` de la §3.12 del contrato S3 | Migración nueva |
| A-07 | Ficha del cliente para el **Cajero** (US-19): no hay ruta en `/caja` | `frontend/src/app/router/paths.ts` |
| A-09 / B5 | `employees.phone` sigue guardando `''` | `backend/src/employees/infrastructure/employees.repository.ts:7` |
| A-13 | 13 notas `documentation-updates-*.md` dentro del código (su contenido ya está en `docs/seguimiento/decisiones-de-implementacion.md`) | `backend/src/*/`, `frontend/src/features/*/` |
| B7 | CORS fijo en `http://localhost:5173` | `backend/src/main.ts:19` |
| — | e2e saltado: "volver a registrarse con el mismo email" (lo que lo bloqueaba ya se resolvió) | `backend/test/customer-registration.e2e-spec.ts:235` |

### Contra los documentos del producto (Plan de Proyecto, Seguimiento y Definición del Producto)

| # | Qué piden | Qué hay | Pasa al Sprint 5 como |
|---|---|---|---|
| P1 | RF-029: beneficios de los niveles | No existen (el contrato S3 los dejó "pendientes") | NIV-BEN (S5-2) |
| P2 | RF-08: ver la cuenta de un usuario "cualquiera sea su rol" | Solo cuentas de empleados | CTA-CLI (S5-3) |
| P3 | Foto de perfil del Cliente (decisión #9 del S3, PD-2 del S4) | No existe; no tiene RF ni US | FOTO-PERFIL (S5-1) |
| P4 | RF-038: imagen de la recompensa | "Próximamente" | US-34 (Story Map del Sprint 5) |
| P5 | Seguimiento §2.6: GitHub Actions, Vitest + Testing Library, despliegue en Vercel / Render / Neon | No están en el repo | ARRASTRE-S4 (PD-23) |

---

## 3. Decisiones tomadas durante el Sprint 4 (pasan a ser contrato)

Se tomaron al programar y quedaron en notas dentro del código. El detalle completo está en
`docs/seguimiento/decisiones-de-implementacion.md` §2. **Al aprobar este cierre quedan como contrato**; si el
equipo no está de acuerdo con alguna, se marca y se pide el cambio de código.

### 3.1 Backend

| # | Tema | Decisión | Quién / dónde |
|---|---|---|---|
| S4-21 ✅ | Dos condiciones de no disponible a la vez | El motivo es "Vencida" (la primera que falla). Si una Deshabilitada cambia de motivo, se audita `REWARD_DISABLED` con el nuevo | Melisa, US-37 |
| S4-22 ✅ | `reevaluarDisponibilidad(reward, hoyArgentina)` | Corre en la transacción de quien llama, guarda, audita y devuelve `"ENABLED" \| "DISABLED" \| null` (el `availabilityChange`) | Melisa, US-37 |
| S4-23 ✅ | Proceso diario de recompensas | 00:05 y al iniciar; solo toma `ACTIVE` con fecha anterior a hoy; `SKIP LOCKED`, una transacción por recompensa; el comando a demanda corre dos veces (idempotente) | Melisa, US-37 |
| S4-24 ✅ | `updatedAt` al deshabilitar solo | Cambia y la recompensa sube en el listado del Administrador | Melisa, US-37 |
| S4-25 ✅ | Eventos `reward.deactivated` y `reward.deleted` | `{ rewardId }`; listeners de `redemptions` que devuelven `{ rejectedRedemptions }` (también para `customer.deactivated`), con `emitAsync` dentro de la transacción | Melisa, US-43 |
| S4-26 ✅ | `rechazarConfirmados(filtro, motivo)` | Solo Confirmados **vigentes**; los vencidos sin marcar se **vencen**, no se rechazan. Motivos "Recompensa desactivada", "Recompensa eliminada", "Cliente dado de baja" | Melisa, US-43 |
| S4-27 ✅ | Dos vistas del canje | Empleado (con cliente, origen, quién confirmó y resolvió, saldos; sin `canCancel`) y Cliente (sin datos de empleados; con `canCancel`) | Melisa, US-43 |
| S4-28 ✅ | Baja de cliente | `deactivate` devuelve `{ lostBalance, rejectedRedemptions }`; la auditoría suma "Canjes rechazados: {n}" después de "Saldo perdido", solo si n > 0 | Melisa, US-43 |
| S4-29 ✅ | `redemptions → employees` | Para el nombre del empleado del token, como `consumptions` | Melisa, US-43 |
| S4-30 ✅ | "Vencer al leer" | Antes de abrir la transacción del caso de uso, nunca adentro; `resolved_at = expires_at` | Melisa, US-44 |
| S4-31 ✅ | `GET /customers/:id/canjes` | Cliente inexistente: `404` "No existe el cliente."; dado de baja: `[]` | Melisa, US-45 |
| S4-32 ✅ | Paginado y validación de `GET /canjes` y Mis canjes | `page` 1, `limit` 20, máximo 100; mensajes de fechas de Movimientos y Consumos y el estilo de `ListAuditQueryDto` para el resto | Melisa, US-45 |
| S4-33 ✅ | Filtros parciales | `code`: mayúsculas, sin espacios ni guiones, "contiene", sin validar el alfabeto. `documentNumber` vacío al normalizar: se ignora. `rewardName` con `translate()` sobre el snapshot | Melisa, US-45 |
| S4-34 ✅ | `confirmedCount` (S4 §8.4: "elegir uno y documentarlo") | Se lee la tabla `redemptions` desde el repositorio de `rewards`, sin importar el módulo | US-34 |
| S4-35 ✅ | Disponibles en el mostrador | `GET /recompensas/disponibles` sin `confirmedCount` | `fix/US-40-disponibles-sin-confirmedcount-back` |
| S4-36 ✅ | Descripción del movimiento `REDEMPTION` | "Canje: {recompensa}" con el nombre guardado en el canje | `fix/BASE-4-descripcion-canje-back` |
| S4-37 ✅ | `q` junto con `documentNumber` en `GET /customers` | `400` "No se puede buscar por q y por documento a la vez." | CLI-DOC, 09/11 |

### 3.2 Frontend

| # | Tema | Decisión | Quién / dónde |
|---|---|---|---|
| S4-38 ✅ | Pestaña Canjes del Cliente | Abre en "Catálogo"; `?vista=mis` abre "Mis canjes" | Deni, US-39 |
| S4-39 ✅ | "Te faltan {n} pts" | Solo cuando lo único que falta es saldo | Deni, US-39 |
| S4-40 ✅ | Aviso de saldo negativo | Solo en el Catálogo | Deni, US-39 |
| S4-41 ✅ | "Tenés un canje para usar" | El Confirmado más reciente (`order=desc`); si falla, no aparece | Deni con Tomás, US-39 |
| S4-42 ✅ | `CatalogReward` | Sin `updatedAt` | Deni con Tomás, US-39 |
| S4-43 ✅ | Errores sin texto en el contrato | Se muestra el `message` del backend | Deni, US-40, US-42, US-43 |
| S4-44 ✅ | Cuenta regresiva en 0 | "El canje venció" | Deni, US-40 |
| S4-45 ✅ | Colores de la etiqueta de vencimiento | Contorno = borde de acento; Neutro = `Badge neutral`; Destacado = `Badge accent` | Deni, US-40 |
| S4-46 ✅ | Imagen genérica | Ícono de regalo sobre degradado | Deni, US-40 |
| S4-47 ✅ | Errores finales (vencido, ya resuelto, inexistente) | Desaparece el botón que reintenta; queda "Cancelar" o "Volver" | Deni, US-42, US-43 |
| S4-48 ✅ | Panel de Caja | Al llegar a 0 una cuenta regresiva, vuelve a pedir la lista | Deni, US-42 |
| S4-49 ✅ | Errores al cancelar (Cliente) | Dentro del diálogo, no en el toast (el toast es solo de éxito) | Deni, US-43 |
| S4-50 ✅ | Motivo del rechazo | Sin `maxLength`: se valida y se muestra el mensaje de más de 500. El chip queda marcado | Deni, US-43 |
| S4-51 ✅ | Después de rechazar o cancelar | Solo se vuelven a pedir los canjes (saldo y movimientos no cambian) | Deni, US-43 |

---

## 4. Pendientes del cierre

### 4.A Para cerrar el Sprint 4 (arrastre, pasa al Sprint 5)

| # | Pendiente | Dónde surgió | Qué hay que hacer |
|---|---|---|---|
| A4-01 | Bloquear la recompensa al confirmar | §2 B1 | `lockNotDeletedForUpdate` en `RedemptionConfirmationService` y un e2e de concurrencia |
| A4-02 | Test de usar un canje rechazado | §2 B2 | Agregarlo a `redemptions-use.e2e-spec.ts` |
| A4-03 | Scripts y variables de los crons | §2 B3 | `package.json`, `.env.example`, `setup-e2e-env.ts` (configuración compartida: pedir permiso) |
| A4-04 | Correr `npm run test:e2e` completo | §1.1 | Con la base de tests levantada |
| A4-05 | Trigger y `CHECK` del Sprint 3 | A-02, A-03 | Migración nueva, antes de BASE-5 |
| A4-06 | `employees.phone` en `NULL` | A-09 | Repositorio y migración de datos |
| A4-07 | CORS por variable | B7 | `main.ts` y `.env.example` |
| A4-08 | e2e saltado del autorregistro | §2 | Sacar el `it.skip` y confirmar que pasa |
| A4-09 | Notas dentro del código | A-13 | Borrarlas (ya están en `docs/seguimiento/`) |
| A4-10 | Tablas de asignaciones de las historias del S3 y el S4 | §1.2 | Completarlas |
| A4-11 | Ramas sin cambios | §1.3 | Borrar `origin/feature/US-34-…`, `US-35-…`, `US-36-…`, `US-38-…` |
| A4-12 | Evento `customer.document-changed` y `forbiddenField` sin uso | §2 B4 | Borrarlos o dejarlos documentados |
| A4-13 | `Modal` con Escape | §2 F1 | En `shared/components/ui/Modal.tsx` (pieza compartida: pedir permiso) |
| A4-14 | Comentario del generador | §2 F2 | Corregir "12" por "8" |

### 4.B Decisiones de producto o de contrato que siguen abiertas

| # | Pendiente | Opciones |
|---|---|---|
| D-06 | Anular un consumo con el lote ya vencido: el cliente pierde los puntos dos veces | (a) descontar solo lo que no venció; (b) no permitir anular; (c) dejarlo y documentarlo |
| D-07 | Consumo que da 0 puntos | (a) no registrar el movimiento; (b) rechazar el consumo; (c) permitir el 0 |
| D-08 | Auditoría del cambio de contraseña propio de un empleado | Sacarla del contrato o asignarla |
| D-09 | Dos textos de `409 EMAIL_IN_USE` | Uno solo o uno por pantalla |
| D-10 | `409` sin `code` al cambiar el email de un cliente a uno en uso | Agregar `code: EMAIL_IN_USE` |
| D-11 | Mensajes en inglés del Sprint 2 | Pasarlos a castellano |
| D-12 | `customer.reactivated` y `ACTIVATED` sin uso | Borrar el evento |
| D-13 | Orden por apellido con tildes | Dejarlo o usar collation |
| D-15 | Límite de intentos en memoria | Dejarlo (una instancia) o pasarlo a una tabla |
| D-17 / PD-23 | Tests del frontend y CI | Decidir si entran en el Sprint 5 |
| D-18 | `GET /customers/:id/status-history` sin pantalla | Mantener o quitar |
| D-19 | Límite de intentos de login, limpieza de sesiones, `npm audit`, verificación de email | Priorizar o documentar como limitación |
| D-35 | `main` no recibe `develop` | Pasarlo al cierre del Sprint 5 (entrega final) |
| D-37 | Prototipo: archivo único distinto de `v2/`, falta el script | Reexportar con el prompt del Sprint 5 |
| D-38 | Diferencias del prototipo que el frontend mantuvo a propósito | Confirmar o corregir el prototipo |
| PD-3 | `GET /movimientos-de-puntos` sin pantalla | Ver contrato S5 §10 |
| PD-6 | Aviso de canje rechazado | Ver contrato S5 §10 |

Ya resueltas desde el cierre del Sprint 3: D-01 (US-59 / RF-065), D-02, D-03, D-04, D-05 (8 caracteres), D-14,
D-16 y D-36; PD-4 y PD-5 (en la Definición del Producto v1.4 y el Seguimiento v1.7).

### 4.C Documentos del producto (fuera del repo)

| # | Qué cambiar | Dónde |
|---|---|---|
| DOC-1 | Sumar la foto de perfil a RF-065 / US-59 (S5-1) | Plan de Proyecto, Seguimiento, Definición del Producto |
| DOC-2 | Marcar US-08 (RF-08) y US-27 (RF-029) como completas en parte y sumar CTA-CLI y NIV-BEN al Sprint 5 | Seguimiento |
| DOC-3 | Máquina "Misión mensual": Completada también es final (sin recompensa) y el reclamo automático de fin de mes (S5-4, S5-5) | Definición del Producto §9 |
| DOC-4 | Máquina "Recompensa": el encabezado dice tres estados finales; el cuadro (y el código) tienen uno, "Dada de baja" | Definición del Producto §9 |
| DOC-5 | Títulos viejos de US-37, US-40 y US-41 ("Marcar como agotada", "Solicitar canje", "Confirmar canje") | Definición del Producto §7.6; Sprint Backlog del Sprint 4 del Seguimiento |
| DOC-6 | US-59: SCRUM-188 en el Product Backlog y SCRUM-175 en el Sprint Backlog del Sprint 3 | Seguimiento |
| DOC-7 | Sprint 3: la tabla suma 107 h y el resultado dice "se estimaron 90 h" | Seguimiento |
| DOC-8 | DER: estados como tablas (el código usa enums); faltan `silver_min_points`, `gold_min_points` y `must_change_password` | Definición del Producto §8 |
| DOC-9 | Framework de pruebas: el Seguimiento lista Vitest y la Definición del Producto no | Seguimiento §2.6 o Definición del Producto §10.1 |
