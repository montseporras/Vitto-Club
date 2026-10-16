# Criterios de aceptación — inicio y cierre de sesión (SCRUM-158, SCRUM-159, SCRUM-36)

> Extraído de la sección 9 de `contexto-proximo-chat.md` (versión final "para Jira", 2026-10-05/06). Los de SCRUM-159 y el 5 de SCRUM-158 estaban marcados como "todavía no demostrables" en esa fecha; **verificar su estado actual**.

### Comunes a SCRUM-158 y SCRUM-159

- **Mensaje único de error.** Dado un intento de inicio de sesión que falla por
  cualquier causa, cuando el sistema responde, entonces muestra siempre el
  mismo mensaje genérico y no indica cuál fue la causa.
- **Campos obligatorios.** Dado el formulario de inicio de sesión, cuando el
  usuario envía el email o la contraseña vacíos, entonces el sistema indica que
  son obligatorios y no intenta autenticar.
- **Acceso según rol.** Dado un usuario con sesión iniciada, cuando intenta una
  operación que su rol no tiene habilitada, entonces el sistema la rechaza e
  informa que no tiene permiso.
- **Sin sesión.** Dado un usuario sin sesión o con la sesión vencida, cuando
  intenta una operación protegida, entonces el sistema la rechaza y le pide
  iniciar sesión.
- **Efecto de la baja o del cambio de rol.** Dado un usuario con sesión
  iniciada, cuando lo dan de baja o le cambian el rol, entonces el cambio se
  aplica en un máximo de 15 minutos.

### SCRUM-158: iniciar sesión (empleados)

1. **Ingreso correcto.** Dado un empleado activo con cuenta activa, cuando
   ingresa su email y su contraseña correctos, entonces accede con los permisos
   de su rol.
2. **Mayúsculas.** Dado un empleado con email `ana.gomez@vitto.club`, cuando
   ingresa `Ana.Gomez@Vitto.Club` con la contraseña correcta, entonces accede
   igual.
3. **Empleado sin cuenta.** Recibe el mensaje genérico.
4. **Cuenta o empleado dado de baja.** Con sus credenciales correctas, recibe
   el mensaje genérico y no accede.
5. **Cuenta reactivada.** Dado un empleado activo cuya cuenta fue reactivada
   por un Administrador, cuando ingresa sus credenciales, entonces accede.
6. **Inactividad.** Pasados 30 minutos sin usar el sistema, la sesión vence.
7. **Duración máxima.** A las 12 horas la sesión vence aunque haya estado
   activo.

### SCRUM-159: iniciar sesión (clientes)

1. **Ingreso correcto.** Dado un cliente activo con cuenta, cuando ingresa su
   email y su contraseña correctos, entonces accede como Cliente.
2. **Mayúsculas.** Con `Lucia@Example.com` en lugar de `lucia@example.com`,
   accede igual.
3. **Cliente dado de baja.** Recibe el mensaje genérico y no accede.
4. **Cliente reactivado.** Accede con la misma contraseña que tenía.
5. **Cliente sin cuenta.** Recibe el mensaje genérico.
6. **Cambio de email.** Accede con el email nuevo y no con el anterior.
7. **Email en uso.** Si se intenta cambiar el email de un cliente a uno que ya
   tiene cuenta, el sistema lo rechaza y no cambia nada.
8. **Inactividad.** Pasados 7 días sin usar el sistema, la sesión vence.
9. **Duración máxima.** A los 30 días debe iniciar sesión de nuevo.

### SCRUM-36: cerrar sesión

1. **Cierre.** El sistema lo lleva al inicio de sesión y deja de tener acceso
   desde ese dispositivo.
2. **No se puede renovar.** Una sesión cerrada no se renueva.
3. **Solo la sesión actual.** Con dos dispositivos, cerrar en uno deja la otra
   activa.
4. **Cierre repetido.** Con la sesión ya vencida o cerrada, no muestra error.

**Qué criterios todavía no se pueden demostrar:** todos los de SCRUM-159 (el
login de clientes depende de la rama de cuentas de clientes), y el 5 de
SCRUM-158 (depende de que `users` agregue la reactivación).
