# Sprint 4: lo que falta cerrar

> **Para qué sirve este archivo.** `docs/sprint-5/CIERRE_SPRINT_4.md` §4.A lista lo que quedó pendiente del
> Sprint 4 (el "arrastre", ítem ARRASTRE-S4). El 12/11/2026 se hizo **lo mínimo que bloqueaba a BASE-5** (rama
> `feature/ARRASTRE-S4-cierre-back`, commit `d270b91`, mergeada en `develop`). Acá está **todo lo demás**, paso
> a paso, para que cualquiera lo pueda tomar sin preguntar.
>
> **Verificado el 12/11/2026 leyendo el código de `develop`.** Cada ítem dice cómo se comprobó. Si pasó tiempo,
> volver a comprobarlo antes de empezar.
>
> **Fuentes de verdad** (no se modifican desde acá): `docs/sprint-5/CIERRE_SPRINT_4.md`,
> `docs/sprint-4/CIERRE_SPRINT_3.md` y los contratos. Si algo de este archivo choca con ellos, mandan ellos.
>
> **Regla del repo:** si un ítem toca otra historia, otra capa o configuración compartida, **se pregunta
> antes** (`CLAUDE.md` raíz §1.1 y §5).

## Resumen

| Ítem | Qué es | Capa | Estado |
|---|---|---|---|
| A4-01 | Bloquear la recompensa al confirmar un canje | Backend | ✅ Hecho (12/11) |
| A4-02 | Test de usar un canje rechazado | Backend | ✅ Hecho (12/11) |
| A4-03 | Scripts y variables de los crons | Backend | ✅ Hecho (12/11) |
| A4-04 | Correr todos los e2e | Backend | ✅ Hecho (12/11) |
| A4-05 | Trigger y `CHECK` del Sprint 3 | Backend | 🟡 **A medias**: ver P-1 |
| A4-07 | CORS por variable de entorno | Backend | ✅ Hecho (12/11) |
| S5-13 | Eliminar `GET /movimientos-de-puntos` | Backend | ✅ Hecho (12/11) |
| A4-11 | Borrar ramas viejas | Git | ✅ Hecho por Deni (12/11) |
| A4-06 | `employees.phone` en `NULL` | Backend | ⬜ P-2 |
| A4-08 | El `it.skip` del autorregistro | Backend | ⬜ P-3 |
| A4-09 | Notas `documentation-updates-*.md` dentro del código | Backend y frontend | ⬜ P-4 |
| A4-10 | Tablas de asignaciones | Documentos | ⬜ P-5 |
| A4-12 | Evento y `forbiddenField` sin uso | Backend | ⬜ P-6 |
| A4-13 | `Modal` que se cierre con Escape | Frontend | ⬜ P-7 |
| A4-14 | Comentario del generador de contraseñas | Frontend | ⬜ P-8 |
| A-07 | Ficha del cliente para el Cajero | Frontend | ⬜ P-9 |
| — | Código sin uso: `PointsMovementsService.listAll` | Backend | ⬜ P-10 |
| — | Llevar dos decisiones al contrato | Documentos | ⬜ P-11 |
| S5-41, S5-56, S5-57 | Ajustes de pantalla de sprints anteriores | Frontend | ⬜ P-12 (a verificar) |

---

## P-1. Los `CHECK` que faltan de la §3.12 del Sprint 3 (A4-05, segunda parte)

### Qué es
El contrato del Sprint 3 (`API_CONTRACT_SPRINT_3.md` §3.12) pide varios `CHECK` en la base. El 12/11 se
agregaron **solo los de `points_movements`** (`points <> 0` y "motivo obligatorio en `MANUAL_ADJUSTMENT`") y el
trigger de solo inserción. Los de las demás tablas **siguen sin existir**.

### Qué hay hoy
Esas reglas las cumple solo el código, no la base. Los comentarios de `backend/prisma/schema.prisma` dicen que
existen, y no es cierto para estas.

### Qué hay que hacer
Una migración **nueva** (no tocar las existentes) que agregue, con los nombres de la columna reales:

| Tabla | Restricción |
|---|---|
| `consumptions` | `amount > 0`; `points >= 0`; `bonus_points >= 0` |
| `consumptions` | Los tres campos de anulación (`voided_at`, `voided_by_account_id`, `voided_reason`) **o todos nulos o todos con valor, según `status`** (`VOIDED` = con valor, `REGISTERED` = nulos) |
| `points_lots` | `initial_points > 0`; `0 <= remaining_points <= initial_points` |
| `customer_points` | `debt >= 0`; `lifetime_points >= 0` |
| `loyalty_program_configurations` | `silver_min_points > 0`; `gold_min_points > silver_min_points` |

