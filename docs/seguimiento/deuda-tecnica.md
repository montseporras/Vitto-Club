# Deuda técnica, limitaciones y riesgos aceptados

Consolidado de `contexto-proximo-chat` (secciones 7 y 10), `autenticacion` (secciones 10 y 11),
`transacciones-y-eventos` (sección 10), `accounts-abmc-status`, el cierre del Sprint 3 y las notas de cada
historia. Cada ítem trae su origen. **Revisado contra el código de `develop` el 09/11/2026.**

Lo que no coincide con los contratos de los Sprints 3 y 4 (no es deuda aceptada sino algo que falta hacer)
está en [estado actual](./estado-actual.md#lo-que-falta-o-no-coincide-con-los-contratos).

## Limitaciones aceptadas (para documentar en la entrega)

| Limitación | Origen | Estado |
|---|---|---|
| Un email, una cuenta: una persona empleada y clienta necesita un email distinto por rol | autenticación | Vigente |
| Un empleado puede quedar sin poder tener cuenta si se carga con el email de un cliente que ya tiene cuenta (se detecta recién al crear la cuenta; el email del empleado no se edita) | accounts | Vigente |
| Sin verificación de email: alguien puede registrarse con un email ajeno | autenticación | Vigente |
| Una baja o un cambio de rol tarda hasta 15 minutos en aplicarse (access token ya emitido) | autenticación | Vigente |
| No hay reactivación de clientes ni de empleados: un cliente dado de baja pierde sus puntos y, si vuelve, se inscribe de nuevo | Decisión de Deni (contrato S3 §1) | Vigente |
| El límite de intentos de contraseña (`429 TOO_MANY_ATTEMPTS`) vive en la memoria del proceso: no sobrevive reinicios ni sirve con varias instancias | PERFIL (S3-29), D-15 | Vigente (una instancia en Render) |
| El saldo al confirmar un canje lo valida solo la pantalla, con el saldo que ya tenía cargado; la validación real es al registrar el uso | Decisión S4-2 | Vigente |
| Una recompensa vencida que el proceso diario todavía no marcó sigue figurando `ACTIVE`, pero no se puede canjear (la disponibilidad se calcula con la fecha) | US-37 | Vigente |
| Cuando el Sistema habilita o deshabilita una recompensa, cambia su `updatedAt` y sube en el listado del Administrador | US-37 §4 | Vigente (el contrato no lo define) |
| El orden por apellido no ignora tildes ni mayúsculas de forma especial (collation por defecto) | D-13 | Vigente |

## Seguridad

| Ítem | Detalle | Estado |
|---|---|---|
| Límite de intentos de login | Con el rewrite de Vercel todas las peticiones llegan con la misma IP: un límite por IP mal configurado bloquearía a todos | Pendiente (D-19) |
| Detección de reuso del refresh token | Con dos pestañas daría falsos positivos | Pendiente |
| Cambio de contraseña por el propio usuario | `PATCH /mi-cuenta/password` (PERFIL, Sprint 3) | ✅ Resuelto |
| Verificación de email al registrarse | | Pendiente (D-19) |
| El Administrador inicial: quien corre el seed conoce su contraseña | Ya la puede cambiar desde `PATCH /mi-cuenta/password`. La pantalla de "Mi perfil" de empleados no existe (D-08) | Parcial |
| Limpieza de sesiones vencidas | La tabla `sessions` crece | Pendiente (D-19) |
| `npm audit` avisa vulnerabilidades en dependencias | No se revisaron | Pendiente (D-19) |

## Backend

| Ítem | Detalle | Estado |
|---|---|---|
| `customers.repository.ts` con `prisma.$transaction([...])` y `PrismaService` directo | Ya usa `PrismaTransactionRunner` | ✅ Resuelto |
| Publicar `customer.deactivated`, `customer.email-changed` desde `customers` | Se publican; `customer.reactivated` queda declarado sin uso (D-12) | ✅ Resuelto |
| `GET /api/customers/me` | Existe (PERFIL). `GET /api/empleados/me` no existe ni se pidió | ✅ Resuelto |
| Código `CUSTOMER_INACTIVE` | Existe: operar o editar un cliente dado de baja. Un cliente dado de baja que intenta entrar recibe `401 INVALID_CREDENTIALS` (su cuenta está inactiva) | ✅ Resuelto |
| Idioma de los mensajes de error | Todo lo del Sprint 3 en adelante está en castellano. Quedan en inglés mensajes del Sprint 2 ("At least one field must be provided", "Customer with ID … is already inactive", los de `loyalty/domain`) | Pendiente (D-11) |
| Bloque `"prisma": { "seed": … }` duplicado en `backend/package.json` (el seed se configura en `prisma.config.ts`) | Sigue estando | Vigente |
| Probar transacciones contra Neon | Solo se probó contra Postgres local | Pendiente |
| CORS fijo en `http://localhost:5173` | ✅ Resuelto el 12/11 (ARRASTRE-S4): el origen sale de la variable `CORS_ORIGIN` (por defecto `http://localhost:5173`) | ✅ Resuelto (B7) |
| `loyalty` sin `updatedBy` | El actor queda en la auditoría (módulo Configuración) | ✅ Resuelto por US-56 |
| Anular un consumo con el lote ya vencido convierte todo en deuda (doble pérdida) | `points.service.ts`, `points-lot.ts` | Pendiente de decisión (D-06) |
| Un consumo que da 0 puntos | ✅ Resuelto el 12/11: se registra sin dejar movimiento, también al anularlo (opción a, decisión tomada a pedido de Montse; falta llevarla al contrato) | ✅ Resuelto (D-07) |
| Comentarios de `schema.prisma` que mencionan `CHECK` de la §3.12 | El trigger de solo inserción y los `CHECK` `points <> 0` y "motivo en `MANUAL_ADJUSTMENT`" de `points_movements` existen desde ARRASTRE-S4. **Siguen sin existir** los `CHECK` de las otras tablas (A-03) | Pendiente (A-03, parcial) |
| Evento `customer.document-changed`, su listener en `accounts` y `forbiddenField` | ✅ **Borrados el 14/11 (ARRASTRE-S4, A4-12):** quedaron sin emisor tras D-03 (nadie edita el documento). Queda sin uso `replaceInitialPasswordHash` (puerto y repositorio de cuentas de clientes) | Parcial |

## Infraestructura y proceso

| Ítem | Detalle | Estado |
|---|---|---|
| No hay CI | Los tests corren solo en local | Vigente |
| Rewrite de Vercel hacia Render para que la cookie del refresh token sea de primera parte | El frontend confirmó que se puede; falta crear los proyectos y el `vercel.json` | Sin verificar |
| Variables en producción: `NODE_ENV=production`, `JWT_SECRET` propio de 32+ caracteres, `BCRYPT_COST` | Sin `NODE_ENV=production` la cookie no sale `Secure` | Sin verificar |
| Quién corre el seed del Administrador contra Neon | "Falta definir quién tiene acceso" | Sin definir |
| El frontend debe subir el timeout de axios (8 s) por el arranque lento de Render | | Sin verificar |
| `main` no recibe `develop` desde septiembre | Definir cuándo se pasa | Pendiente (D-35) |
| Prototipo: el archivo único no coincide con `v2/` y falta `scripts/desempaquetar_prototipo.py` | `docs/prototipo/v2/LEEME.md` | Pendiente (D-37) |

## Frontend

| Ítem | Detalle | Estado |
|---|---|---|
| Pantalla de administración de clientes | Hecha (CLI-ADM). `GET /customers/:id/status-history` sigue sin pantalla | Parcial (D-18) |
| Tests automatizados | Vitest y Testing Library no están instalados | ✅ Decidido (D-17, S5-30): no se suman; el frontend se verifica con el recorrido manual con mocks y el CI corre lint y build |
| `Modal` no se cierra con Escape | Cada modal agrega su propio listener (`useEscapeKey` en `redemptions`) | Pendiente |
| Componentes sin uso de `features/cashier` (`CustomerSummary`, `EditCustomerForm`, `useUpdateCustomer`) | Se borraron el 09/11 (`fix/cerrar-sprint4`) | ✅ Resuelto |
| Saldos de los mocks del Cliente y de Caja independientes | Solo afecta el recorrido con mocks | Vigente |
| Reglas de manejo de sesión en el frontend (renovar solo ante 401, un solo refresh a la vez, access token en memoria, decidir por `code`) | Ver [autenticación](../funcionalidades/autenticacion.md) | Sin verificar |

## Documentación

Las inconsistencias detectadas en octubre se corrigieron el 09/11/2026. Lo que queda está en
[estado actual](./estado-actual.md).
