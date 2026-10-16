# Dominio: programa de puntos (configuración)

Reglas de negocio, sin HTTP. Para el contrato REST y la guía de integración ver
[configuración de puntos](../funcionalidades/configuracion-de-puntos.md).

## Alcance

El módulo **almacena reglas**. **No** calcula ni acredita puntos, no aplica bonificaciones a compras ni
procesa vencimientos: eso queda para futuros casos de uso de compras (RF-020).

## Las tres reglas

| Regla | Campos | Validación |
|---|---|---|
| Equivalencia monto/puntos | `baseAmount`, `pointsAwarded` | `baseAmount` > 0, máximo 2 decimales, máximo 9.999.999.999,99. `pointsAwarded` entero > 0, máximo 2.147.483.647 |
| Vigencia de puntos | `pointsExpirationMonths` | Entero entre 1 y 2.147.483.647. Omitido, `null` o vacío se normaliza al **default de 12 meses (RF-010)**. Se mide desde que los puntos se acreditan |
| Bonificación de primera compra | `bonusType`, `bonusValue` | `PERCENTAGE`: 1 a 100, hasta 2 decimales. `FIXED_AMOUNT`: entero de 1 a 10.000 puntos |

El mínimo de 1 % para porcentajes es reciente (migración `set_percentage_bonus_minimum_to_one`).

## Versionado (RF-014)

- La configuración completa es una **versión inmutable**. Una sola versión activa a la vez.
- Cada guardado, completo o seccional, crea una versión nueva y copia sin cambios los demás valores
  vigentes. No se reescriben versiones anteriores.
- Los movimientos futuros deberán tomar un snapshot de la versión vigente; las limitaciones respecto a eso
  están en la sección "Garantía y límite respecto a movimientos pasados" del contrato.

## Moneda

La API no guarda código de moneda ni convierte. La unidad debe ser consistente en todas las compras que
usen la equivalencia.

## Auditoría

La configuración **no guarda `updatedBy`**. El contrato original lo dejaba pendiente de la autenticación,
que ya existe (`@CurrentUser()` entrega `accountId`). **No determinado** si se agregó.

## Permisos

Solo `ADMIN`. Ver [roles y permisos](../conceptos-transversales/roles-y-permisos.md).
