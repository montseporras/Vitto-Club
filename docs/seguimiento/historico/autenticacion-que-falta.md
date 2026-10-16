# Autenticación — qué faltaba (foto del 2026-10-06)

> Extraído de la sección 11 de `autenticacion.md`. **Foto histórica**: varios puntos ya pueden estar resueltos; ver [estado actual](../estado-actual.md).

**El paso E (la integración con `accounts`) está hecho.** Quedó así:

1. Adaptador de bcryptjs para las contraseñas, dentro de `accounts` (6.8).
2. Adaptador que conecta `CredentialsVerifier` con `AccountsService` (6.8).
3. `AccountsModule` registrado en `AppModule`, e importado por `AuthModule`.
4. Los dos guards registrados para toda la aplicación (8.6).
5. `@Roles('ADMIN')` en el controller de `usuarios`, y el filtro de errores de
   `accounts` con el 403 y el campo `code`.
6. `PrismaSessionRevoker` ya no existe: lo reemplazó el listener de
   `account.deactivated` (la rama `users` lo había eliminado).
7. Los e2e existentes actualizados, y el nuevo `auth-integration.e2e-spec.ts`.

**Lo que falta:**

| Paso | Qué es | Depende de |
|---|---|---|
| F | Cierre: contrato final para el frontend, criterios de aceptación en Jira, demo de la Review (bajar los plazos de sesión por variables de entorno), seed en Neon, CORS por variable de entorno, PR a `develop` | — |
| Clientes | Login de clientes: ampliar `accounts` para cuentas de cliente, y el registro (SCRUM-160) | Quien tiene SCRUM-160 |

### Pendiente con otras personas

| Con quién | Qué |
|---|---|
| Quien hizo `users` | ~~Reactivar cuenta~~: hecho (`reactivate`, con la regla de "solo si el empleado está activo") |
| Quien hizo `users` | `firstName` y `lastName` en `AuthAccountInfo` (en `verifyCredentials` y en `findActiveById`), tomados del empleado que ya carga |
| Quien hizo `users` | `code: 'LAST_ADMIN'` en los dos `ConflictException` del último administrador, y que su filtro de errores deje pasar `code` |
| Quien hizo `users` | Sacar `role` de `PATCH /api/usuarios/:id` (decisión del PO) y agregar `GET /api/usuarios` con `{ id, employeeId, active }` |
| Quien hizo `users` | ~~E2E de aceptación~~: hecho (`accounts-abmc.e2e-spec.ts`, los cuatro casos del último administrador) |
| Quien hizo `users` | Corregir en `docs/seguimiento/historico/accounts-abmc-status.md` que `AuthAccountInfo` sí incluye `email`, y que `PasswordHasher` ya tiene implementación; abrir el PR de `users` a `develop`. **Aviso:** esta integración tocó cinco archivos suyos (`password.ts`, el filtro de errores, el controller, el módulo y sus specs) |
| Quien tiene SCRUM-160 | Registro de clientes con la opción X: lo orquesta `accounts` en una sola transacción, endpoint con `@Public()`, y ampliar `accounts` (rol `CUSTOMER`, `customerId`, `findByEmail`, `verifyCredentials`, `findActiveById`) para que un cliente pueda iniciar sesión |
| Frontend | `VITE_API_URL=/api`, proxy de Vite, y las reglas de la sección 8 de `docs/funcionalidades/autenticacion.md` |
| Frontend | Cerrar con ellos el contrato del nombre para clientes (hoy no viene; ver `/me` en deuda técnica) |
| Frontend | Subir el timeout de axios (hoy 8 s) por el arranque lento de Render |
| Quien maneja Vercel / Render | Confirmado por el frontend: el rewrite se puede hacer y el diseño de la cookie se mantiene. Falta crear los proyectos; con la URL de Render se agrega el `vercel.json` |
| Quien maneja Render | Cargar `NODE_ENV=production` (sin eso la cookie no sale `Secure`) y un `JWT_SECRET` propio de producción |
| Equipo | Avisar que la aplicación no arranca sin `JWT_SECRET` |
| Equipo | **Cuando esto llegue a `develop`, todos los endpoints exigen token** (antes respondían sin él). Sin el login funcionando en el frontend, las pantallas de clientes y empleados van a recibir 401 |
| Equipo | Unificar el idioma de los mensajes de error |

