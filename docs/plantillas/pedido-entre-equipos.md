# Plantilla: pedido entre equipos (backend ↔ frontend ↔ otros)

Copiar a `docs/seguimiento/pedidos/<ticket>-<tema>.md`. Ejemplo real:
[baja de usuario SCRUM-27](../seguimiento/pedidos/baja-usuario-SCRUM-27.md).

```markdown
# Pedido al <equipo> — <tema> (SCRUM-xxx)

> Contexto: qué se está construyendo, en qué rama, qué ya funciona y qué falta.
> Todo lo que no se menciona **no cambia**.

## Qué se decidió

- Decisiones ya tomadas que condicionan el pedido (con fecha y quién decidió).

## 1. <Cambio pedido>

Qué hace, quién puede, respuesta esperada, errores.

## Resumen de códigos nuevos

| Código | Status | El front hace |
|---|---|---|

## Cómo probarlo
```

Cuando el pedido se cumple, mover el archivo a `seguimiento/historico/` y llevar lo permanente a
`funcionalidades/` y `domain/`.
