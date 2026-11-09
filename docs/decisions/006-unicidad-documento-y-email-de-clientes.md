# ADR 006 — Documento y email de cliente únicos solo entre clientes activos

**Estado:** vigente. **Reemplaza** dos decisiones anteriores (ver historia).

## Decisión

El par `documentType` + `documentNumber` y el `email` son únicos **solo entre clientes activos**. Un
cliente dado de baja perdió sus puntos y su cuenta anterior, así que puede volver a inscribirse como un
cliente nuevo. Decisión del Product Owner del 2026-10-08.

## Cómo está implementado

Índices únicos parciales (`WHERE is_active = true`) en `customers`:
`customers_active_document_key` y `customers_active_email_key`. La búsqueda por documento sigue
encontrando clientes inactivos (índice no único aparte).

## Historia

| Fecha | Qué se decidió | Migración |
|---|---|---|
| hasta 2026-10-06 | Únicos entre clientes activos | `…_customers_unique_among_active` |
| 2026-10-07 | Únicos entre **todos**, incluso inactivos (confirmado por el PO el 07/10) | `…_customers_unique_email_all` |
| 2026-10-08 | Vuelven a ser únicos solo entre **activos** (decisión final) | `…_customers_unique_among_active_final` |

## Atención: documentos desactualizados

El documento [accounts-vs-rama-scrum-160](../seguimiento/historico/accounts-vs-rama-scrum-160.md)
(secciones 3 y 5) describe la "opción B" (únicos entre todos, incluso inactivos), y la tabla de
SCRUM-160 de su sección 6 parte de ella. **Esa regla ya no rige.** La fuente de verdad es el `schema.prisma` y la
migración `20261008120000_customers_unique_among_active_final`.

## Consecuencia (resuelta en el Sprint 3)

Con esta regla, un cliente inactivo y uno activo pueden compartir email. Desde la migración
`20261017200928_sprint3_schema`, `Account.email` también es único **solo entre cuentas activas**
(`accounts_active_email_key`), igual que `employees`, y la baja del cliente deja inactiva su cuenta
(`customer.deactivated`). Así, un cliente que se reinscribe con el email de su cuenta anterior obtiene una
cuenta nueva. El e2e de ese caso sigue saltado en `backend/test/customer-registration.e2e-spec.ts`.
