# EMP-PASS (frontend) — contraseña y reactivación de usuarios de empleados

> Rama `feature/EMP-PASS-password-reactivacion-front`, desde `develop`. Pedido por Montse. Backend ya
> hecho (rama `backend-maga`), no se tocó nada de `backend/`.

## Qué se hizo

- **CA-EMP.4** (la pantalla no exige más que el backend): `employee.schema.ts` →
  `accountPasswordSchema` exigía mayúscula, número y carácter especial, algo que el contrato (§3.11) no
  pide. Se sacaron esas tres reglas y se dejaron solo las del contrato: entre 8 y 64 caracteres (un solo
  mensaje, "Tiene que tener entre 8 y 64 caracteres"), máximo 72 bytes UTF-8 ("La contraseña es demasiado
  larga", nueva constante `PASSWORD_MAX_BYTES` en `shared/lib/password.ts`) y distinta del mail. El
  generador sigue devolviendo contraseñas con mayúscula/número/especial (cumple la regla de sobra); solo
  se dejó de EXIGÍRSELO a lo que el Administrador escribe a mano.
- **409 `EMAIL_IN_USE` al reactivar:** `ConfirmAccountStatusChange.tsx` no distinguía ese código y mostraba
  siempre el mensaje genérico de conflicto. Se agregó la rama `apiError.code === 'EMAIL_IN_USE'` → "El mail
  de este usuario ya lo usa otra cuenta activa." (§3.11.4). Se agregó un empleado y una cuenta de prueba en
  `employees.handlers.ts` (Emilia Ríos, cuenta inactiva con el mismo mail que la cuenta activa de Ana) para
  poder probar este caso con mocks, y el handler de `PATCH /usuarios/:id/reactivate` ahora chequea el mail
  contra las demás cuentas activas antes de reactivar.
- **CA-EMP.3 y CA-EMP.6** (textos de cambio de contraseña y diálogo de reactivación): ya estaban escritos
  igual que el contrato en el código existente (`ChangePasswordForm.tsx`, `AccountPassword.tsx`,
  `ConfirmAccountStatusChange.tsx`). No se tocó nada ahí.

## Decisión tomada a pedido de Montse

**El hint de `PasswordField`** (compartido por `CreateAccountForm.tsx`, `CreateEmployeeForm.tsx` y
`ChangePasswordForm.tsx`, en `AccountPassword.tsx`) decía "Mínimo 8 caracteres, con una mayúscula, un
número y un carácter especial.", que ya no era cierto una vez sacadas esas tres reglas de
`accountPasswordSchema`.

Ese componente no es de ninguna historia del Sprint 3: viene de **SCRUM-21**
(`feature/SCRUM-21-registrar-usuario`) y **SCRUM-24** (`feature/SCRUM-24-editar-usuario`), ya mergeadas a
`develop` en un sprint anterior. Montse pidió corregirlo igual, aunque no sea estrictamente de EMP-PASS,
porque dejar un hint que promete una regla que ya no se exige sería peor que no tocarlo.

Se cambió a **"Entre 8 y 64 caracteres. No puede ser igual al mail."** (misma regla que
`accountPasswordSchema` aplica hoy, sin inventar un texto nuevo: es la paráfrasis más directa de las dos
reglas que el schema sí exige). Afecta a las tres pantallas que usan `PasswordField`: alta de cuenta, alta
de empleado y cambio de contraseña.

## No se tocó (y por qué)

- **`shared/lib/password.ts`:** `generatePassword()` usa `PASSWORD_MIN_LENGTH` (8) como largo por
  defecto, y los tres formularios que la llaman (`ChangePasswordForm.tsx`, `CreateAccountForm.tsx`,
  `CreateEmployeeForm.tsx`) lo hacen sin pasarle `12`, aunque el contrato y la historia dicen "el
  generador de 12 caracteres queda igual". O sea que hoy genera 8 caracteres, no 12. Esto afecta a
  `CreateAccountForm.tsx` y `CreateEmployeeForm.tsx` también (no son de EMP-PASS, son de SCRUM-21/24, de
  un sprint anterior), así que no se corrigió: queda anotado para que lo tome quien corresponda.
- **`docs/sprint-3/CAMBIOS_PROPUESTOS_AL_CONTRATO_EMP_PASS.md`:** el pedido lo citaba como la fuente de
  los 3 datos de respuesta del backend que el contrato no escribe (200 con el perfil en
  `PATCH /usuarios/:id`, 204 sin cuerpo en `/reactivate`, y qué 409 llevan `code`). **Ese archivo no existe
  en el repo.** No lo recreé (no es una de las tres fuentes de verdad que si faltan hay que frenar, pero
  igual lo aviso); usé esos 3 datos directamente del pedido, que ya los daba por escrito.
- **Recorrido manual con capturas de pantalla (paso 8 de `frontend/CLAUDE.md`):** no lo hice. Este entorno
  no tiene una herramienta de navegador disponible para levantar `npm run dev` y mirar las pantallas.
  Falta que alguien del equipo pruebe a mano: cambiar contraseña de un empleado (antes/después, con y sin
  mayúscula en lo que escribe a mano) y reactivar un usuario (caso feliz y el caso EMAIL_IN_USE con la
  cuenta de prueba "Emilia Ríos").
- Nada de `backend/`: según el pedido, ya está hecho.
- Auditoría (US-57) y reactivación de empleados/clientes (no existe): fuera de alcance explícito de
  EMP-PASS.

## Preguntas abiertas

- Quién toma el bug del generador de contraseñas (8 vs. 12 caracteres): afecta a SCRUM-21/24 además de
  EMP-PASS, así que no es solo mío para decidir ni para arreglar.
- Si alguien recrea `docs/sprint-3/CAMBIOS_PROPUESTOS_AL_CONTRATO_EMP_PASS.md`, confirmar que los 3 datos
  que usé (200 con perfil, 204 sin cuerpo, qué 409 llevan `code`) coincidan con lo que quede escrito ahí.

## Verificación

- `npm run lint` (frontend): sin errores.
- `npm run build` (frontend): sin errores.
- Recorrido manual con capturas: no hecho (ver "No se tocó" arriba).
