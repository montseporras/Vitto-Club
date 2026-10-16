# ADR 001 — Monolito modular hexagonal en el backend, monolito por feature en el frontend

**Estado:** vigente. Ya está implementado en el código.

## Contexto

Es un repositorio con dos aplicaciones que se despliegan por separado. La complejidad de reglas de
negocio (validaciones de dominio, invariantes, persistencia) vive en el backend. El frontend es una SPA
que consume una API ya validada.

## Decisión

- **Backend:** un solo proceso Nest dividido en módulos por contexto de negocio (`customers`,
  `employees`, `loyalty`, `accounts`, `auth`…). Cada módulo sigue puertos y adaptadores:
  `domain`, `application`, `infrastructure`, `http`.
- **Frontend:** monolito tradicional organizado por feature, sin capas hexagonales.

## Consecuencias

- Ningún módulo importa el `domain` de otro. Lo que cruza módulos va por el service exportado o por
  eventos de dominio.
- Cada módulo tiene su propia copia de utilidades de dominio chicas (`mail.ts`, `domain.error.ts`). Es
  deliberado: **no moverlas a un paquete compartido sin discutirlo**.
- Las dos únicas excepciones compartidas viven en `src/shared/`: `events/` y `security/`.
- En el frontend, la validación "real" está en el backend; los `schemas/` de Zod solo dan feedback
  inmediato.

## Detalle

Reglas completas, estructura de carpetas y ejemplos: [arquitectura](../architecture/arquitectura.md).