Pasos:
1. **Antes de escribir la migración, revisar los datos existentes** con una consulta por cada regla, por
   ejemplo `SELECT count(*) FROM consumptions WHERE amount <= 0;`. Si alguna da más de 0, **no seguir**:
   avisar. No se borran datos sin preguntar.
2. Crear `backend/prisma/migrations/<fecha>_sprint5_s3_checks/migration.sql` escrita a mano, con el mismo
   estilo que `20261112120000_sprint4_arrastre_points_movements_integrity` (comentario al principio, una
   verificación previa que corte con un mensaje claro y después los `ADD CONSTRAINT`).
3. Un e2e que, como `backend/test/points-movements-integrity.e2e-spec.ts`, consulte `pg_constraint` y compruebe
   que la base rechaza cada violación con un `INSERT` directo.
4. Actualizar `docs/database/modelo-de-datos.md` (la nota "Pendiente del Sprint 3") y
   `docs/database/migraciones.md`.

### Cómo se sabe que está hecho
La base rechaza cada una de esas filas inválidas; `npm run test:e2e` completo sigue en verde; la nota
"Pendiente del Sprint 3" de `modelo-de-datos.md` desaparece.

**Ojo:** el `CHECK` de `amount > 0` puede chocar con algún e2e que inserte un consumo de monto 0. Si pasa,
corregir ese test, no la regla.

### Quién
Sin asignar. Backend.

---

## P-2. `employees.phone` guarda `''` en vez de `NULL` (A4-06)

### Qué es
El teléfono del empleado es **opcional**, y la columna ya acepta `NULL`, pero el repositorio guarda `''`
cuando no hay teléfono.

### Qué hay hoy (verificado)
`backend/src/employees/infrastructure/employees.repository.ts`: `const NO_PHONE = '';` (línea 9), se lee
convirtiendo `''` en `null` (línea 18) y se guarda `employee.getPhone() ?? NO_PHONE` (líneas 66 y 103). Las filas
viejas de la base tienen `''`.

### Qué hay que hacer
1. En el repositorio, guardar `employee.getPhone() ?? null` y leer el valor tal cual (sacar `NO_PHONE`).
2. Una migración de datos nueva: `UPDATE employees SET phone = NULL WHERE phone = '';`.
3. Ajustar los tests de `employees` que esperen `''`.

### Cómo se sabe que está hecho
Crear un empleado sin teléfono deja `NULL` en la base; `GET /empleados` sigue devolviendo `phone: null`; los
tests pasan.

### Quién
Sin asignar. Backend. Es de baja prioridad: hoy funciona.

---

## P-3. El e2e saltado del autorregistro (A4-08)

### Qué es
Un test del autorregistro está desactivado con `it.skip`. Lo que lo bloqueaba ya se resolvió.

### Qué hay hoy (verificado)
`backend/test/customer-registration.e2e-spec.ts`, línea 236: `it.skip('dado de baja, puede volver a
registrarse con el mismo DNI y email (pendiente: accounts.email)'…`.

### Qué hay que hacer
1. Cambiar `it.skip` por `it`.
2. Correr `npm run test:e2e -- customer-registration`.
3. Si pasa, dejarlo. Si falla, **leer por qué**: puede que lo que lo bloqueaba no estuviera resuelto del todo.
   En ese caso volver a dejarlo con `it.skip` y anotar el motivo acá. No arreglar código de otra historia.

### Cómo se sabe que está hecho
La suite completa corre sin ningún `it.skip`.

### Quién
Sin asignar. Backend. Es chico.

---

## P-4. Las 12 notas `documentation-updates-*.md` dentro del código (A4-09)

### Qué es
Cada historia dejó una nota con lo que había que actualizar en la documentación. Su contenido ya está en
`docs/seguimiento/decisiones-de-implementacion.md`. Siguen dentro de `src/`.

### Qué hay hoy (verificado: son 12)
- `backend/src/points/documentation-updates-us25.md`
- `backend/src/redemptions/documentation-updates-us43.md`, `…us44.md`, `…us45.md`
- `backend/src/rewards/documentation-updates-us37.md`
- `frontend/src/features/cashier/documentation-updates-us24.md`, `…us46.md`
- `frontend/src/features/customers/documentation-updates-cli-adm.md`
- `frontend/src/features/my-account/documentation-updates-us39.md`
- `frontend/src/features/redemptions/documentation-updates-us40.md`, `…us42.md`, `…us43.md`

### Qué hay que hacer
1. **Antes de borrar cada nota, comprobar que lo que dice ya está** en `docs/` (en
   `decisiones-de-implementacion.md` o en el documento que corresponda). Si falta algo, pasarlo primero.
