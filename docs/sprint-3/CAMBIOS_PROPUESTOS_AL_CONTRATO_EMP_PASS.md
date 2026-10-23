# Cambios propuestos al contrato (surgidos al implementar EMP-PASS, backend)

> **Para qué es este archivo.** Al implementar "Contraseña y reactivación de usuarios de empleados"
> (EMP-PASS) aparecieron puntos que el contrato (`API_CONTRACT_SPRINT_3.md`, §3.11.2 y §3.11.4) no define o
> deja desactualizados en los otros documentos del sprint. **Ni el contrato ni los documentos del sprint se
> tocaron**: los cambia el equipo. Cada punto dice qué se hizo y qué habría que decidir.
>
> Escrito por Maga (con Claude) durante EMP-PASS, backend, en la rama `backend-maga`.

## 1. Cómo se cierran las sesiones al cambiar la contraseña (§3.11.2)

- **Qué dice el contrato:** `PATCH /usuarios/:id` "cierra todas las sesiones de esa cuenta". No dice con qué
  mecanismo.
- **Qué se hizo (decisión de Claude a pedido de Maga):** `AccountsService.resetPassword` publica el evento que
  ya existía, `account.password-changed`, **sin** `currentRefreshToken`. El listener de `auth` revoca
  entonces todas las sesiones, porque no hay ninguna que conservar. No se creó un evento nuevo.
- **Dónde:** `backend/src/accounts/application/accounts.service.ts` (`resetPassword`, ahora dentro de la
  transacción ambiente) y `backend/src/auth/infrastructure/account-password-changed.listener.ts`.
- **Qué decidir:** nada, salvo que el equipo prefiera un evento propio (`account.password-reset`).

## 2. Auditoría del cambio de contraseña propio de un empleado (§3.11.1, paso 6)

- **Qué dice el contrato:** si la cuenta es de un empleado, `PATCH /mi-cuenta/password` audita
  `USER_ACCOUNT_UPDATED` con el propio empleado como actor, "cuando exista la pantalla".
- **Qué pasó:** `CAMBIOS_PROPUESTOS_AL_CONTRATO_PERFIL.md` (sección 6) dice que esa auditoría "es de
  EMP-PASS". En EMP-PASS se acordó **no hacerla**: la historia solo cubre `PATCH /usuarios/:id` y
  `PATCH /usuarios/:id/reactivate`. Hoy no se audita.
- **Qué decidir:** a qué historia pasa, o si se saca del contrato hasta que exista la pantalla de empleados
  para cambiar la contraseña propia.

## 3. Código de éxito de `PATCH /usuarios/:id/reactivate`

- **Qué dice el contrato:** no fija el código. `VERIFICACION_SPRINTS_1_2.md` (§ endpoints) dice `200`/`204`.
- **Qué hace el código:** `204` sin cuerpo.
- **Qué decidir:** confirmar `204` y escribirlo en §3.11.4.

## 4. Respuesta de `PATCH /usuarios/:id` (§3.11.2)

- **Qué dice el contrato:** lista los errores, pero no qué se devuelve cuando funciona.
- **Qué hace el código:** `200` con el perfil de la cuenta (`AccountResponseDto`), sin `passwordHash`.
- **Qué decidir:** escribir esa respuesta en §3.11.2.

## 5. Documentos del sprint que quedaron desactualizados

| Documento | Qué está desactualizado |
|---|---|
| `HISTORIAS_SPRINT_3.md`, sección 0 | EMP-PASS sin responsable, sin rama de backend y con estado "Sin empezar" |
| `VERIFICACION_SPRINTS_1_2.md`, fila de `PATCH /usuarios/:id` (línea 324) | Dice que falta el cierre de sesiones y la auditoría; ya están hechos |
| `VERIFICACION_SPRINTS_1_2.md`, fila de `PATCH /usuarios/:id/reactivate` (línea 326) | Marca como pendiente el `409 EMAIL_IN_USE`; ya está hecho |
| `CAMBIOS_PROPUESTOS_AL_CONTRATO_PERFIL.md`, línea 117 | Atribuye a EMP-PASS la auditoría del cambio propio de un empleado; ver punto 2 |
