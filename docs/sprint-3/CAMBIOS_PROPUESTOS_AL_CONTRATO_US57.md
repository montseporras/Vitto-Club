# Cambios propuestos al contrato (surgidos al implementar US-57)

> **Para qué es este archivo.** Al implementar la auditoría (US-57) aparecieron puntos que el contrato
> (`API_CONTRACT_SPRINT_3.md`, §3.9) no define o define a medias. Se resolvieron con una decisión
> provisional para poder avanzar. **El contrato no se tocó**: lo cambia el equipo. Cada punto dice qué se
> hizo, dónde está en el código y qué habría que decidir.
>
> Escrito por Maga (con Claude) durante US-57, backend. Las decisiones marcadas "a pedido de Maga" las
> tomó Claude porque se le pidió que eligiera lo que mejor se adaptara al código existente.

## 1. `USER_ACCOUNT_UPDATED` cuando cambia el rol (§3.9.3)

- **Qué dice el contrato:** la única fila es `Contraseña: Modificada`, y el ejemplo de `description` es
  "Cambió la contraseña de Jorge Molina".
- **Hueco:** `PATCH /usuarios/:id` acepta `role` y/o `password`. El contrato no dice qué se guarda si cambia
  el rol.
- **Qué se hizo (decisión a pedido de Maga):** se audita `USER_ACCOUNT_UPDATED` en cualquiera de los dos
  casos, y si no cambió nada (mismo rol y sin contraseña) no se audita.

  | Qué cambió | `description` | Filas de `details` |
  |---|---|---|
  | Solo contraseña | Cambió la contraseña de {Nombre Apellido} | Contraseña: Modificada |
  | Solo rol | Cambió el rol de {Nombre Apellido} | Rol: {antes} → {después} |
  | Rol y contraseña | Editó el usuario de {Nombre Apellido} | Rol: {antes} → {después} · Contraseña: Modificada |

- **Dónde:** `backend/src/audit/domain/audit-entries.ts` (`userAccountUpdatedEntry`).
- **A decidir:** agregar estas filas al contrato, o no auditar el cambio de rol.

## 2. `CUSTOMER_DEACTIVATED`: fila "Saldo perdido" (§3.9.3)

- **Qué dice el contrato:** `Estado: Activo → Inactivo · Saldo perdido: {n} pts`.
- **Hueco:** el saldo vive en el módulo `points` (`customer_points`) y `customers` no depende de `points`
  (`backend/CLAUDE.md` §3). Leerlo crearía una dependencia nueva.
- **Qué se hizo (a pedido de Maga):** por ahora solo se guarda `Estado: Activo → Inactivo`. La fila
  "Saldo perdido" queda **sin hacer**.
- **Dónde:** `customerDeactivatedEntry` en `audit-entries.ts` (tiene un comentario).
- **A decidir:** si `customers` puede leer el saldo a través de `PointsService.resumen` (dependencia
  `customers → points`) o si el saldo lo informa otro módulo. Se resuelve junto con CLI-ADM, que también
  tiene pendiente que el evento `customer.deactivated` se publique (§3.11).

## 3. `CUSTOMER_UPDATED`: fila "Motivo" (§3.9.3)

- **Qué dice el contrato:** "Motivo (si se mandó `reason`)".
- **Hueco:** `PATCH /customers/:id` hoy no tiene el campo `reason`. Lo agrega CLI-ADM.
- **Qué se hizo (a pedido de Maga):** no se agregó el campo ni la fila. Cuando exista `reason`
  (CLI-ADM), hay que sumarla al final de `details` en `customerUpdatedEntry`.

## 4. `CUSTOMER_CREATED`: "Origen" (§3.9.3)

- **Qué dice el contrato:** `Origen: Caja / Administración`, sin decir cómo se decide.
- **Qué se hizo (a pedido de Maga):** se deriva del rol de quien da el alta: Cajero → "Caja",
  Administrador → "Administración".
- **A decidir:** confirmar esa regla en el contrato.

## 5. Guardado de configuración sin cambios (§3.9.3)

- **Qué dice el contrato:** si no cambia ningún valor, igual se registra con la fila
  "Cambios: Se guardó sin modificar valores". El `PUT /loyalty/configuration` registra una entrada por
  cada sección que cambió.
- **Hueco:** no dice qué `AuditAction` usar cuando el `PUT` completo no cambió **ninguna** sección.
- **Qué se hizo (a pedido de Maga, opción "a"):** se usa `POINTS_EQUIVALENCE_UPDATED`, como indica la tabla
  de migración (§3.9.6) para el `PUT` completo viejo.
- **Los `PUT` por sección** (`points-equivalence`, `points-validity`, `first-purchase-bonus`) siempre
  registran una entrada con su propio código, aunque no cambien nada (con la fila fija "Cambios").