2. Borrar los 12 archivos (`git rm`).
3. Las dos del frontend y las diez restantes se borran en commits separados por capa, porque la regla del repo
   es no tocar la otra capa en una misma tarea.

### Cómo se sabe que está hecho
`find backend/src frontend/src -name "documentation-updates-*.md"` no devuelve nada.

### Quién
Sin asignar. Una persona de backend y otra de frontend, o una sola con permiso para las dos capas.

---

## P-5. Las tablas de asignaciones (A4-10)

### Qué es
Las tablas de "Asignaciones" de los documentos de historias dicen "Sin empezar" casi en todo, y la de
`CIERRE_SPRINT_4.md` §4.A (fila, responsable, rama, estado) está vacía.

### Qué hay hoy (verificado)
La tabla de `docs/sprint-5/HISTORIAS_SPRINT_5.md` §0 tiene vacíos Responsable, Rama y Carpeta de todas las
filas. Lo mismo la tabla de ARRASTRE-S4 de su sección.

### Qué hay que hacer
Son **fuentes de verdad**: **no las edita Claude ni ninguna persona sin acordarlo.** Las actualiza el equipo
(Deni), anotando para cada historia quién la hace, en qué rama y en qué estado.

### Cómo se sabe que está hecho
Cada fila de §0 tiene responsable, rama y estado.

### Quién
Deni o quien coordina el equipo.

---

## P-6. El evento `customer.document-changed` y `forbiddenField` sin uso (A4-12)

### Qué es
Desde la decisión D-03 nadie edita el documento de un cliente, así que quedaron sin uso el evento
`customer.document-changed` (con su listener en `accounts`) y el error `forbiddenField`.

### Qué hay hoy (verificado)
- `backend/src/shared/events/domain-events.ts`: define `CUSTOMER_DOCUMENT_CHANGED`.
- `backend/src/accounts/application/customer-events.listener.ts`: el listener.
- `backend/src/customers/domain/errors/forbidden-field.error.ts`: `forbiddenField()`.

### Qué hay que hacer
**Primero decidir** (`CIERRE_SPRINT_4.md` §4.A lo deja a elección): (a) borrarlos, o (b) dejarlos con un
comentario que explique por qué están. Si se borran: sacar el evento, su listener, `forbiddenField`, y los tests
que los usen; comprobar con una búsqueda en todo el repo que no quede ninguna referencia. **No tocar** el
código de `accounts` sin avisar: es de otra historia.

### Cómo se sabe que está hecho
La búsqueda `grep -rn "CUSTOMER_DOCUMENT_CHANGED\|forbiddenField" backend/src` da lo esperado según lo
decidido, y todos los tests pasan.

### Quién
Sin asignar. Backend. Primero hace falta la decisión de Deni.

---

## P-7. El `Modal` no se cierra con Escape (A4-13)

### Qué es
`frontend/CLAUDE.md` §4.10 pide que los modales se cierren con Escape. El componente compartido `Modal` no lo
hace: cada modal agrega su propio listener (`useEscapeKey`).

### Qué hay hoy (verificado)
`frontend/src/shared/components/ui/Modal.tsx` no contiene `Escape` ni `useEscapeKey`.

### Qué hay que hacer
1. Hacer que `Modal.tsx` cierre con Escape. **Es un componente compartido: pedir permiso antes de tocarlo**
   (`CLAUDE.md` raíz §5.6).
2. Sacar el `useEscapeKey` que repite cada modal, **uno por uno**, comprobando que el modal siga cerrando con
   Escape y que no se cierre dos veces.

### Cómo se sabe que está hecho
Todos los modales se cierran con Escape; `npm run lint` y `npm run build` del frontend en verde; recorrido
manual de cada modal.

### Quién
Sin asignar. Frontend.

---

## P-8. Comentario viejo del generador de contraseñas (A4-14)

### Qué es
Un comentario dice que el generador de contraseñas hace 12 caracteres. Hace 8 (decisión D-05).

### Qué hay hoy (verificado)
`frontend/src/features/employees/schemas/employee.schema.ts`, línea 63: "El generador (12 caracteres, con
mayúscula, número y…".

### Qué hay que hacer
Cambiar "12" por "8" en ese comentario. Nada más.

### Cómo se sabe que está hecho
El comentario dice 8 y coincide con lo que hace el generador (comprobarlo en el código del generador).

### Quién
Sin asignar. Frontend. Es de un minuto.

---

## P-9. La ficha del cliente para el Cajero (A-07, US-19)

### Qué es
El contrato del Sprint 3 (§3.4.1) pide una ficha del cliente para el **Cajero**. Esto figuraba como pendiente
en `CIERRE_SPRINT_3.md`.

