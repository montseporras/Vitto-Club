# Dominio: clientes

Reglas de negocio, sin HTTP. Para el contrato REST ver [clientes](../funcionalidades/clientes.md).

## Datos

| Campo | Regla |
|---|---|
| Nombre y apellido | Obligatorios |
| Tipo y número de documento | Obligatorios. Tipos: `DNI` o `PASSPORT`; el formato se valida según el tipo |
| Email | Obligatorio; se guarda en minúsculas |
| Teléfono | Opcional |
| Fecha de nacimiento | Opcional |

## Unicidad

- **Documento** (tipo + número) y **email** son únicos **solo entre clientes activos**. Decisión final del
  PO, 2026-10-08. Ver [ADR 006](../decisions/006-unicidad-documento-y-email-de-clientes.md).
- Un cliente dado de baja perdió sus puntos y se inscribe como cliente nuevo si vuelve.
- El email de un cliente tampoco puede coincidir con el de un empleado (409).
- Crear o editar con un documento o email en uso por otro cliente activo responde 409.

## Estado

- Baja y reactivación son **lógicas** y quedan en el historial (`customer_status_changes`).
- Dar de baja a un inactivo, o reactivar a un activo, responde 409.
- **Un cliente inactivo no se puede modificar**: hay que reactivarlo primero (409). Al momento de
  escribir esto, la propia documentación dejaba abierto si ese es el comportamiento esperado.
- La búsqueda por documento también devuelve inactivos (hay que revisar `active`). Si hay varios con
  el mismo documento, devuelve el activo; si ninguno está activo, el inactivo más reciente.

## Cuenta del cliente

- Se crea en el registro, junto con el cliente, en una sola transacción
  ([ADR 005](../decisions/005-registro-de-clientes-orquestado-por-accounts.md)).
- El cliente inicia sesión con **email + contraseña**; el documento solo sirve para buscarlo en caja.
- Cambiar el email del cliente debe reflejarse en la cuenta (evento `customer.email-changed`).
  **No determinado** en esta revisión si `customers` ya lo publica.

## Permisos

Administrador y Cajero operan el módulo; el Cliente recibe 403. Ver
[roles y permisos](../conceptos-transversales/roles-y-permisos.md).

## Preguntas abiertas que figuran en los docs

- ¿El listado por defecto debe filtrar activos en el backend o lo pide siempre el frontend con
  `?active=true`?
- ¿Es correcto bloquear la modificación de un cliente inactivo?
- La pantalla del cliente que muestre su nombre necesitaría `GET /customers/me` (no existe).
