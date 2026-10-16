# Estado actual

> **Escrito al reordenar la documentación (2026-10-15) a partir de documentos de traspaso del 5 y 6 de
> octubre.** Lo que no pude verificar contra el código está marcado. No es una foto en vivo: confirmar
> el estado de las ramas con `git`.

## Qué existe (confirmado en el código)

| Módulo backend | Notas |
|---|---|
| `customers`, `employees`, `loyalty` | Sprint 1. Contratos en [funcionalidades](../funcionalidades/) |
| `accounts` | Controller `/api/usuarios` con `@Roles('ADMIN')`, registrado en `AppModule` |
| `auth` | `POST /api/auth/login`, `/refresh`, `/logout` (públicos); guards globales |
| `shared/events`, `shared/security` | Contratos transversales |
| `prisma`, `health` | Infraestructura |

Frontend: carpetas de feature `audit`, `auth`, `cashier`, `customers`, `employees`, `levels`, `missions`,
`my-account`, `notifications`, `points`, `rewards`, `statistics`. Según el README raíz, varias existen solo
como carpetas vacías; **no verifiqué cuáles tienen código**.

## Hechos que figuran en los docs de traspaso

- Login de empleados y guards globales: integrados (paso E del bloque de autenticación).
- Registro de clientes (`POST /api/auth/register`): documentado como implementado en
  [registro de clientes](../funcionalidades/registro-de-clientes.md).
- Reactivación de cuenta y e2e de aceptación de `accounts`: hechos.
- Último conteo de tests informado (2026-10-06): 457 unitarios y 73 e2e. **No se reejecutaron.**

## Preguntas abiertas

1. ¿`feature/auth-login`, `users` y `spike/transacciones` ya están en `develop`? Los docs hablaban de un
   orden de merges; no tengo acceso a git (la carpeta no es un repositorio).
2. ¿Existe el `vercel.json` y están desplegados los proyectos de Vercel y Render?
3. ¿`customers` ya publica los eventos `customer.*`?
4. ¿El contrato `GET /api/usuarios` y `code: LAST_ADMIN` están en el backend integrado?

## Inconsistencias de documentación detectadas

| Dónde | Qué dice | Qué pasa realmente |
|---|---|---|
| [configuración de puntos](../funcionalidades/configuracion-de-puntos.md), sección "Estado de disponibilidad" | Los endpoints responden 401 hasta que se integre autenticación | Los controllers usan `@Roles('ADMIN')` con guards globales: la autenticación ya está integrada. **Reescribir esa sección** |
| [arquitectura](../architecture/arquitectura.md) (módulo `loyalty`) | El guard "requiere que la futura integración de autenticación establezca `request.user.role`" | Ídem |
| [clientes](../funcionalidades/clientes.md), sección de conexión | "El frontend todavía no tiene proxy de Vite ni cliente HTTP" | [SETUP](../SETUP.md) §3.2 documenta el proxy y existe `src/shared/api/http.ts` según otros docs |
| [autenticación (funcionalidad)](../funcionalidades/autenticacion.md) | Algunos avisos "esta rama llega a `develop`" | Reescribir como estado actual |
| [autenticación y sesiones](../conceptos-transversales/autenticacion-y-sesiones.md), estado | "Los clientes todavía no pueden iniciar sesión" | [registro de clientes](../funcionalidades/registro-de-clientes.md) dice que sí |
| [accounts-vs-rama-scrum-160](./historico/accounts-vs-rama-scrum-160.md) | Documento y email únicos entre todos los clientes (opción B) | Revertido el 2026-10-08. Ver [ADR 006](../decisions/006-unicidad-documento-y-email-de-clientes.md) |
| [transacciones y eventos](../conceptos-transversales/transacciones-y-eventos.md), estado y sección 10 | "Ningún repositorio lo usa todavía" / `AccountsModule` no registrado | `employees` y `accounts` ya lo usan y `AccountsModule` está en `AppModule` |
| [CONTRIBUTING](../CONTRIBUTING.MD) | Ejemplo de rama `feature/TC-12-openapi-schema-quotes` | Los tickets del proyecto son `SCRUM-xxx` |
| `README.md` raíz, estructura | `app.module.ts` lista solo "Config, Prisma, Health, Customers, Employees, Loyalty"; `seed.ts` "3 employees, 2 customers" | `AppModule` ya importa `AccountsModule` y `AuthModule` |

## Historial

Los documentos de traspaso originales están en [historico](./historico/).
