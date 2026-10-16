# ADR 005 — El registro de clientes lo orquesta `accounts`

**Estado:** vigente según la documentación. **Falta verificar contra el código** que el flujo implementado
sea exactamente este (los docs de origen son de octubre de 2026 y el registro ya figura como
implementado en [registro de clientes](../funcionalidades/registro-de-clientes.md)).

## Contexto

`AccountsService` ya depende de `CustomersService` (para chequear que el email de un empleado no esté
registrado como cliente). Si el registro lo orquestara `customers` llamando a `accounts`, quedaría un
ciclo `accounts` ↔ `customers`.

## Decisión (opción "X")

`accounts.registerCustomer(...)` crea el cliente y su cuenta **en una sola transacción**:

1. `customersService.create(...)`, con las reglas de unicidad de `customers`.
2. Crea la cuenta (email + hash), con unicidad de email en `accounts`.

## Consecuencias

- `customers` nunca importa `accounts`. Se entera de lo que pasa por eventos.
- Si falla la cuenta no queda el cliente, y al revés.
- El endpoint es público (`@Public()`) y **no devuelve tokens**: después de registrarse, el cliente
  inicia sesión por el flujo normal.
- Una cuenta por email, sea de empleado o de cliente.
- Lo único de `customers` que se refleja en la cuenta es el **email**, vía el evento
  `customer.email-changed`.
