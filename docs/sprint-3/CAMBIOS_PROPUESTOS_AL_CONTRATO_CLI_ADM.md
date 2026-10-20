# Cambios propuestos al contrato (surgidos al implementar CLI-ADM, backend)

> **Para qué es este archivo.** Al implementar "Clientes del Administrador" (CLI-ADM) aparecieron puntos que
> el contrato (`API_CONTRACT_SPRINT_3.md`, §3.8) no define o define a medias. Se resolvieron con una
> decisión provisional para poder avanzar. **El contrato no se tocó**: lo cambia el equipo. Cada punto dice
> qué se hizo, dónde está en el código y qué habría que decidir.
>
> Escrito por Maga (con Claude) durante CLI-ADM, backend. Las decisiones marcadas "a pedido de Maga" las
> tomó Claude porque se le pidió que las definiera.

## 1. Editar un cliente inactivo (CA-CLI.6)

- **Qué dice el contrato:** "Dado un cliente inactivo, cuando se intenta editarlo, entonces no se permite"
  (historia) y "deja de aceptarse sobre clientes inactivos de forma definitiva" (§1). No da status, `code`
  ni mensaje.
- **Qué se hizo (a pedido de Maga):** `409` con `code` `CUSTOMER_INACTIVE` y el mensaje "El cliente está
  dado de baja.". El código ya figura en la tabla de errores del contrato (§5) y el mensaje es el que el
  contrato usa para ese mismo código en §3.5.
