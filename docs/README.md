# Documentación de Vitto Club

Índice de toda la documentación. Si es tu primer día, empezá por [visión general](./vision-general.md) y
[SETUP](./SETUP.md). Si vas a trabajar con Claude, leé primero el [`CLAUDE.md` de la raíz](../CLAUDE.md).

## Fuentes de verdad de cada sprint

Desde el Sprint 3, cada sprint tiene su carpeta. **El contrato manda** sobre los demás documentos (ver la
sección 1 de `CLAUDE.md`). Estos archivos no se editan sin que lo decida el equipo.

| Sprint | Contrato de API | Historias (tablero) | Otros |
|---|---|---|---|
| 3 | [API_CONTRACT_SPRINT_3](./sprint-3/API_CONTRACT_SPRINT_3.md) | [HISTORIAS_SPRINT_3](./sprint-3/HISTORIAS_SPRINT_3.md) | [VERIFICACION_SPRINTS_1_2](./sprint-3/VERIFICACION_SPRINTS_1_2.md) (lo que había de los Sprints 1 y 2 y qué corregir) y los `CAMBIOS_PROPUESTOS_AL_CONTRATO_*` de cada ítem |
| 4 | [API_CONTRACT_SPRINT_4](./sprint-4/API_CONTRACT_SPRINT_4.md) | [HISTORIAS_SPRINT_4](./sprint-4/HISTORIAS_SPRINT_4.md) | [CIERRE_SPRINT_3](./sprint-4/CIERRE_SPRINT_3.md) (estado de `develop` y arrastre del Sprint 3) y los `PROMPT_*` del prototipo |
| 5 (v3 del 12/11, todo decidido) | [API_CONTRACT_SPRINT_5](./sprint-5/API_CONTRACT_SPRINT_5.md) | [HISTORIAS_SPRINT_5](./sprint-5/HISTORIAS_SPRINT_5.md) | [CIERRE_SPRINT_4](./sprint-5/CIERRE_SPRINT_4.md) (estado de `develop` y arrastre del Sprint 4), [AJUSTES_PANTALLAS_SPRINTS_ANTERIORES](./sprint-5/AJUSTES_PANTALLAS_SPRINTS_ANTERIORES.md) (cambios a pantallas de los Sprints 3 y 4) y [PROMPT_PROTOTIPO_SPRINT_5](./sprint-5/PROMPT_PROTOTIPO_SPRINT_5.md) (ya aplicado) |

Prototipo (fuente de verdad visual del frontend): [`prototipo/v2/`](./prototipo/v2/LEEME.md).

## Raíz

| Documento | Contenido |
|---|---|
| [vision-general](./vision-general.md) | Qué es el proyecto, stack, qué está construido |
| [SETUP](./SETUP.md) | Levantar base, backend y frontend en local; procesos automáticos; problemas frecuentes |
| [CONTRIBUTING](./CONTRIBUTING.MD) | Ramas, commits, Pull Requests y revisión |
| [glosario](./glosario.md) | Términos de negocio, sesión y arquitectura |

## Carpetas

| Carpeta | Qué hay |
|---|---|
| [architecture](./architecture/) | Arquitectura del backend (módulos y dependencias) y del frontend (carpetas, pantallas, componentes) |
| [conceptos-transversales](./conceptos-transversales/) | Autenticación y sesiones, roles y permisos (matriz completa), errores y códigos, transacciones y eventos |
| [database](./database/) | Modelo de datos, migraciones, configuración de Prisma, persistencia de la configuración de puntos |
| [decisions](./decisions/) | Decisiones (ADR) con su contexto y consecuencias |
| [domain](./domain/) | Reglas de negocio, sin HTTP |
| [funcionalidades](./funcionalidades/) | Contratos de API de los Sprints 1 y 2, uno por funcionalidad. Desde el Sprint 3 están en los contratos de cada sprint |
| [openapi](./openapi/) | Reservada: no hay especificación |
| [plantillas](./plantillas/) | Plantillas de ADR, funcionalidad y pedido entre equipos |
| [prototipo](./prototipo/) | Prototipo v2 exportado de Claude Design y desempaquetado en `v2/` |
| [seguimiento](./seguimiento/) | Estado actual, decisiones de cada historia, deuda técnica, pendientes, pedidos e histórico |
| [sprint-3](./sprint-3/), [sprint-4](./sprint-4/), [sprint-5](./sprint-5/) | Fuentes de verdad de cada sprint (ver arriba) |
| [testing](./testing/) | Estrategia de tests y descripción de las suites |

## Funcionalidades

| Funcionalidad | Contrato | Reglas de negocio |
|---|---|---|
| Autenticación | [autenticacion](./funcionalidades/autenticacion.md), [criterios](./funcionalidades/criterios-de-aceptacion-sesion.md) | [autenticación y sesiones](./conceptos-transversales/autenticacion-y-sesiones.md) |
| Registro de clientes | [registro-de-clientes](./funcionalidades/registro-de-clientes.md) | [clientes](./domain/clientes.md) |
| Alta de cliente con cuenta (US-17-AJ) | [alta-de-cliente-con-cuenta](./funcionalidades/alta-de-cliente-con-cuenta.md) | [clientes](./domain/clientes.md) |
| Clientes | [clientes](./funcionalidades/clientes.md) y contrato S3 §3.8 | [clientes](./domain/clientes.md) |
| Empleados | [empleados](./funcionalidades/empleados.md) | [cuentas y empleados](./domain/cuentas-y-empleados.md) |
| Usuarios de empleados | [usuarios-de-empleados](./funcionalidades/usuarios-de-empleados.md) | [cuentas y empleados](./domain/cuentas-y-empleados.md) |
| Configuración de puntos y niveles | [configuracion-de-puntos](./funcionalidades/configuracion-de-puntos.md) y contrato S3 §3.7 | [programa de puntos](./domain/programa-de-puntos.md) §1 |
| Consumos | Contrato S3 §3.1 a §3.3 | [programa de puntos](./domain/programa-de-puntos.md) §2 |
| Puntos, ajustes, movimientos y vencimiento | Contrato S3 §3.4 a §3.6 | [programa de puntos](./domain/programa-de-puntos.md) §3 |
| Auditoría | Contrato S3 §3.9 y S4 §3.14 | — |
| Vista del Cliente (inicio, historial, perfil, contraseñas) | Contrato S3 §3.10 y §3.11 | [clientes](./domain/clientes.md) |
| Recompensas | Contrato S4 §3.1 a §3.5 | [programa de puntos](./domain/programa-de-puntos.md) §4 |
| Canjes | Contrato S4 §3.6 a §3.12 | [programa de puntos](./domain/programa-de-puntos.md) §5 |

## Si encontrás algo desactualizado

Lo que falta o no coincide con el código está en [estado actual](./seguimiento/estado-actual.md). Las
decisiones que se tomaron al programar cada historia están juntas en
[decisiones de implementación](./seguimiento/decisiones-de-implementacion.md).
