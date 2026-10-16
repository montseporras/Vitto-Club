# Deuda técnica, limitaciones y riesgos aceptados

Consolidado de `contexto-proximo-chat` (secciones 7 y 10), `autenticacion` (secciones 10 y 11),
`transacciones-y-eventos` (sección 10) y `accounts-abmc-status`. Cada ítem trae su origen. La columna
**Estado** dice lo que pude verificar; lo marcado "sin verificar" viene de documentos de octubre de 2026.

## Limitaciones aceptadas (para documentar en la entrega)

| Limitación | Origen | Estado |
|---|---|---|
| Un email, una cuenta: una persona empleada y clienta necesita un email distinto por rol | autenticación | Vigente |
| Un empleado puede quedar sin poder tener cuenta si se carga con el email de un cliente que ya tiene cuenta (se detecta recién al crear la cuenta; el email del empleado no se edita) | accounts | Vigente |
| Sin verificación de email: alguien puede registrarse con un email ajeno | autenticación | Vigente |
| Una baja o un cambio de rol tarda hasta 15 minutos en aplicarse (access token ya emitido) | autenticación | Vigente |

## Seguridad

| Ítem | Detalle | Estado |
|---|---|---|
| Límite de intentos de login | Con el rewrite de Vercel todas las peticiones llegan con la misma IP: un límite por IP mal configurado bloquearía a todos | Pendiente |
| Detección de reuso del refresh token | Con dos pestañas daría falsos positivos | Pendiente |
| Cambio de contraseña por el propio usuario | A llevar como historia nueva | Pendiente |
| Verificación de email al registrarse | | Pendiente |
| El Administrador inicial: quien corre el seed conoce su contraseña y no hay forma de cambiarla | | Pendiente |
| Limpieza de sesiones vencidas | La tabla `sessions` crece | Pendiente |
| `npm audit` avisa vulnerabilidades en dependencias | No se revisaron | Pendiente |

## Backend

| Ítem | Detalle | Estado |
|---|---|---|
| `customers.repository.ts` usa `prisma.$transaction([...])` y `PrismaService` directo | Hay que reescribirlo para usar `client` cuando participe de una transacción ambiente | Sin verificar |
| Publicar `customer.deactivated`, `customer.reactivated`, `customer.email-changed` desde `customers` | Están en el contrato de eventos; `accounts` ya tiene el listener de `email-changed` | Sin verificar |
| `GET /api/customers/me` y `GET /api/empleados/me` | Solo si el frontend necesita el nombre del usuario. Para clientes el nombre no viene en el login | Pendiente de decisión |
| Código de error `CUSTOMER_INACTIVE` para "cliente dado de baja intenta entrar" | Pendiente del PO | Pendiente |
| Idioma de los mensajes de error: login en español, el resto en inglés | A unificar con el equipo | Pendiente |
| Bloque `"prisma": { "seed": … }` duplicado en `backend/package.json` (el seed se configura en `prisma.config.ts`) | | Sin verificar |
| Probar transacciones contra Neon | Solo se probó contra Postgres local | Pendiente |
| CORS fijo en `http://localhost:5173` (`backend/src/main.ts`) | Pasarlo a variable de entorno | Sin verificar |
| `loyalty` sin `updatedBy` (auditoría del actor) | Quedó pendiente de la autenticación | Sin verificar |

## Infraestructura y proceso

| Ítem | Detalle | Estado |
|---|---|---|
| No hay CI | Los tests corren solo en local | Vigente según README |
| Rewrite de Vercel hacia Render para que la cookie del refresh token sea de primera parte | El frontend confirmó que se puede; falta crear los proyectos y el `vercel.json` | Sin verificar |
| Variables en producción: `NODE_ENV=production`, `JWT_SECRET` propio de 32+ caracteres, `BCRYPT_COST` | Sin `NODE_ENV=production` la cookie no sale `Secure` | Sin verificar |
| Quién corre el seed del Administrador contra Neon | "Falta definir quién tiene acceso" | Sin definir |
| El frontend debe subir el timeout de axios (8 s) por el arranque lento de Render | | Sin verificar |

## Frontend

| Ítem | Detalle | Estado |
|---|---|---|
| Pantalla de administración de clientes (listado y historial de estados) | `GET /customers` y `GET /customers/:id/status-history` existen y no tienen pantalla | Pendiente de decisión |
| Reglas de manejo de sesión en el frontend (renovar solo ante 401, un solo refresh a la vez, access token en memoria, decidir por `code`) | Ver [autenticación](../funcionalidades/autenticacion.md) | Sin verificar |

## Documentación

Inconsistencias detectadas al reordenar. Ver [estado actual](./estado-actual.md#inconsistencias-de-documentación-detectadas).