### Qué hay hoy
`frontend/src/app/router/paths.ts` tiene `cashier.customer: '/caja/cliente'`, y `router/index.tsx` registra esa
ruta (línea 91). **No pude confirmar si esa pantalla es la ficha completa** o solo la búsqueda de cliente.

### Qué hay que hacer
1. Abrir `/caja/cliente` y comparar con `docs/sprint-3/API_CONTRACT_SPRINT_3.md` §3.4.1 y con el prototipo.
2. Si la ficha existe y está completa, **cerrar el ítem** anotándolo acá. Si no, **frenar y preguntar**: es una
   decisión de producto (`CIERRE_SPRINT_3.md` la dejó para confirmar).

### Quién
Sin asignar. Frontend.

---

## P-10. Código sin uso: `PointsMovementsService.listAll`

### Qué es
Al eliminar `GET /movimientos-de-puntos` (S5-13) se borró su controller, pero quedó el método que lo atendía.

### Qué hay hoy (verificado)
`backend/src/points/application/points-movements.service.ts` línea 64: `listAll`. Lo usan un test unitario
(`points-movements.service.spec.ts`, bloque "listAll() — CA-26.4") y un e2e
(`backend/test/points-redemption.e2e-spec.ts` línea 145). En producción no lo llama nadie.

### Qué hay que hacer
1. Cambiar ese e2e para que use otra consulta (por ejemplo `prisma.pointsMovement.findMany`).
2. Borrar `listAll`, su test unitario y lo que solo usaba `listAll` (`MovementListFilters`, el método `list` del
   puerto y del repositorio si ya nadie los usa; **comprobarlo con una búsqueda antes de borrar**).
3. No borrar nada que usen `/customers/:id/movimientos` o `/customers/me/movimientos`.

### Cómo se sabe que está hecho
Lint, build, unitarios y e2e completos en verde, y una búsqueda de `listAll` en `backend/src/points` no
encuentra nada.

### Quién
Sin asignar. Backend.

---

## P-11. Dos decisiones tomadas el 12/11 que hay que llevar al contrato

Estas decisiones se tomaron para destrabar el trabajo y **no están escritas en ningún contrato**. Los contratos
son fuentes de verdad: **los cambia el equipo**, no se editan desde acá.

| Decisión | Qué se decidió | Dónde está en el código |
|---|---|---|
| **D-07** (consumo de 0 puntos) | Un consumo que da 0 puntos se **registra**, pero **no deja movimiento** de puntos, y anularlo tampoco. Tomada a pedido de Montse | `backend/src/points/application/points.service.ts` (`acreditar` y `revertir`) |
| **`CORS_ORIGIN`** | El CORS sale de la variable `CORS_ORIGIN` (varios orígenes separados por coma); sin la variable, `http://localhost:5173`. Tomada a pedido de Montse | `backend/src/shared/security/cors-origins.ts` y `main.ts` |

### Qué hay que hacer
Deni (o quien lleve el contrato) los escribe en el contrato del Sprint 5 (por ejemplo en §4 "Información
general" para `CORS_ORIGIN` y en §3.1 o §8.3 para D-07) y los marca como decididos.

---

## P-12. Ajustes de pantalla de sprints anteriores (S5-41, S5-56, S5-57)

### Qué es
Cambios solo de frontend que `HISTORIAS_SPRINT_5.md` agrupa en ARRASTRE-S4. El detalle y los criterios
(CA-AJ.1 a CA-AJ.6) están en `docs/sprint-5/AJUSTES_PANTALLAS_SPRINTS_ANTERIORES.md`.

### Qué hay hoy (verificado solo en parte)
- ✅ El botón "Volver" ya no se muestra en el encabezado del Administrador: `frontend/src/app/layouts/AdminLayout.tsx` usa `<AppHeader … showBack={false}>`.
- ✅ "Elegir fechas" ya existe en Mis canjes (`MyRedemptions.tsx`).
- ❓ **No verifiqué** las tarjetas compactas de Configuración → Puntos, el recuadro de las pantallas del
  Administrador "hasta abajo", ni el paginado por alto de pantalla.

### Qué hay que hacer
Recorrer cada criterio de `AJUSTES_PANTALLAS_SPRINTS_ANTERIORES.md` (CA-AJ.1 a CA-AJ.6) contra la pantalla
real y anotar acá cuáles están hechos y cuáles no. Los que falten son de una persona de frontend.

### Quién
Sin asignar. Frontend.

---

## Decisiones abiertas del Sprint 3 y 4 que siguen sin resolver

`CIERRE_SPRINT_4.md` §4.B lista decisiones de producto abiertas: D-06, D-08 a D-13, D-15, D-18, D-19, D-35, D-37 y D-38 (D-07 se resolvió en la práctica, ver P-11). Ninguna
se resolvió en el arrastre. Son del equipo: no se resuelven desde el código.