- **Dónde:** `backend/src/customers/domain/errors/customer-inactive.error.ts`.
- **A decidir:** agregar este caso a la fila `CUSTOMER_INACTIVE` de la §5 ("Operar puntos o consumos sobre
  un cliente dado de baja" → también editarlo).

## 2. `q` junto con `name` (§3.8.1)

- **Qué dice el contrato:** responde `400`. No da el mensaje ni `code`.
- **Qué se hizo (a pedido de Maga):** `400` sin `code`, mensaje "No se puede buscar por q y por name a la
  vez.". Se valida en `CustomersService.list`. Los DTO no pueden validar entre campos sin una regla propia.
- **Dónde:** `backend/src/customers/domain/errors/search-conflict.error.ts`.
- **A decidir:** el texto, y si lleva `code`.

## 3. `FORBIDDEN_FIELD`: mensaje (§3.8.2, §5)

- **Qué dice el contrato:** el Cajero que manda `documentType` o `documentNumber` recibe `403
  FORBIDDEN_FIELD`. El texto no está en la tabla de errores; sí dice que la pantalla del Cajero ya muestra
  "El documento no se puede modificar.".
- **Qué se hizo (a pedido de Maga):** ese mismo texto como `message`. Se valida **antes** que el resto
  (también antes de buscar al cliente), así que un Cajero que manda el documento recibe `403` aunque el
  cliente no exista o esté inactivo.
- **Dónde:** `backend/src/customers/domain/errors/forbidden-field.error.ts`.
- **A decidir:** el texto, y si el `404`/`409` debe ganarle al `403`.

## 4. `reason` faltante: sin `code` (§3.8.2)

- **Qué dice el contrato:** si el Administrador lo omite, `400` "Indicá el motivo del cambio para
  continuar.". No hay `code`.
- **Qué se hizo (a pedido de Maga):** `400` con ese mensaje y sin `code`. Un `reason` en blanco (solo
  espacios) cuenta como omitido. El `reason` se recorta antes de validar (el contrato dice "sin espacios en
  los extremos"; se interpretó como "se recortan", no como "se rechazan"). Más de 500 caracteres: `400`
  "El motivo no puede superar los 500 caracteres." (texto inventado: el contrato no lo da).
- **Dónde:** `reason-required.error.ts` y `update-customer.dto.ts`.
- **A decidir:** si `reason` lleva `code`; el texto del límite de 500; y si "sin espacios en los extremos"
  es "recortar" o "rechazar".

## 5. Un `PATCH` con solo `reason`

- **Qué dice el contrato:** nada. `reason` es el motivo de un cambio.
- **Qué se hizo (a pedido de Maga):** si no viene ningún dato del cliente a modificar, `400` (el mensaje
  existente, en inglés: "At least one field must be provided"). `reason` no cuenta como dato.
- **Dónde:** `CustomersService.update`.
- **A decidir:** si ese mensaje se pasa a castellano (es de Sprint 2, no se tocó).

## 6. Evento nuevo `customer.document-changed` (CA-CLI.7)

- **Qué dice el contrato:** si el Administrador corrige el documento de un cliente con
  `mustChangePassword = true`, la contraseña inicial pasa a ser el documento nuevo, en la misma
  transacción. No dice cómo se entera `accounts` (customers no importa accounts, ADR 005).
- **Qué se hizo (a pedido de Maga, autorizado):** evento nuevo `customer.document-changed` con
  `{ customerId, documentNumber }` (documento ya normalizado). Se publica solo si el número cambió (no si
  cambia solo el tipo). `accounts` guarda el hash solo si la cuenta todavía tiene `mustChangePassword =
  true`; si el cliente ya cambió la contraseña, no se toca.
- **Dónde:** `shared/events/domain-events.ts`, `accounts/application/customer-account-sync.service.ts` y
  `customer-events.listener.ts`.
- **A decidir:** sumar el evento a la lista de eventos del contrato (§8.4).

## 7. Nivel y saldo en el listado: lectura directa de `customer_points` (CA-CLI.1)

- **Qué dice el contrato:** cada ítem de `GET /customers` suma `balance`, `lifetimePoints` y `level`. No
  dice de dónde sale. `customers` no depende de `points` (`backend/CLAUDE.md` §3).
- **Qué se hizo (a pedido de Maga):** el repositorio de `customers` lee `customer_points` y la
  configuración vigente directo con Prisma (un solo `include`, sin una consulta por cliente) y calcula el
  nivel con `calculateLevel`, la función pura de `points/domain/level.ts`. No se importa `PointsModule` ni
  se tocó código de `points`. El filtro `level` se hace en la misma consulta. Sin fila en `customer_points`
  el cliente tiene todo en 0 y es Bronce.
- **Sin configuración activa:** rigen los umbrales por defecto (300 y 800, `CLAUDE.md` raíz §6) en vez de
  devolver `500`.
- **Dónde:** `backend/src/customers/infrastructure/customers.repository.ts`.
- **A decidir:** si `customers` puede depender de `points` por import (hoy solo importa un tipo y una
  función pura de su dominio), o si conviene un método de lista en `PointsService`.

## 8. "Saldo perdido" de la baja (§3.9.3)

- **Qué dice el contrato:** `Saldo perdido: {n} pts`. Era una fila pendiente de US-57
  (`CAMBIOS_PROPUESTOS_AL_CONTRATO_US57.md`, §2).
- **Qué se hizo (a pedido de Maga):** es el saldo (`customer_points.balance`) al momento de la baja, leído
  dentro de la misma transacción. Con puntos de miles (`1.250 pts`), `0 pts` si nunca tuvo movimientos y
  con signo si es negativo (`-30 pts`).
- **Dónde:** `customerDeactivatedEntry` en `audit/domain/audit-entries.ts` (se agregó el parámetro
  `lostBalance`; es código de US-57) y `CustomersService.deactivate`, que ahora devuelve el saldo.
- **A decidir:** cómo se muestra un saldo negativo perdido.

## 9. Se quita la reactivación de clientes (CA-CLI.10)

- **Qué dice el contrato:** `PATCH /customers/:id/activate` se elimina (404). `ACTIVATED` "queda para
  filas viejas" (§7, #7).
- **Qué se hizo (a pedido de Maga):** se borró la ruta, `CustomersService.activate`, `Customer.activate()` y
  sus tests. Se dejó el valor `ACTIVATED` en `CustomerStatusAction` y el evento `customer.reactivated`
  declarado en `domain-events.ts` (sin uso). Se sacó el test de `accounts.service.spec.ts` que probaba que
  un cliente reactivado volvía a entrar, y la entrada `activate` de `endpoint-permissions.e2e-spec.ts`.
- **A decidir:** si se borra también el evento `customer.reactivated` y el valor `ACTIVATED` del enum.

## 10. Orden por apellido y acentos

- **Qué dice el contrato:** `sort=lastName` ordena por apellido, nombre e `id`. No define la *collation*.
- **Qué pasa:** el orden lo hace la base. En la base de tests (`postgres:16-alpine`, ordena por bytes) un
  apellido con tilde ("Álvarez") queda **después** de "Pérez" y las mayúsculas van antes que las
  minúsculas. En otra base (por ejemplo Neon) puede dar otro orden.
- **Qué se hizo:** nada. Los e2e usan apellidos sin tilde para no depender de esto.
- **A decidir:** si hace falta ordenar sin distinguir tildes ni mayúsculas, y cómo (collation por columna o
  `ORDER BY` con `COLLATE` en SQL; Prisma no lo permite en `orderBy`).
