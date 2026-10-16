# Plantilla: ADR (decisión de arquitectura o de producto)

Copiar a `docs/decisions/NNN-titulo-corto.md` y agregar la fila en [decisions/README](../decisions/README.md).

```markdown
# ADR NNN — Título en una línea

**Estado:** propuesta | vigente | reemplazada por ADR NNN
**Fecha:** AAAA-MM-DD
**Quién decide:** (equipo, PO, etc.)

## Contexto

Qué problema hay y qué restricciones. Qué se probó o consideró.

## Decisión

Qué se decidió, en una o dos frases claras.

## Consecuencias

Qué cambia, qué se vuelve más fácil y qué más difícil. Deuda que deja.

## Alternativas descartadas

| Opción | Por qué no |
|---|---|

## Referencias

Archivos, tickets (SCRUM-xxx), migraciones.
```

Reglas: una decisión por archivo; si una decisión se revierte, no se edita la anterior, se marca
"reemplazada" y se crea una nueva (como en el [ADR 006](../decisions/006-unicidad-documento-y-email-de-clientes.md)).
