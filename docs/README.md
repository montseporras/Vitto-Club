# Documentación de Vitto Club

Índice de toda la documentación. Si es tu primer día, empezá por [visión general](./vision-general.md) y
[SETUP](./SETUP.md).

## Raíz

| Documento | Contenido |
|---|---|
| [vision-general](./vision-general.md) | Qué es el proyecto, stack, qué está construido |
| [SETUP](./SETUP.md) | Levantar base, backend y frontend en local; problemas frecuentes |
| [CONTRIBUTING](./CONTRIBUTING.MD) | Ramas, commits, Pull Requests y revisión |
| [glosario](./glosario.md) | Términos de negocio, sesión y arquitectura |

## Carpetas

| Carpeta | Qué hay |
|---|---|
| [architecture](./architecture/) | Arquitectura del backend y el frontend, estructura de carpetas, pantallas |
| [conceptos-transversales](./conceptos-transversales/) | Autenticación y sesiones, roles y permisos, errores, transacciones y eventos |
| [database](./database/) | Modelo de datos, migraciones, configuración de Prisma, persistencia de puntos |
| [decisions](./decisions/) | Decisiones (ADR) con su contexto y consecuencias |
| [domain](./domain/) | Reglas de negocio, sin HTTP |
| [funcionalidades](./funcionalidades/) | Contratos de API para el frontend, uno por funcionalidad |
| [openapi](./openapi/) | Reservada: aún no hay especificación |
| [plantillas](./plantillas/) | Plantillas de ADR, funcionalidad y pedido entre equipos |
| [prototipo](./prototipo/) | Reservada: el prototipo todavía no está agregado |
| [seguimiento](./seguimiento/) | Estado actual, deuda técnica, pendientes, pedidos e histórico |
| [testing](./testing/) | Estrategia de tests y descripción de las suites |

## Funcionalidades

| Funcionalidad | Contrato | Reglas de negocio |
|---|---|---|
| Autenticación | [autenticacion](./funcionalidades/autenticacion.md), [criterios](./funcionalidades/criterios-de-aceptacion-sesion.md) | [autenticación y sesiones](./conceptos-transversales/autenticacion-y-sesiones.md) |
| Registro de clientes | [registro-de-clientes](./funcionalidades/registro-de-clientes.md) | [clientes](./domain/clientes.md) |
| Clientes | [clientes](./funcionalidades/clientes.md) | [clientes](./domain/clientes.md) |
| Empleados | [empleados](./funcionalidades/empleados.md) | [cuentas y empleados](./domain/cuentas-y-empleados.md) |
| Usuarios de empleados | [usuarios-de-empleados](./funcionalidades/usuarios-de-empleados.md) | [cuentas y empleados](./domain/cuentas-y-empleados.md) |
| Configuración de puntos | [configuracion-de-puntos](./funcionalidades/configuracion-de-puntos.md) | [programa de puntos](./domain/programa-de-puntos.md) |

## Si encontrás algo desactualizado

Las inconsistencias detectadas al reordenar están listadas en
[estado actual](./seguimiento/estado-actual.md#inconsistencias-de-documentación-detectadas). Los
documentos nuevos marcan con **"no determinado"** o **"sin verificar"** lo que no pude confirmar contra el
código.
