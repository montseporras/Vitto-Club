# Errores y códigos

El frontend decide **por el campo `code`**, nunca por el texto del mensaje. `message` puede ser un
`string` o un `string[]` (errores de validación del DTO).

Los textos exactos de cada caso están en los contratos: `docs/sprint-3/API_CONTRACT_SPRINT_3.md` §5 y
`docs/sprint-4/API_CONTRACT_SPRINT_4.md` §5. Esta tabla junta todos los `code` que existen en el código de
`develop` (09/11/2026).

## Códigos de autenticación y autorización

| HTTP | `code` | Cuándo | Desde |
|---|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Cualquier fallo de login (mismo mensaje siempre: no revela la causa) | Sprint 2 |
| 401 | `INVALID_SESSION` | Cualquier fallo de renovación | Sprint 2 |
| 401 | `UNAUTHENTICATED` | Endpoint protegido sin token, o token vencido. El frontend renueva la sesión y repite una sola vez | Sprint 2 |
| 403 | `FORBIDDEN` | Hay sesión, pero el rol no alcanza. No se reintenta ni se audita | Sprint 2 |

## Códigos de negocio

| HTTP | `code` | Cuándo | Desde |
|---|---|---|---|
| 409 | `LAST_ADMIN` | La operación dejaría al sistema sin ningún administrador disponible (empleado activo, rol `ADMIN` y cuenta activa). Mensaje: "Esta operación dejaría al sistema sin un administrador disponible." | Sprint 2 ([pedido SCRUM-27](../seguimiento/pedidos/baja-usuario-SCRUM-27.md)) |
| 409 | `EMAIL_IN_USE` | Email en uso por otro cliente o empleado activo, o por otra cuenta activa (alta de cliente con cuenta, cambio de email, reactivación de usuario) | Sprint 3 |
| 400 | `CURRENT_PASSWORD_INCORRECT` | Cambio de contraseña o de email con la contraseña actual mal. Es `400` y no `401` para que el frontend no intente renovar la sesión | Sprint 3 |
| 400 | `PASSWORD_SAME_AS_CURRENT` | Nueva contraseña igual a la actual | Sprint 3 |
| 400 | `PASSWORD_SAME_AS_DOCUMENT` | Cliente: nueva contraseña igual a su número de documento | Sprint 3 |
| 429 | `TOO_MANY_ATTEMPTS` | Demasiadas contraseñas actuales incorrectas (5 en 15 minutos por cuenta, en memoria; decisión S3-29) | Sprint 3 |
| 403 | `VOID_NOT_ALLOWED` | Cajero anulando un consumo ajeno o con más de 24 h | Sprint 3 |
| 403 | `FORBIDDEN_FIELD` | Intento de cambiar el documento de un cliente. Mensaje: "El documento no se puede modificar." Se valida antes que el `404` y el `409` | Sprint 3 |
| 409 | `CUSTOMER_INACTIVE` | Operar puntos, consumos o canjes de un cliente dado de baja, o editarlo. Mensaje: "El cliente está dado de baja." | Sprint 3 (casos nuevos en el Sprint 4) |
| 409 | `CONSUMPTION_ALREADY_VOIDED` | Anular un consumo ya anulado. Se evalúa **antes** que `VOID_NOT_ALLOWED` (decisión S3-02) | Sprint 3 |
| 409 | `POINTS_EQUIVALENCE_NOT_CONFIGURED` | Registrar o previsualizar un consumo sin equivalencia configurada | Sprint 3 |
| 409 | `INSUFFICIENT_BALANCE` | Ajuste "Restar" mayor que el saldo (Sprint 3). Registrar el uso de un canje sin saldo suficiente o con saldo negativo (Sprint 4): "El cliente no tiene saldo suficiente para este canje. Podés rechazarlo." | Sprint 3 |
| 409 | `REWARD_NAME_IN_USE` | Nombre de recompensa repetido entre las no dadas de baja. "Ya existe una recompensa con ese nombre." | Sprint 4 |
| 409 | `STOCK_BELOW_CONFIRMED` | Stock menor que los canjes confirmados vigentes. "El stock no puede ser menor a los {n} canjes confirmados." | Sprint 4 |
| 409 | `INVALID_REWARD_STATUS` | Activar una que no está Inactiva, o desactivar una que ya lo está | Sprint 4 |
| 409 | `REWARD_NOT_AVAILABLE` | Confirmar o usar un canje con la recompensa no disponible | Sprint 4 |
| 409 | `REDEMPTION_NOT_CONFIRMED` | Usar, rechazar o cancelar un canje que ya no está Confirmado. 'El canje ya está en estado "{Estado}".' (Cliente: "El canje ya no se puede cancelar.") | Sprint 4 |
| 409 | `REDEMPTION_EXPIRED` | Usar, rechazar o cancelar un canje vencido. "El canje venció. El cliente tiene que pedirlo de nuevo." (Cliente: "El canje ya venció.") | Sprint 4 |
| 400 | `INVALID_IMAGE` | Subir una imagen que no es JPG, PNG o WebP **por su contenido** (un PDF renombrado a `.jpg` se rechaza), o que pesa más de 2 MB. "Usá una imagen JPG, PNG o WebP de hasta 2 MB." Se valida antes de subir a Cloudinary. Es un `HttpException` con `code`: `InvalidImageException` en `images/application/` | Sprint 5 (BASE-5) |

