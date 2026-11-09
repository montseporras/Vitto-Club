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

- La baja es **lógica** y queda en el historial (`customer_status_changes`). **No hay reactivación de
  clientes** (decisión de Deni, contrato S3 §1): si vuelve, se inscribe como cliente nuevo y empieza de cero.
- Dar de baja a un inactivo responde 409.
- **Un cliente inactivo no se puede modificar** (`409 CUSTOMER_INACTIVE`, S3-12), ni registrarle consumos,
  ajustes ni canjes.
- Al darlo de baja: su saldo se pierde (queda en la auditoría como "Saldo perdido"), su cuenta queda
  inactiva con las sesiones cerradas y sus canjes Confirmados se rechazan (Sprint 4).
- La búsqueda por documento también devuelve inactivos (hay que revisar `active`). Si hay varios con
  el mismo documento, devuelve el activo; si ninguno está activo, el inactivo más reciente. En Caja, un
  cliente dado de baja se trata como no encontrado.
- **Nadie edita el documento** (decisión D-03 del 25/10): ni el Cajero ni el Administrador.

## Cuenta del cliente

- **Autorregistro:** se crea junto con el cliente, en una sola transacción
  ([ADR 005](../decisions/005-registro-de-clientes-orquestado-por-accounts.md)). No se audita.
- **Alta en caja o por el Administrador (US-17-AJ):** `customers` publica `customer.created` y `accounts`
  crea la cuenta con **contraseña inicial = número de documento** y `mustChangePassword = true`. Al
  ingresar aparece la ventana "Cambiá tu contraseña", con "Ahora no" (S3-34).
- El cliente inicia sesión con **email + contraseña**; el documento solo sirve para buscarlo en caja.
- Cambiar el email del cliente se refleja en la cuenta (`customer.email-changed`). Desde Mi perfil, el
  cambio de email pide la contraseña actual (`customer.email-change-requested`, decisión #10).
- **Contraseña del cliente:** entre 8 y 64 caracteres, como máximo 72 bytes, distinta del email, distinta
  de la actual y distinta de su documento.

## Lo que el Cliente hace sobre sí mismo

- Ve y edita su teléfono, correo y fecha de nacimiento (`/customers/me`). No edita nombre, apellido ni
  documento.
- Cambia su contraseña (`/mi-cuenta/password`) y cierra sesión.
- Nada de eso se audita.

## Permisos

Administrador y Cajero buscan, dan de alta y consultan clientes. Editar y dar de baja es **solo del
Administrador** desde el 25/10 (D-02; el backend lo cumple desde el 09/11). El Cliente solo opera
`/customers/me…`. Ver [roles y permisos](../conceptos-transversales/roles-y-permisos.md).

## Preguntas abiertas

- ¿El listado por defecto debe filtrar activos en el backend o lo pide siempre el frontend con
  `?active=true`? (sin decidir desde el Sprint 1).
- `GET /customers/:id/status-history` no tiene pantalla (D-18): ¿se mantiene o se quita?
