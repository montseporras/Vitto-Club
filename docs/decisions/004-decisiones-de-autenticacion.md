# ADR 004 — Decisiones de diseño de autenticación y sesiones

> Extraído tal cual de la sección 10 de `autenticacion.md`. Es una tabla de decisiones ya tomadas, no un ADR individual; conviene partirla en ADRs más chicos si alguna se discute.

| Decisión | Motivo |
|---|---|
| Un solo endpoint de login para todos los roles | El frontend tiene una sola pantalla |
| Todos entran con email | Simplifica: un solo tipo de identificador |
| Mismo mensaje ante cualquier fallo de login | No revelar si el email existe, si la contraseña está mal o si la cuenta está dada de baja |
| Access token de 15 minutos | Balance entre no consultar la base en cada pedido y que una baja tarde poco en aplicarse |
| Refresh token rotado en cada uso | Un token robado sirve una sola vez |
| Una fila por sesión, no por token | Más simple; no hace falta guardar los tokens viejos |
| En la base se guarda el hash del refresh token | Leer la tabla no alcanza para robar sesiones |
| Plazos distintos para empleados y clientes | La caja es una computadora compartida; el celular del cliente no |
| Varias sesiones simultáneas por cuenta | Dos cajas, o celular y computadora |
| El logout cierra solo la sesión actual | Consecuencia de lo anterior |
| Los errores llevan un código fijo además del mensaje | El frontend decide por el código y no depende del texto |
| El login y la renovación devuelven lo mismo | Al recargar la página, el frontend reconstruye su estado solo con la renovación |
| El email va en la respuesta pero no en el access token | Puede cambiar, y el token quedaría con un dato viejo |
| Los decoradores de seguridad viven en `src/shared/security/` | Para que `accounts` no tenga que importar `auth` (ver `docs/ARCHITECTURE.md`) |
| El refresh token viaja en una cookie `HttpOnly`, nunca en el cuerpo | El JavaScript de la página no puede leerlo, así que un script malicioso tampoco |
| El access token va en el cuerpo y el frontend lo guarda en memoria | Es el que dura poco; no se guarda en `localStorage` |
| Un endpoint sin `@Roles()` ni `@Public()` queda cerrado para todos | Si alguien se olvida de declararlo, falla cerrado y no abierto |
| El login no valida formato de email ni largo mínimo de contraseña | Un error de formato revelaría qué forma tienen las credenciales válidas |
| Un fallo de renovación no borra la cookie | Con dos pestañas, borraría la cookie nueva que dejó la otra |
| La cookie se lee a mano, sin `cookie-parser` | Evita una dependencia y una configuración en `main.ts` que los tests no ejecutan |
| Los guards se activaron para toda la aplicación recién al integrar con `accounts` | Antes de eso nadie podía iniciar sesión: activarlos habría bloqueado toda la API |
| Los guards se registran con `APP_GUARD` en `AuthModule`, primero autenticación y después roles | Cubre todos los módulos sin que cada controller lo pida, y el orden garantiza que el usuario ya esté identificado cuando se mira su rol |
| El hasher de contraseñas (`bcryptjs`) vive en `accounts` | Si estuviera en `auth`, `accounts` tendría que importar `auth`, que ya importa `accounts`: ciclo |
| La contraseña se limita a 72 bytes además de 64 caracteres | bcrypt descarta en silencio lo que pase de 72 bytes; con tildes, 64 caracteres pueden ser 128 bytes |
| `auth` traduce lo que devuelve `accounts` con un adaptador propio | Cada módulo conserva su forma de los datos; el puerto de `auth` no cambia si `accounts` cambia |
| Nombre y apellido van en la respuesta del login y la renovación, no en el token | El frontend los muestra en el encabezado; pueden cambiar. Evita crear endpoints `/me` solo para eso |
| Para clientes el nombre no viene por ahora | Leerlo desde `accounts` crearía un ciclo con `customers`; se resuelve con `GET /customers/me` cuando haga falta |
| El rol de un empleado se cambia solo desde `PATCH /empleados/:id` | Decisión del PO (2026-10-06): `Employee.role` es la fuente de verdad. "Editar usuario" queda para los datos de acceso (resetear contraseña) |
| La lista de usuarios se pide con `GET /api/usuarios`, no dentro de la respuesta de empleado | `employees` no puede conocer a `accounts`: la dependencia va en un solo sentido |

### Fuera de este sprint (deuda técnica)

- **Límite de intentos de login.** Además, con el rewrite de Vercel todas las
  peticiones llegan con la misma IP, y un límite por IP mal configurado
  bloquearía a todos.
- **Detección de reuso del refresh token** (revocar toda la sesión si llega un
  token ya usado). Con dos pestañas abiertas daría falsos positivos.
- **Cambio de contraseña por el propio usuario.**
- **Verificación del email al registrarse.**
- **Limpieza de sesiones vencidas** de la tabla.
- **Nombre del Cliente en la sesión (`/me`).** Para empleados el nombre y el
  apellido ya vienen en el login y la renovación. Para clientes no: con la
  matriz de permisos el cliente no puede consultar sus propios datos
  (`GET /customers/:id` está cerrado para él). Si la pantalla del cliente lo
  necesita, hace falta `GET /customers/me`, resuelto con `@CurrentUser()`
  (que trae `customerId`). No crea ciclos ni copias de datos. Pendiente: la
  pantalla del cliente todavía no está definida.
- **Ciclo `accounts` ↔ `customers`: decidido cómo evitarlo.** `AccountsService`
  ya depende de `CustomersService` (para chequear que el email de un empleado
  no esté registrado como cliente). Si el registro de clientes llamara a
  `accounts` desde `customers`, quedaría un ciclo. **Decisión:** el registro lo
  orquesta `accounts` (método `registerCustomer`, que crea el cliente y su
  cuenta en una sola transacción) y `customers` nunca importa `accounts`: se
  entera por eventos. Falta que lo implemente quien tiene SCRUM-160.
- **Idioma de los mensajes de error.** El del login está en español; el resto
  del backend, en inglés. A unificar con el equipo.

### Limitaciones conocidas

- **Un email, una cuenta.** Una persona que sea empleada y clienta necesita un
  email distinto para cada rol.
- **Un empleado puede quedar sin poder tener cuenta.** `customers` verifica
  que un cliente no use el email de un empleado, pero no al revés: si un
  administrador carga un empleado con el email de un cliente que ya tiene
  cuenta, el conflicto aparece recién al crearle la cuenta. Como el email del
  empleado no se edita, hay que darlo de baja y cargarlo de nuevo.
- **Sin verificación de email.** Alguien puede registrarse con un email ajeno.

---
