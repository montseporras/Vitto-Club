# Cierre del Sprint 3 · Vitto Club

> **De dónde sale.** Son las secciones 1 a 3 y 12 (bloques A y B) del borrador v0 de
> `API_CONTRACT_SPRINT_4.md` (25/10/2026). Se separaron porque **no son contrato del Sprint 4**: describen cómo
> quedó `develop`, qué no cumple el contrato del Sprint 3 y qué falta para cerrarlo. El ítem **ARRASTRE-S3**
> de `HISTORIAS_SPRINT_4.md` se reparte con este archivo.
>
> **Ya resuelto el 25/10/2026** (decisiones de la PO): D-01 (US-60 / RF-065), D-02 (el Cajero no
> edita ni da de baja clientes), D-03 (nadie edita el documento), D-04 (los `403` no se auditan), D-05
> (generador de 8 caracteres) y D-36 ("Movimiento de puntos"). **D-16** se resuelve con US-40 y US-42 del
> Sprint 4. **D-06** sigue como propuesta. Al tomar cada fila, anotá la decisión al lado.
>
> Los números de sección internos (§1.3, §2 B1, §12…) son los del borrador original.

## 1. Estado de `develop` al 25/10/2026

`develop` = `origin/develop` = commit `2624dd9` (merge del PR #28, US-23 backend, 24/10/2026).

### 1.1 Verificación ejecutada

| Comando | Resultado |
|---|---|
| `backend/ npm run lint` (oxlint) | Sin errores |
| `backend/ npm run build` | Compila |
| `backend/ npm test` | **83 suites, 1110 tests: pasan todos** |
| `backend/ npx tsc --noEmit` | 3 errores, todos en tests e2e ya conocidos: `test/audit-query.e2e-spec.ts:521` y `test/loyalty.e2e-spec.ts:244` y `:260` (tipos de `supertest`). No afectan el build |
| `backend/ npm run test:e2e` | **No se pudo correr**: la base de tests (`localhost:5433`) no estaba levantada y Docker no estaba corriendo. Hay que correrlos antes de cerrar el sprint |
| `frontend/ npm run lint` | Sin errores |
| `frontend/ npm run build` | Compila |
| `git merge-tree` de cada rama abierta contra `develop` | Ver §1.3 |

### 1.2 Historias del Sprint 3: dónde está cada una

| Ítem | Backend | Frontend |
|---|---|---|
| BASE (modelo y `points`) | ✅ `develop` (Montse, rama `consumo`). **Con faltantes**: ver §2, B2 y B3 | — |
| US-57 Registrar auditoría | ✅ `develop` (Maga, `backend-maga`). **Faltan** las acciones de consumos (§2, B1) y `POINTS_EXPIRED` (está en la rama de US-25) | — |
| US-58 Consultar auditoría | ✅ `develop` (Maga) | **No está en `develop`**. Rama `origin/feature/audit-frontend` (Tomás). En `develop`, `/admin/auditoria` muestra "Próximamente" |
| US-46 Identificar cliente | ✅ `develop` (jachu / Jazmín) | ✅ `develop` (Melisa, PR #19) |
| US-21 Registrar consumo | ✅ `develop` (Montse). Sin auditoría (§2, B1) | **No está en `develop`**. Rama `origin/feature/US-21-registrar-consumo-front` (Denise) |
| US-22 Anular consumo | ✅ `develop` (Montse). Sin auditoría (§2, B1) | **No está en `develop`**. Rama `origin/feature/SCRUM-74-anular-consumo-front` (Denise) |
| US-23 Consultar consumos | ✅ `develop` (jachu, PR #28) | **Incompleto.** Historial del Cliente: rama `origin/feature/SCRUM-76-consultar-consumos-front` (Denise). Pantalla **Consumos del Administrador** (listado y detalle): **no está en ninguna rama**; `/admin/consumos` muestra "Próximamente" |
| US-19 Consultar cliente | ✅ `develop` (jachu, PR #22) | **Incompleto.** Inicio del Cliente: rama `origin/feature/SCRUM-63-consultar-cliente-vista-cliente-front` (Denise; también viene adentro de SCRUM-76). Ficha del Administrador: ✅ (la hizo CLI-ADM). **Ficha del Cajero: no está en ninguna rama** |
| US-24 Ajustar puntos | ✅ `develop` (jachu, PR #21) | ✅ `develop` (Melisa, PR #27) |
| US-25 Vencimiento automático | **No está en `develop`**. Rama `origin/feature/US-25-vencimiento-automatico-de-puntos` (Melisa, 24/10). Merge limpio | — |
| US-26 Movimientos de puntos | ✅ `develop` (jachu, PR #20) | ✅ `develop` (Tomás y jachu, PR #25) |
| US-27 Configurar niveles | ✅ `develop` (jachu, PR #23) | ✅ `develop` (Tomás y jachu, PR #24) |
| US-17-AJ Alta con cuenta | ✅ `develop` (Maga) | ✅ `develop` (Maga) |
| CLI-ADM Clientes del Administrador | ✅ `develop` (Maga) | ✅ `develop` (Melisa, PR #26). **Choca con el contrato** en la edición del documento (§12, D-03) |
| PERFIL Mi perfil del Cliente | ✅ `develop` (Maga) | ✅ `develop` (jachu, PR #18) |
| EMP-PASS Usuarios de empleados | ✅ `develop` (Maga) | **No está en `develop`**. Rama `origin/feature/EMP-PASS-password-reactivacion-front` (Montse). En `develop` la pantalla todavía exige mayúscula, número y carácter especial (§2, F2) |
| CORR Correcciones S1 y S2 | Casi todo en `develop` (§2, tabla C) | Reactivación de clientes quitada ✅ |

> **La tabla de asignaciones de `HISTORIAS_SPRINT_3.md` (§0) está desactualizada:** casi todas las filas dicen
> "Sin empezar" o están vacías, y el código ya está mergeado. Hay que actualizarla con esta tabla.

### 1.3 Ramas con trabajo que no está en `develop`

| Rama | Commits fuera de `develop` | ¿Merge limpio contra `develop`? |
|---|---|---|
| `origin/feature/US-25-vencimiento-automatico-de-puntos` | 1 (Melisa, 24/10) | ✅ Sí |
| `origin/feature/US-21-registrar-consumo-front` | 3 (Denise, 24/10) | ✘ Conflictos en `cashier.api.ts`, `cashier.queries.ts`, `cashier/index.ts`, `IdentifyCustomerPage.tsx`, `shared/lib/numbers.ts` |
| `origin/feature/SCRUM-74-anular-consumo-front` (US-22) | 1 (Denise, 22/10) | ✘ Conflictos en `IdentifyCustomerPage.tsx`, `auth.handlers.ts`, `shared/lib/dates.ts` |
| `origin/feature/SCRUM-63-consultar-cliente-vista-cliente-front` (US-19, Inicio) | 1 (Denise, 21/10) | ✘ Conflictos en `CustomerLayout.tsx`, `router/index.tsx`, `domain/levels.ts` y en 5 archivos de `features/my-account` que PERFIL ya creó (add/add) |
| `origin/feature/SCRUM-76-consultar-consumos-front` (US-23, historial) | 4 (incluye SCRUM-63) | ✘ Los mismos de SCRUM-63 más `router/paths.ts` |
| `origin/feature/audit-frontend` (US-58) | 2 (Tomás, 22-23/10) | ✘ Conflictos en `AdminLayout.tsx`, `router/index.tsx`, `router/paths.ts`, `mocks/handlers/index.ts`, `shared/lib/dates.ts`. Además sube `cambios_us57.md` a la raíz (copia en UTF-16 de `CAMBIOS_PROPUESTOS_AL_CONTRATO_US57.md`): no mergearlo |
| `origin/feature/EMP-PASS-password-reactivacion-front` | 2 (Montse, 21/10) | ✘ Conflictos en `ConfirmAccountStatusChange.tsx` y `employees.handlers.ts` |
| Local `resolve/perfil-con-us17aj` (Maga) | 1 (23/10) | Resolución de un merge PERFIL + US-17-AJ en mocks. Revisar si sigue haciendo falta o borrarla |
| `origin/main` | 3 (septiembre) | `main` no recibe `develop` desde el 21/09. Decidir cuándo se pasa `develop` a `main` (§12, D-35) |

**Orden sugerido para mergear** (para pelear menos conflictos): US-25 → EMP-PASS front → US-21 front → US-22 front
(las dos tocan `IdentifyCustomerPage` y los mocks de consumos: conviene que Denise las junte) → SCRUM-63/76
(rebasear sobre `develop` y adaptar a lo que ya creó PERFIL en `features/my-account`) → US-58 front.

---

## 2. Verificación de `develop` contra el contrato del Sprint 3

Solo lo que **no** cumple. Lo que no figura acá se revisó y coincide (rutas, roles, DTOs principales,
reglas de puntos, unicidad de email, baja del cliente con su cuenta, etc.).

### Backend

| # | Qué pide el contrato | Qué hay en `develop` | Dónde |
|---|---|---|---|
| B1 ✘ | Auditar `CONSUMPTION_REGISTERED` y `CONSUMPTION_VOIDED` en la misma transacción (§3.9.3, CA-21.5, CA-22.7) | **No se audita.** Quedaron dos `TODO` y no existen las funciones de `audit-entries.ts` para esas acciones | `backend/src/consumptions/application/consumptions.service.ts:283` y `:348` |
| B2 ✘ | `points_movements` solo inserción, con el mismo trigger que auditoría (§3.12, CA-BASE.2) | **No hay trigger.** Solo lo tiene `audit_logs` | Migraciones `20261017*` y `20261019*` |
| B3 ✘ | `CHECK` de §3.12: `amount > 0`, `points >= 0`, `bonus_points >= 0`, los tres campos de anulación juntos, `initial_points > 0`, `0 <= remaining <= initial`, `points <> 0`, `reason` obligatorio en `MANUAL_ADJUSTMENT`, `debt >= 0`, `lifetime_points >= 0`, `silver_min_points > 0`, `gold > silver` | **Ninguno existe.** El `schema.prisma` dice "CHECK … written by hand in the migration", pero ninguna migración del Sprint 3 tiene un `CHECK` | `backend/prisma/migrations/2026101[7-9]*`, `20261020*` |
| B4 ✘ | Vencimiento automático (US-25) | No está en `develop` (está en su rama, §1.3). Sin eso tampoco existe `POINTS_EXPIRED` | — |
| B5 ✘ | Empleado sin teléfono → `NULL` en la base (VERIFICACIÓN §2.1, caso E1) | La columna ya es nullable, pero el repositorio **sigue guardando `''`** y las filas viejas con `''` no se migraron | `backend/src/employees/infrastructure/employees.repository.ts:7-8, 66, 103` |
| B6 ⚠️ | — | `test/auth-integration.e2e-spec.ts` estaba informado como roto por `mustChangePassword` (`CAMBIOS_PROPUESTOS_AL_CONTRATO_US57.md` §9). **No se pudo confirmar** (no corrieron los e2e) | — |
| B7 ⚠️ | CORS por variable de entorno (§4 del contrato) | Sigue fijo en `http://localhost:5173` | `backend/src/main.ts:19` |

### Frontend

| # | Qué pide el contrato | Qué hay en `develop` | Dónde |
|---|---|---|---|
| F1 ✘ | US-21, US-22, US-58, Inicio del Cliente (US-19), historial de consumos (US-23) | No están (están en ramas, §1.3) | — |
| F2 ✘ | La pantalla de empleados no exige más que el backend (§3.11, CA-EMP.4) | `accountPasswordSchema` sigue exigiendo mayúscula, número y carácter especial. Lo corrige la rama de EMP-PASS front | `frontend/src/features/employees/schemas/employee.schema.ts:64-79` |
| F3 ✘ | Pantalla Consumos del Administrador (US-23, §3.3) | No existe en ninguna rama | `/admin/consumos` → "Próximamente" |
| F4 ✘ | Ficha del cliente para el **Cajero** (US-19, §3.4.1: pestañas de 24 h, sin "Ajustar puntos") | No existe. El Cajero no tiene ruta de ficha | `frontend/src/app/router/paths.ts` |
| F5 ✘ | CLI-ADM: el Administrador **puede** corregir el documento (§3.8.2, CA-CLI.4) | La pantalla lo bloquea para todos (decisión de Melisa). El backend sí lo acepta. Ver D-03 | `frontend/src/features/customers/components/CustomerDetailsModal.tsx` |
| F6 ⚠️ | Generador de contraseñas de 12 caracteres (§3.11, CA-EMP.4) | Genera 8 (decisión de Montse, en la rama de EMP-PASS). Ver D-05 | `frontend/src/shared/lib/password.ts:11, 33` |
| F7 ⚠️ | — | Quedaron sin uso `CustomerSummary.tsx`, `EditCustomerForm.tsx`, `useUpdateCustomer` y su mock en `features/cashier` (US-46 sacó "Editar datos" del Cajero). Ver D-02 | `frontend/src/features/cashier/` |

### Correcciones de los Sprints 1 y 2 (VERIFICACIÓN §11)

| Cambio | Estado en `develop` |
|---|---|
| Unicidad de email entre activos en `employees` y `accounts`, login por cuenta activa | ✅ (índices parciales `employees_active_email_key` y `accounts_active_email_key`) |
| `customer.deactivated` y cuenta del cliente inactiva | ✅ |
| Quitar la reactivación de clientes | ✅ en backend y frontend. Quedan sin uso el valor `ACTIVATED` y el evento `customer.reactivated` (D-12) |
| Alta en caja con cuenta y contraseña inicial; script para clientes viejos | ✅ (`backend/prisma/create-missing-customer-accounts.ts`) |
| Editar/baja de clientes del Cajero (P3) | ⛔ Sin decisión de producto (D-02) |
| `employees.phone` nullable | ⚠️ Columna sí; código no (B5) |
| Sacar `role` de `UpdateAccountDto` | ✅ |
| Límites de configuración 1.000.000 / 10.000 / 120 | ✅ (`set-points-equivalence.dto.ts`, `set-points-validity.dto.ts`, `update-loyalty-configuration.dto.ts`) |
| Ninguna pantalla exige más que el backend | ⚠️ Falta empleados (F2) |
| Año ≥ 1900 en fecha de nacimiento | ✅ en Mi perfil y en `Customer`. Confirmar en `POST /customers` y `POST /auth/register` |
| Mensajes de error en español en los módulos viejos | ⛔ Sigue pendiente ("At least one field must be provided", "Customer with ID … is already inactive", etc.) |
| `LoyaltyPrismaRepository` en la transacción ambiente (US-57 §8) | ✅ Ya usa `PrismaTransactionRunner` |

---

## 3. Decisiones tomadas durante el Sprint 3 (pasan a ser contrato)

Estas decisiones se tomaron al implementar, están en el código y se registraron en algún documento. El
contrato del Sprint 3 no las tiene (o las tiene a medias). **Al aprobar este borrador quedan como contrato.**
Si el equipo no está de acuerdo con alguna, se marca en la §11 y se pide el cambio de código.

### 3.1 Puntos y consumos

| # | Tema | Decisión | Quién / dónde |
|---|---|---|---|
| S3-01 ✅ | P6: ¿cuándo nace la fila de `customer_points`? | En el **primer movimiento** del cliente, no con el alta. Sin fila: saldo 0, acumulados 0, Bronce | Montse, `docs/seguimiento/estado-puntos-y-consumos.md` |
| S3-02 ✅ | Orden de errores al anular | `409 CONSUMPTION_ALREADY_VOIDED` se evalúa **antes** que `403 VOID_NOT_ALLOWED` | Montse, `consumptions.service.ts` |
| S3-03 ✅ | `level.nextMinPoints` en Oro | `null` (igual que `next`) | BASE (`points/domain/level.ts`); `documentation-updates-us46.md` §4 |
| S3-04 ✅ | `level.progressPercent` | Se **redondea** (`Math.round`), no se trunca | BASE; `documentation-updates-us46.md` §4 |
| S3-05 ✅ | Columna `voided_by_name` en `consumptions` | Existe (snapshot del nombre de quien anuló, para `voidedBy.name`). No estaba en §3.12 | `schema.prisma` |
| S3-06 ✅ | Vencimiento (US-25, en su rama): comando y variable (P7) | Comando `npm run points:expire` (desde `backend/`). `POINTS_EXPIRATION_CRON_ENABLED` prendido por defecto en desarrollo y producción (sin la variable, prendido); `false` en los e2e | Melisa, `backend/src/points/documentation-updates-us25.md` (rama US-25) |
| S3-07 ✅ | Vencimiento: saldo del lote vencido | `remaining_points = 0` al vencer; `debt` y `lifetime_points` no cambian | Melisa, ídem |
| S3-08 ✅ | Vencimiento: clientes dados de baja | Se **excluyen**: sus lotes quedan como estaban | Melisa, ídem |
| S3-09 ✅ | Vencimiento: falla de un lote | Se deshace solo ese lote, el proceso sigue y se reintenta en la próxima corrida | Melisa, ídem |
| S3-10 ✅ | `vencerLotes` | Lo implementó US-25 (no BASE) | Melisa, ídem |
| S3-11 ✅ | Formato de saldos negativos en `details` de auditoría | "Saldo resultante" con guion común (`-30 pts`); "Puntos vencidos" y "Puntos revertidos" con el signo `−` | US-24 y US-25 |

### 3.2 Clientes del Administrador (CLI-ADM) — ya incorporadas en parte al contrato del 20/10

| # | Tema | Decisión | Quién / dónde |
|---|---|---|---|
| S3-12 ✅ | Editar un cliente inactivo | `409 CUSTOMER_INACTIVE`, "El cliente está dado de baja." (ya en §3.8.2 y §5) | Maga, `CAMBIOS_PROPUESTOS_AL_CONTRATO_CLI_ADM.md` §1 |
| S3-13 ✅ | `q` junto con `name` | `400` sin `code`, "No se puede buscar por q y por name a la vez." (ya en §3.8.1) | Maga, ídem §2 |
| S3-14 ✅ | `FORBIDDEN_FIELD` | Mensaje "El documento no se puede modificar."; se valida antes que el `404` y el `409` (ya en §3.8.2) | Maga, ídem §3 |
| S3-15 ✅ | `reason` | Se recorta; en blanco = omitido; > 500: "El motivo no puede superar los 500 caracteres."; sin `code` (ya en §3.8.2) | Maga, ídem §4 |
| S3-16 ✅ | `PATCH` con solo `reason` | `400` "At least one field must be provided" (en inglés, del Sprint 2) | Maga, ídem §5 |
| S3-17 ✅ | Evento `customer.document-changed` | `{ customerId, documentNumber }`; solo si cambia el número; `accounts` rehashea si `mustChangePassword = true` (ya en §3.8.2) | Maga, ídem §6 |
| S3-18 ✅ | Saldo y nivel en `GET /customers` | `customers` lee `customer_points` y la configuración por Prisma y usa `calculateLevel` (función pura de `points`). Sin configuración: 300 y 800 | Maga, ídem §7 |
| S3-19 ✅ | "Saldo perdido" de la baja | `customer_points.balance` leído en la transacción, con miles y signo (ya en §3.8.3) | Maga, ídem §8 |
| S3-20 ✅ | Paginador y búsqueda de Clientes | Paginador "Página X de Y" con Anterior/Siguiente (20 por página); el pedido con `q` sale con *debounce* de 300 ms | Melisa, `documentation-updates-cli-adm.md` §3 |
| S3-21 ✅ | Menú del Administrador | Las 8 opciones del prototipo; Recompensas, Misiones y Estadísticas deshabilitadas con "Próx."; `/admin` → `/admin/clientes` | Melisa, ídem §6 |

### 3.3 Auditoría (US-57 / US-58)

| # | Tema | Decisión | Quién / dónde |
|---|---|---|---|
| S3-22 ✅ | `USER_ACCOUNT_UPDATED` | Solo contraseña: "Cambió la contraseña de {Nombre}" · `Contraseña: Modificada`. Solo rol: "Cambió el rol de {Nombre}" · `Rol: antes → después`. Las dos: "Editó el usuario de {Nombre}". Sin cambios: no se audita. (Hoy el rol ya no viaja por `/usuarios`, así que en la práctica es solo la contraseña) | Maga, `CAMBIOS_PROPUESTOS_AL_CONTRATO_US57.md` §1 |
| S3-23 ✅ | `CUSTOMER_CREATED`, "Origen" | Cajero → "Caja"; Administrador → "Administración" | Maga, ídem §4 |
| S3-24 ✅ | `PUT /loyalty/configuration` sin ningún cambio | Una entrada `POINTS_EQUIVALENCE_UPDATED` con "Cambios: Se guardó sin modificar valores". Los `PUT` por sección registran siempre su propio código | Maga, ídem §5 |
| S3-25 ✅ | Formatos de `details` | Miles es-AR (`1.000 → 2.000`); bonificación "Porcentaje"/"Puntos fijos"; si una sección cambia se guardan todas sus filas; roles "Administrador"/"Cajero"; documento `DNI 30111222 → DNI 30111223`; fechas `dd/mm/aaaa`; vacío `—` | Maga, ídem §6 |
| S3-26 ✅ | `GET /auditoria`: validaciones | `400` sin `code` con mensaje en castellano; `actor` que no sea `SYSTEM` ni entero positivo → `400`; `actor` inexistente → lista vacía; `documentType` solo → filtra por tipo; fechas inválidas → `400`; documento que queda vacío al normalizar → `400`; parámetros desconocidos → `400` | Maga, ídem §10 |
| S3-27 ✅ | `GET /auditoria/actores` | `active` = estado de la **cuenta**; solo cuentas de empleados; orden apellido, nombre, id | Maga, ídem §10 |

### 3.4 Perfil, contraseñas y usuarios de empleados (PERFIL y EMP-PASS)

| # | Tema | Decisión | Quién / dónde |
|---|---|---|---|
| S3-28 ✅ | Cookie `refresh_token` | Se emite con **`Path=/api`** (antes `/api/auth`), `httpOnly`, `SameSite=Lax`; al emitirla se borra la del path viejo. Así llega a `PATCH /mi-cuenta/password` | Maga, `CAMBIOS_PROPUESTOS_AL_CONTRATO_PERFIL.md` §1 |
| S3-29 ✅ | Límite de intentos (`429 TOO_MANY_ATTEMPTS`) | En memoria del proceso (puerto `PasswordAttemptLimiter`); por `accountId`; ventana deslizante de 15 min; cuentan solo las contraseñas actuales incorrectas; el 6.º pedido da `429` aunque sea correcta; se chequea antes de verificar; `PATCH /customers/me` cuenta solo si cambia el correo | Maga, ídem §2 |
| S3-30 ✅ | Orden en `PATCH /mi-cuenta/password` | Primero la actual (`400 CURRENT_PASSWORD_INCORRECT` gana), después la política. La política no está en el DTO | Maga, ídem §3 |
| S3-31 ✅ | Mensajes que el contrato no daba | Ver la tabla de `CAMBIOS_PROPUESTOS_AL_CONTRATO_PERFIL.md` §4 (body vacío, fecha < 1900 "Esa fecha no existe", `currentPassword` > 64, cuenta inactiva con token vivo → `401`, etc.) | Maga, ídem §4 |
| S3-32 ✅ | Eventos nuevos | `customer.email-change-requested` (customers → accounts, verifica contraseña y email antes de escribir) y `account.password-changed` (accounts → auth, cierra las otras sesiones) | Maga, ídem §5 |
| S3-33 ✅ | Frontend de PERFIL | `withCredentials: true` obligatorio; tras el `204` poner `mustChangePassword = false` en la sesión; no mandar `confirmPassword`; tras cambiar el correo actualizar `user.email` | Maga, ídem §8 |
| S3-34 ✅ | P2: ventana "Cambiá tu contraseña" | **Postergable** ("Ahora no"), como dice el contrato. No existe `403 PASSWORD_CHANGE_REQUIRED` | Asumido por PERFIL back y front; falta la confirmación formal (D-01) |
| S3-35 ✅ | Cierre de sesiones al cambiar la contraseña de un empleado | `resetPassword` publica `account.password-changed` sin `currentRefreshToken` → se revocan todas | Maga, `CAMBIOS_PROPUESTOS_AL_CONTRATO_EMP_PASS.md` §1 |
| S3-36 ✅ | Respuestas de `/usuarios` | `PATCH /usuarios/:id` → `200` con `AccountResponseDto`. `PATCH /usuarios/:id/reactivate` → `204` | Maga, ídem §3 y §4 |
| S3-37 ✅ | Pantalla de empleados, contraseña a mano | Solo la regla del backend; ayuda "Entre 8 y 64 caracteres. No puede ser igual al mail."; `409 EMAIL_IN_USE` al reactivar → "El mail de este usuario ya lo usa otra cuenta activa." | Montse, rama EMP-PASS front |

### 3.5 Pantallas del Mostrador (US-46, US-24)

| # | Tema | Decisión | Quién / dónde |
|---|---|---|---|
| S3-38 ✅ | P5: US-47 ("resumen del cliente en 2 segundos") | Entra como criterio de US-46 | Melisa, `documentation-updates-us46.md` §6 |
| S3-39 ✅ | "Editar datos" en "Buscar cliente" del Mostrador | **Se sacó** (parte de P3; ver D-02 para la baja y el resto) | Melisa, ídem |
| S3-40 ✅ | Textos de carga y error que no tenía el contrato | "Cargando…", "No se pudieron cargar los movimientos.", "No se pudo buscar el cliente.", "No se pudo aplicar el ajuste.", "Aplicando…", "El máximo es 1.000.000 puntos.", y los de CLI-ADM §7 | Melisa |
| S3-41 ✅ | Componentes compartidos nuevos | `Textarea`, `Pagination`, `TableRow highlight`, `SideNav` con opciones deshabilitadas, token `--color-negative: #b3261e`, `Badge` variante `accent`, `shared/lib/numbers.ts`, `shared/types/pagination.ts` (`Paginated<T>`) | US-24, US-46, CLI-ADM. Pasarlos a `docs/architecture/estructura-frontend.md` |
| S3-42 ✅ | P8: carpetas del frontend | Movimientos del Administrador en `features/points-movements` (en `develop`). Historial de consumos en `features/consumptions` (rama SCRUM-76). La pantalla Consumos del Administrador debería ir también en `features/consumptions` | US-26 front y SCRUM-76 |

---

## 4. Pendientes del cierre

### 4.A Para cerrar el Sprint 3 (arrastre)

| # | Pendiente | Dónde surgió | Qué hay que hacer / opciones |
|---|---|---|---|
| A-01 | Auditar `CONSUMPTION_REGISTERED` y `CONSUMPTION_VOIDED` | §2 B1; `CAMBIOS_PROPUESTOS_AL_CONTRATO_US57.md` §9 | Agregar las entradas a `audit-entries.ts` y llamar a `AuditService` en `consumptions` (o en su controller, como el resto). **No tiene dueño** |
| A-02 | Trigger de solo inserción en `points_movements` | §2 B2 | Migración nueva con el mismo trigger que `audit_logs` |
| A-03 | `CHECK` de §3.12 | §2 B3 | Migración nueva. Antes, verificar que no haya filas que los violen |
| A-04 | Mergear US-25 | §1.3 | Merge limpio. Avisar a todos: `npm install` (sale `@nestjs/schedule`) |
| A-05 | Mergear los frontends de US-21, US-22, US-19 (Inicio), US-23 (historial), US-58 y EMP-PASS | §1.3 | Resolver conflictos en el orden sugerido |
| A-06 | Pantalla Consumos del Administrador (US-23) | §2 F3 | Sin rama. Asignar |
| A-07 | Ficha del cliente del Cajero (US-19) | §2 F4 | Sin rama. Asignar |
| A-08 | Correr `npm run test:e2e` completo | §1.1 | Con la base de tests levantada. Confirmar B6 |
| A-09 | `employees.phone`: guardar `NULL` y migrar los `''` | §2 B5 | Cambiar el repositorio y una migración de datos |
| A-10 | Actualizar `HISTORIAS_SPRINT_3.md` §0 y §2 (P1 a P10) | §1.2 | Con las tablas de §1.2 y §3 |
| A-11 | Docs desactualizados | Notas de cada historia | `docs/SETUP.md` (variable y comando de US-25), `estado-puntos-y-consumos.md`, `estructura-frontend.md` (componentes de S3-41, rutas `/admin/*`, layouts), `autenticacion-y-sesiones.md` (cookie `Path=/api` — PERFIL dice que ya la actualizó), `errores-y-codigos.md` (códigos nuevos), `funcionalidades/clientes.md` (`/customers/me`), `vision-general.md` ("baja y reactivación"), `frontend/CLAUDE.md` (archivos `.dc.html` que ya no existen) |
| A-12 | Archivo `cambios_us57.md` en la rama `feature/audit-frontend` | §1.3 | Sacarlo antes del merge |
| A-13 | Notas `documentation-updates-*.md` dentro de `frontend/src/features/` y `backend/src/points/` | Hallazgo | Pasar su contenido a `docs/seguimiento/` y borrarlas del código |

### 4.B Decisiones de producto o de contrato que siguen abiertas

| # | Pendiente | Dónde surgió | Opciones |
|---|---|---|---|
| D-01 | **P1:** número de la historia del perfil (US-59 ya es "Autorregistrar cliente") y su RF | HISTORIAS S3 P1 | US-60 / RF-065 (los nombra la tabla de Epics) u otro |
| D-02 | **P3:** el Cajero ya no edita ni da de baja clientes en el prototipo ni en la pantalla, pero el **backend todavía se lo permite** (`PATCH /customers/:id` y `/deactivate` con `@Roles('ADMIN','CASHIER')`) | HISTORIAS S3 P3; VERIFICACIÓN §7 P1-P2; US-46 | (a) Cambiar el actor de US-18 y US-20 a Administrador y cerrar el backend; (b) devolverle las acciones al Cajero en la ficha. Después, borrar o reutilizar `EditCustomerForm`/`CustomerSummary` |
| D-03 | **Documento del cliente:** el contrato (§3.8.2) y el backend dejan que el **Administrador** lo corrija; el frontend de CLI-ADM lo bloquea para todos (decisión de Melisa) | `documentation-updates-cli-adm.md` §1 | (a) Contrato manda: habilitar el campo para el Administrador; (b) nadie lo edita: sacarlo del backend y revisar `customer.document-changed` y CA-CLI.4/CA-CLI.7 |
| D-04 | **P4:** auditar los intentos sin permiso (`403`) | HISTORIAS S3 P4 | Sacar el escenario de US-57 (hoy no se audita) o agregar una acción |
| D-05 | Generador de contraseñas: 8 (código) o 12 (contrato) | EMP-PASS front (Montse) | Corregir el contrato a 8 o el código a 12 |
| D-06 | Anular un consumo cuyo lote **ya venció** (o se gastó y después venció): hoy `revertir` pasa el lote de `EXPIRED` a `VOIDED` y convierte **todo** `totalPoints` en deuda, aunque esos puntos ya se descontaron al vencer. El cliente pierde los puntos dos veces | Hallazgo en `points.service.ts:151-193` y `points-lot.ts:90-93` (aparece cuando entre US-25) | (a) Descontar solo lo que el lote no perdió por vencimiento; (b) no permitir anular un consumo con el lote vencido; (c) dejarlo así y documentarlo. Además: ¿`EXPIRED` puede pasar a `VOIDED`? |
| D-07 | Consumo que da **0 puntos** (monto menor que la base): el contrato pide `points <> 0` en los movimientos, pero hoy se inserta un `CONSUMPTION_CREDIT` por 0 (y no falla porque no hay `CHECK`) | Hallazgo (A-03 lo haría fallar) | (a) No registrar movimiento si `totalPoints = 0`; (b) rechazar el consumo; (c) permitir el 0 |
| D-08 | Auditoría del cambio de contraseña propio de un **empleado** (§3.11.1 paso 6) | `CAMBIOS_PROPUESTOS_AL_CONTRATO_EMP_PASS.md` §2 | Sacarlo del contrato hasta que exista la pantalla, o asignarlo |
| D-09 | Unificar los dos textos de `409 EMAIL_IN_USE` ("Ese correo ya está registrado" vs. "Ya hay un cliente o una cuenta activa con ese mail.") | `CAMBIOS…PERFIL.md` §4 | Uno solo o uno por pantalla |
| D-10 | `handleCustomerEmailChanged` tira `409` **sin `code`** cuando otra cuenta activa usa el correo (cambio de email del Administrador) | `CAMBIOS…PERFIL.md` §6 | Agregar `code: EMAIL_IN_USE` y un test |
| D-11 | Mensajes en inglés del Sprint 2 ("At least one field must be provided", etc.) | VERIFICACIÓN §11; S3-16 | Pasarlos a castellano (cambia lo que ve la pantalla) |
| D-12 | Borrar el evento `customer.reactivated` y el valor `ACTIVATED` | `CAMBIOS…CLI_ADM.md` §9 | Borrar el evento; dejar el valor si hay filas viejas |
| D-13 | Orden por apellido con tildes y mayúsculas (collation) | `CAMBIOS…CLI_ADM.md` §10 | Dejarlo; `COLLATE` en SQL crudo; columna con collation |
| D-14 | ¿`customers` puede depender de `points` por import? | `CAMBIOS…CLI_ADM.md` §7 | Dejar la lectura directa por Prisma o exponer un método de lista en `PointsService` |
| D-15 | Contador de intentos en memoria: no sobrevive reinicios ni sirve con varias instancias | `CAMBIOS…PERFIL.md` §2 | Dejarlo (una instancia en Render) o pasarlo a una tabla |
| D-16 | Panel de canjes del Mostrador: "No tiene puntos suficientes…" se muestra fijo aunque el cliente tenga saldo | `documentation-updates-us46.md` §4 | Se resuelve con US-39/40 (deja de ser fijo) |
| D-17 | **P9:** tests del frontend (Vitest y Testing Library no están instalados) | HISTORIAS S3 P9 | Sumarlos en el Sprint 4 (dependencia nueva, pedir permiso) o seguir sin tests |
| D-18 | `GET /customers/:id/status-history` sin pantalla | VERIFICACIÓN §5.2 | Mantener o quitar |
| D-19 | Límite de intentos de **login**, limpieza de sesiones vencidas, `npm audit`, verificación de email | `docs/seguimiento/deuda-tecnica.md` | Priorizar alguno para el Sprint 4 o dejarlo como limitación documentada |
| D-35 | `main` no recibe `develop` desde septiembre | §1.3 | Definir cuándo se pasa (¿al cierre de cada sprint?) |
| D-36 | Nombre del lote: "Movimiento de puntos" (Definición del Producto) o "Lote de puntos" | `avisos-cambios-2026-10-20.md` | Unificar en las dos fuentes |
| D-37 | Prototipo: el archivo único no coincide con `v2/`; falta `scripts/desempaquetar_prototipo.py`; el canje nace "Pendiente" y falta el lote "Anulado" | `docs/prototipo/v2/LEEME.md` | Reexportar desde Claude Design con los cambios del 20/10 y subir el script |
| D-38 | Diferencias del prototipo que el frontend mantuvo a propósito ("Gestionar canje" habilitado, "Niveles" como sección propia, botón "Cancelar" en alta) | `diferencias-prototipo-frontend.md` §1 | Confirmar o corregir el prototipo |

