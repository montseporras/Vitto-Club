# Visión general

## Qué es

**Vitto Club** es la plataforma de fidelización por puntos de **La Vitto Comidas y Café**. Proyecto del
Seminario Integrador (UTN FRC), Grupo 11. Se trabaja con Scrum en sprints de 2 semanas y gestión en Jira
(`SCRUM-xxx`). El Sprint 2 arrancó el 2026-09-28.

## Para quién

| Rol | Qué hace en el sistema |
|---|---|
| Cliente | Se registra, inicia sesión y consulta su programa de puntos |
| Cajero | Identifica y gestiona clientes en caja |
| Administrador | Gestiona empleados, usuarios y la configuración del programa de puntos |

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

Estado al reordenar la documentación (2026-10-15). Para el detalle y lo no verificado, ver
[estado actual](./seguimiento/estado-actual.md).

| Área | Documento |
|---|---|
| Empleados (ABMC) | [empleados](./funcionalidades/empleados.md) |
| Clientes (ABMC, baja y reactivación, historial) | [clientes](./funcionalidades/clientes.md) |
| Usuarios de empleados | [usuarios de empleados](./funcionalidades/usuarios-de-empleados.md) |
| Inicio de sesión, renovación y cierre | [autenticación](./funcionalidades/autenticacion.md) |
| Registro de clientes | [registro de clientes](./funcionalidades/registro-de-clientes.md) |
| Configuración del programa de puntos (versionada) | [configuración de puntos](./funcionalidades/configuracion-de-puntos.md) |

Los módulos del frontend `rewards`, `missions`, `levels`, `points`, `notifications`, `statistics` y
`audit` existen como carpetas; según el README raíz original muchas están vacías. No hay documentación de
su funcionalidad.

## Por dónde empezar

1. [SETUP](./SETUP.md): levantar todo en local.
2. [CONTRIBUTING](./CONTRIBUTING.MD): ramas, commits y PRs.
3. [Arquitectura](./architecture/arquitectura.md): reglas para sumar módulos.
4. [Glosario](./glosario.md).
