# Errores y códigos

El frontend decide **por el campo `code`**, nunca por el texto del mensaje.

## Códigos de autenticación y autorización

| HTTP | `code` | Cuándo |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Cualquier fallo de login (mismo mensaje siempre: no revela la causa) |
| 401 | `INVALID_SESSION` | Cualquier fallo de renovación |
| 401 | `UNAUTHENTICATED` | Endpoint protegido sin token, o token vencido |
| 403 | `FORBIDDEN` | Hay sesión, pero el rol no alcanza |

## Código de negocio

| HTTP | `code` | Cuándo |
|---|---|---|
| 409 | `LAST_ADMIN` | La operación dejaría al sistema sin ningún administrador disponible (empleado activo, rol `ADMIN` y cuenta activa) |

`LAST_ADMIN` se pidió en [baja de usuario SCRUM-27](../seguimiento/pedidos/baja-usuario-SCRUM-27.md).
**Estado de implementación: no verificado** en esta revisión. Hay que confirmar que los dos
`ConflictException` de `AccountsService` lo incluyan.

## Formato de la respuesta

Los filtros de excepciones de cada módulo (`customers`, `employees`, `accounts`, `auth`) arman el cuerpo:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "…",
  "path": "/api/usuarios/1/deactivate",
  "timestamp": "2026-10-13T15:00:00.000Z",
  "code": "LAST_ADMIN"
}
```

- `code` aparece solo cuando el error lo trae.
- Los errores de validación (400) incluyen más detalle; ver el contrato de cada módulo en
  [funcionalidades](../funcionalidades/).
- El backend rechaza con 400 cualquier campo del body que no esté documentado
  (`property foo should not exist`).

## Regla para filtros de módulo

Cada módulo tiene su propio filtro. Los guards pueden devolver 401 y 403 en cualquier módulo, así que
**cada filtro debe conocer el 403 y dejar pasar `code`**; si no, el 403 sale como `"error": "Error"` y
sin código.

## Deuda conocida

Los mensajes están mezclados: el del login en español, el resto en inglés. Ver
[deuda técnica](../seguimiento/deuda-tecnica.md).
