# ABMC de cuentas de empleados (`src/accounts`) — estado interno

Documento de seguimiento interno, no un contrato de API (todavía no hay HTTP para este módulo).
Cubre **US-05 Registrar**, **US-06 Editar**, **US-07 Dar de Baja** y **US-08 Consultar** usuario
de empleado. Las cuentas de `Customer` quedan fuera de este documento.

> **Alcance explícito:** `src/accounts/domain` y `src/accounts/application` están completos y
> testeados. `src/accounts/infrastructure` está completo salvo `save()`. No hay controller, DTOs
> HTTP, módulo registrado, login, JWT ni guards — ninguno de esos puntos está en alcance todavía.

---

## ⚠️ Novedad sin aplicar aún: la corrección de `username` ya llegó al branch

Mientras se redactaba este documento aparecieron dos commits nuevos de auth en `develop`:

- `8bf88ac test(backend): run e2e tests against a separate guarded database`
- `dcc6367 feat(backend): identify employee accounts by email instead of username`

El segundo es exactamente la corrección que bloqueaba `AccountPrismaRepository.save()`:
renombra `Account.username` → `Account.identifier` (`VARCHAR(150)`), y para cuentas de empleado
pasa a guardar ahí una **copia de `Employee.email`** (no editable), igual que `Account.role` es
copia de `Employee.role`. Para cuentas de cliente sigue siendo el número de documento.

**Esta migración (`20261005213626_account_identifier`) todavía NO se aplicó** en esta base local
— confirmado con `npx prisma migrate status` (solo lectura, no se ejecutó `migrate dev` ni
`generate`). Por eso el estado de "pendiente por username" que se detalla abajo sigue siendo el
correcto *a día de hoy*, pero va a dejar de serlo en cuanto se aplique esa migración y se
reconcilie `src/accounts` contra el nuevo nombre/semántica de la columna.

---

## Estado por historia

### US-05 — Registrar Usuario
- ✅ Lógica de negocio completa (`AccountsService.register`): Employee existe y activo, sin
  cuenta previa, email coincide con el de Employee, unicidad cruzada contra Customer,
  password 8–64, hash delegado a `PasswordHasher` (puerto).
- ⛔ Persistencia real pendiente **solo** por la columna `identifier`/auth:
  `AccountPrismaRepository.save()` sigue lanzando un error explícito documentando el bloqueo.
  No se inventó ningún valor. Una vez aplicada la migración de arriba, hay que decidir cómo
  `save()` obtiene el `identifier` (candidato obvio ahora: `Employee.email`, ya que el commit
  de auth confirma esa semántica) y recién ahí destrabar el método.

### US-06 — Editar Usuario
- ✅ Lógica completa: cambio de rol (`Employee.role` como fuente de verdad,
  `Account.role` sincronizado como copia derivada vía `syncRoleFromEmployee`, sin tratarlo como
  fuente independiente), reset de password (8–64, vía `PasswordHasher`), email no editable
  (no existe ninguna vía para tocarlo desde este módulo), protección del último ADMIN disponible
  antes de aplicar una degradación.
- Infraestructura real: todos los métodos usados por esta historia
  (`updatePasswordHash`, `syncRoleFromEmployee`) funcionan contra la base real.

### US-07 — Dar de Baja Usuario
- ✅ Lógica completa: baja lógica de `Account` (`isActive=false`), protección del último ADMIN
  disponible, llamada a `SessionRevoker` (real, marca `Session.revokedAt`), `deactivateByEmployeeId`
  listo para ser invocado desde la baja de `Employee`.
- ⏳ **Integración automática desde `EmployeesService.deactivate()` — pendiente de autorización
  explícita, documentada como requisito funcional:**
  - Regla acordada: si el `Employee` dado de baja tiene `Account`, la baja de esa `Account` debe
    intentarse como parte de la misma operación. Si esa `Account` corresponde al **último ADMIN
    disponible** (`Employee.active && Employee.role === 'ADMIN' && Account.active`), la operación
    **completa** se bloquea: no se da de baja el `Employee`, no queda la `Account` activa con el
    `Employee` inactivo, y el error se propaga hacia quien llamó.
  - Punto de integración exacto: `EmployeesService.deactivate(id)` en
    `src/employees/application/employees.service.ts`, inmediatamente después de
    `await this.employeesRepository.updateStatus(employee)`.
  - Mecanismo para evitar dependencia circular (ya validado con el caso Employees↔Customers):
    `forwardRef()` en ambos módulos + tipar el parámetro cruzado con una interfaz estructural
    mínima en vez de la clase concreta (necesario por `emitDecoratorMetadata` + ESM nativo).
  - **No implementado** — requiere tocar `src/employees/**` y `src/employees/employees.module.ts`,
    fuera de alcance hasta que se autorice explícitamente.

### US-08 — Consultar Usuario
- ✅ Lógica completa: `AccountsService.findProfileByEmployeeId` y `findProfileById`, ambos
  devuelven `{ accountId, employeeId, email, role, active }`, nunca `passwordHash`.
- **Endpoint futuro principal**: `GET /api/usuarios/empleado/:employeeId` (prioriza la consulta
  por empleado, acorde a la redacción de la historia — "visualizar la cuenta de acceso asociada
  a un empleado"). 404 si el Employee no existe, o si existe pero no tiene Account.
  `findProfileById(accountId)` se conserva en el servicio por si otra operación lo necesita
  internamente, pero no se expone como endpoint de esta historia por ahora.

---

## Qué NO se tocó para llegar a este estado

Prisma (`schema.prisma`, migraciones, `seed.ts`), `src/auth` (no existe), `src/employees/**`,
`src/customers/**`, ningún `*.module.ts` fuera de `src/accounts`, `AppModule`. Todo el trabajo
de esta etapa vive exclusivamente en `src/accounts/domain` y `src/accounts/application`
(más la infraestructura ya completada en la etapa anterior, sin cambios nuevos aquí).