- **A decidir:** confirmar el código para el caso "sin cambios en el `PUT` completo".

## 6. Formato de los valores en `details` de configuración (§3.9.3)

El contrato dice "montos con `$` y puntos de miles" pero las filas de configuración llevan el signo en la
etiqueta (`Monto base ($)`). Se aplicó:

- Números con separador de miles de es-AR: `1.000 → 2.000`.
- Tipo de bonificación con los nombres de la tabla de enums (§2): `Porcentaje` y `Puntos fijos`.
- Cuando una sección cambia se guardan **todas** sus filas (`antes → después`), también la que no cambió
  (ej.: `Puntos por monto: 10 → 10`). Si no cambió nada, solo la fila "Cambios".
- Roles con las etiquetas `Administrador` y `Cajero`.
- Documento del cliente en `CUSTOMER_UPDATED`: `Documento: DNI 30111222 → DNI 30111223`.
- Fechas: `dd/mm/aaaa`; vacío: `—`.

**A decidir:** confirmar estos formatos o definir otros.

## 7. Lo que el contrato pide quitar y no estaba (§3.9.6, "En el código")

- Las llamadas de auditoría de `auth.controller.ts` y `customer-registration.controller.ts` **no existen**
  en esta rama (venían de la rama vieja `feature/SCRUM-161`, que no se mergeó). No hubo nada que sacar;
  hay un test e2e que comprueba que login y autorregistro no escriben nada.
- `PATCH /customers/:id/activate` **sigue existiendo** y no audita. El contrato dice que se elimina; es de
  CORR / CLI-ADM.

## 8. Atomicidad de la configuración (afecta CA-57.8)

- **Hallazgo:** `LoyaltyPrismaRepository` abre su propia transacción con `this.prisma.$transaction(...)`
  sobre `PrismaService`, en vez de usar la transacción ambiente (`PrismaTransactionRunner`). Por eso la
  auditoría de la configuración se escribe en **otra** transacción que el cambio de configuración: si la
  auditoría falla, el cambio de configuración **no** se deshace (hoy sí se deshacen empleados, cuentas de
  usuario y clientes).
- **Qué se hizo:** nada, porque arreglarlo toca código de otra historia y su spec
  (`loyalty-prisma.repository.ts` y `.spec.ts`).
- **A decidir:** quién migra ese repositorio a la transacción ambiente.

## 9. Otras diferencias que se notaron (no son de US-57)

- La migración `20261017150828_sprint_3_consumptions_points` deja `silver_min_points` en **1000** y
  `gold_min_points` en **5000**; el contrato y `CLAUDE.md` dicen **300** y **800** (§3.7).
- La migración de BASE no crea el trigger que rechaza `UPDATE`, `DELETE` y `TRUNCATE` sobre
  `points_movements` (CA-BASE.2). El de `audit_logs` sí lo agrega US-57.
- Los servicios de US-21 y US-22 (rama `consumo`) no llaman a `AuditService.capture`: faltan
  `CONSUMPTION_REGISTERED` y `CONSUMPTION_VOIDED`.
- `test/auth-integration.e2e-spec.ts` falla porque la respuesta del login de clientes ahora trae
  `mustChangePassword` (viene de US-17-AJ).

## 10. Consulta de auditoría, US-58 (§3.9.4 y §3.9.5)

Puntos que el contrato no define y se resolvieron así (decisiones a pedido de Maga):

- **Errores `400` sin `code`.** El contrato lista los `400` de `GET /auditoria` sin `code`. Se responde con el
  formato estándar de la §5, sin `code`, con `message` en castellano y `details` con el campo cuando aplica.
- **`actor` inválido.** Cualquier valor que no sea `SYSTEM` ni un entero positivo (`abc`, `-3`, `1.5`)
  responde `400`.
- **`actor` con un `accountId` que no existe.** Devuelve la lista vacía (`200`), no `400` ni `404`.
- **`documentType` sin `documentNumber`.** El contrato solo define el `DNI` por defecto cuando viene el
  número. Si viene solo el tipo, se filtra por ese tipo con cualquier número.
- **Fechas inexistentes o mal formadas** (`2026-13-45`, `2026-02-30`, `13/10/2026`) responden `400`.
- **`documentNumber` que queda vacío al normalizar** (por ejemplo `. - .`) responde `400`.
- **`GET /auditoria/actores`.** `active` es el estado de la **cuenta** (`accounts.is_active`) y solo se listan
  cuentas de empleados, nunca de clientes. El orden es apellido, nombre e id.
- **Parámetros desconocidos** en la query responden `400` (`forbidNonWhitelisted`).