> Los demás códigos del Sprint 5 (`MISSION_NAME_IN_USE`, `MISSION_NOT_CLAIMABLE`, `NOTIFICATION_DISABLED`,
> `NOTIFICATION_NOT_RESENDABLE` y `PROMOTION_SEND_NOT_CANCELLABLE`) se documentan acá cuando los agregue la
> historia que los lanza. Hoy el único que existe en el código es `INVALID_IMAGE`.

### Errores sin `code`

Se reconocen por el HTTP. Los más usados:

| HTTP | Mensaje | Dónde |
|---|---|---|
| 400 | Validaciones de DTO, en castellano en todo lo del Sprint 3 en adelante | Todos los módulos |
| 400 | `property X should not exist` | Cualquier campo del body que no esté en el contrato (`forbidNonWhitelisted`) |
| 404 | "No existe el cliente." | `GET /customers/:id/canjes` (decisión de US-45) |
| 404 | "No existe la recompensa." | Recompensa inexistente o dada de baja |
| 404 | "Código no encontrado." | Canje inexistente o mal escrito, para empleados |
| 404 | "No existe el canje." | Canje inexistente, mal escrito o de otro cliente, para el Cliente |
| 500 | "Unexpected error." | Inesperado |

## Formato de la respuesta

Cada módulo tiene su propio filtro de excepciones (`<modulo>/http/filters/`) que arma el cuerpo:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "…",
  "path": "/api/usuarios/1/deactivate",
  "timestamp": "2026-10-13T15:00:00.000Z",
  "code": "LAST_ADMIN",
  "details": [{ "field": "reason", "message": "…" }]
}
```

- `code` aparece solo cuando el error lo trae.
- `details` aparece en los errores de reglas de dominio, para marcar el campo.
- El backend rechaza con 400 cualquier campo del body que no esté documentado.

## Regla para filtros de módulo

Cada módulo tiene su propio filtro. Los guards pueden devolver 401 y 403 en cualquier módulo, así que
**cada filtro debe conocer el 403 y dejar pasar `code`**; si no, el 403 sale como `"error": "Error"` y
sin código. Un módulo nuevo copia el filtro de uno existente (por ejemplo, `consumptions`).

## En el frontend

- Se usa `ApiError` y `toApiError` de `@/shared/api/ApiError`.
- Cada feature tiene su función de mensajes por `code` (por ejemplo,
  `features/cashier/api/consumption-errors.ts`).
- Cuando el contrato no da texto para un error, la pantalla muestra el `message` del backend (decisión de
  US-40, US-42 y US-43).

## Deuda conocida

Algunos mensajes de los módulos del Sprint 2 siguen en inglés ("At least one field must be provided",
"Customer with ID … is already inactive", "First consumption bonus has not been configured"). Es la D-11
del cierre del Sprint 3. Ver [deuda técnica](../seguimiento/deuda-tecnica.md).
