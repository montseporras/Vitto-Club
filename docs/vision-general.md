# Visión general

## Qué es

**Vitto Club** es la plataforma de fidelización por puntos de **La Vitto Comidas y Café**. Proyecto del
Seminario Integrador (UTN FRC), Grupo 11 · 3K2. Se trabaja con Scrum en sprints de 2 semanas. El Sprint 2
arrancó el 2026-09-28. Hasta el Sprint 2 la gestión fue en Jira (`SCRUM-xxx`); desde el Sprint 3 el tablero
de cada sprint es `docs/sprint-N/HISTORIAS_SPRINT_N.md`. El Sprint 5 es el último.

## Para quién

| Rol | Qué hace en el sistema |
|---|---|
| Cliente | Se registra, inicia sesión, consulta su saldo, nivel e historial, edita su perfil, ve el catálogo, confirma y cancela canjes |
| Cajero | Identifica al cliente en caja, lo da de alta, registra y anula consumos (los propios, dentro de las 24 h), confirma canjes en su nombre y registra o rechaza su uso |
| Administrador | Todo lo anterior, más empleados y usuarios, clientes (editar y dar de baja), consumos, ajustes de puntos, recompensas, canjes, auditoría y la configuración del programa |

Detalle de permisos: [roles y permisos](./conceptos-transversales/roles-y-permisos.md).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS 12 (ESM) + TypeScript, Prisma 7.10 + PostgreSQL 16, Jest + Supertest |
| Frontend | React + Vite + TypeScript, Tailwind + shadcn/ui, React Router, TanStack Query, React Hook Form + Zod, Axios, MSW |
| Datos | PostgreSQL en Docker local; Neon en producción según los docs de traspaso |
| Despliegue | Backend en Render y frontend en Vercel según los docs de traspaso (**sin verificar**) |

## Forma del repositorio

Monorepo con dos aplicaciones que se despliegan por separado:

```
Vitto-Club/
├─ docker-compose.yml   PostgreSQL (+ pgAdmin opcional) para desarrollo
├─ docs/                esta documentación
├─ backend/             API NestJS (monolito modular hexagonal)
└─ frontend/            SPA React + Vite (por feature)
```

Arquitectura: [arquitectura](./architecture/arquitectura.md) y
[estructura del frontend](./architecture/estructura-frontend.md).

## Qué está construido

Estado de `develop` al 09/11/2026 (fin del Sprint 4). Para el detalle y lo que falta, ver
[estado actual](./seguimiento/estado-actual.md).

Desde el Sprint 3, la referencia de cada funcionalidad es el **contrato de API** del sprint
(`docs/sprint-N/API_CONTRACT_SPRINT_N.md`). Los documentos de `funcionalidades/` son de los Sprints 1 y 2.

| Área | Sprint | Documento |
|---|---|---|
| Empleados (ABMC) | 1 | [empleados](./funcionalidades/empleados.md) |
| Clientes (alta, búsqueda, edición y baja; sin reactivación) | 1 y 3 | [clientes](./funcionalidades/clientes.md) y contrato S3 §3.8 |
| Usuarios de empleados (con reactivación de la cuenta) | 2 y 3 | [usuarios de empleados](./funcionalidades/usuarios-de-empleados.md) y contrato S3 §3.11.4 |
| Inicio de sesión, renovación y cierre | 2 | [autenticación](./funcionalidades/autenticacion.md) |
| Registro de clientes y alta con cuenta en caja | 2 y 3 | [registro de clientes](./funcionalidades/registro-de-clientes.md), [alta con cuenta](./funcionalidades/alta-de-cliente-con-cuenta.md) |
| Configuración del programa de puntos (versionada) y niveles | 2 y 3 | [configuración de puntos](./funcionalidades/configuracion-de-puntos.md) y contrato S3 §3.7 |
| Consumos: registrar, anular, consultar | 3 | `docs/sprint-3/API_CONTRACT_SPRINT_3.md` §3.1 a §3.3 |
| Puntos: saldo, nivel, ajustes, movimientos, vencimiento | 3 | Contrato S3 §3.4 a §3.6 |
| Auditoría | 3 | Contrato S3 §3.9 |
| Vista del Cliente: inicio, historial, perfil, contraseñas | 3 | Contrato S3 §3.10 y §3.11 |
| Recompensas y canjes | 4 | `docs/sprint-4/API_CONTRACT_SPRINT_4.md` |

Las reglas de negocio, sin HTTP, están resumidas en [dominio](./domain/). Las carpetas del frontend
`missions`, `notifications` y `statistics` están vacías: son del Sprint 5.

## Por dónde empezar

1. [SETUP](./SETUP.md): levantar todo en local.
2. [CONTRIBUTING](./CONTRIBUTING.MD): ramas, commits y PRs.
3. [Arquitectura](./architecture/arquitectura.md): reglas para sumar módulos.
4. [Glosario](./glosario.md).
