# Plantilla: documento de funcionalidad (contrato de API para el frontend)

Copiar a `docs/funcionalidades/<nombre>.md`. Basada en la forma de los contratos existentes
(clientes, empleados, autenticación).

```markdown
# API de <Nombre> — guía para el frontend

> **Estado:** qué está implementado y verificado, y qué no.

## 1. Conexión

| | |
|---|---|
| **URL base** | `/api` |
| **Formato** | JSON |
| **Autenticación** | Obligatoria / pública. Roles que pueden usarlo |

## 2. Endpoints

| Método y ruta | Qué hace | Respuesta | Errores |
|---|---|---|---|

## 3. Campos y validaciones

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|

## 4. Respuestas y errores

Ejemplos de cuerpo. Errores por `code`, no por el texto del mensaje.

## 5. Reglas de negocio que el frontend debe respetar

Enlazar a `docs/domain/<nombre>.md` en lugar de repetirlas.

## 6. Guía de integración

Flujos de pantalla, estados de carga, casos borde.

## 7. Preguntas abiertas
```

Las reglas de negocio van en `docs/domain/`, las decisiones en `docs/decisions/` y los tests en
`docs/testing/`: acá solo va el contrato.
