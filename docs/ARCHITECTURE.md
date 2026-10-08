# Arquitectura

Este documento deja por escrito una decisión de arquitectura que hoy **ya está
implementada en el código**, para que cualquiera que sume una feature nueva
sepa qué forma tiene que seguir y por qué.

## Decisión

- **Backend**: monolito modular con arquitectura hexagonal (puertos y adaptadores) por módulo.
- **Frontend**: monolito tradicional, organizado por feature, sin capas hexagonales.

Backend y frontend son deploys separados (un mismo repo, dos aplicaciones) y
no comparten el mismo estilo de arquitectura interna a propósito: la
complejidad de reglas de negocio (validaciones de dominio, invariantes,
persistencia) vive en el backend, así que ahí se justifica invertir en
puertos/adaptadores. El frontend es una SPA que consume una API ya validada,
así que agregarle las mismas capas sería sobre-ingeniería.

## Backend: monolito modular hexagonal

Es **un solo proceso Nest** (un solo deploy), dividido en **módulos por
contexto de negocio** (`customers`, `employees`, `loyalty`, …). Cada módulo es
independiente y, puertas adentro, sigue puertos y adaptadores.

### Estructura de un módulo

```
backend/src/<modulo>/
  domain/            # Entidad + reglas de negocio + puertos (abstract class)
    <entidad>.ts
    errors/
    port/
      <entidad>.repository.ts   # puerto: abstract class, sin implementación
  application/        # Casos de uso (services). Dependen solo del puerto.
    <modulo>.service.ts
  infrastructure/      # Adaptador de salida: implementa el puerto con Prisma
    <modulo>.repository.ts
  http/                # Adaptador de entrada: REST
    <modulo>.controller.ts
    dto/
    filters/
  <modulo>.module.ts   # Une todo: liga el puerto a su implementación (DI)
```

Ejemplo real de la inversión de dependencia, en `<modulo>.module.ts`:

```ts
providers: [
  CustomersService,
  { provide: CustomerRepository, useClass: CustomerPrismaRepository },
];
```

`CustomersService` (application) solo conoce `CustomerRepository`, que es una
`abstract class` (el puerto) definida en `domain/port/`. Nest resuelve en
runtime qué implementación (`infrastructure/`) inyectar. Así, el dominio no
depende de Prisma ni de HTTP.

El módulo `loyalty` aplica el mismo patrón a la configuración global de
puntos: `PointsEquivalence`, `PointsValidity` y `FirstPurchaseBonus` validan
las invariantes del dominio y el default de RF-010.
`LoyaltyConfigurationRepository` define el puerto y
`LoyaltyPrismaRepository` implementa la persistencia versionada del snapshot
completo, con una nueva versión por actualización y una transacción serializada
por advisory lock de PostgreSQL. Los endpoints seccionales existentes se
mantienen como patches compatibles y también crean versiones. Una migración
importa los valores singleton existentes en la versión inicial; un índice
único parcial garantiza como máximo una versión activa. El contrato REST y las
limitaciones respecto al snapshot futuro de movimientos están en
[`loyalty-api.md`](./loyalty-api.md). Su guard de rol requiere que la futura
integración de autenticación establezca `request.user.role`; no reemplaza la
autenticación.

### Reglas para módulos nuevos

1. **Un módulo nuevo = las cuatro carpetas** (`domain`, `application`,
   `infrastructure`, `http`) + su `<modulo>.module.ts`. No saltear capas
   "porque es chico": la estructura es la que mantiene el dominio aislado de
   Prisma y de HTTP.
2. **Ningún módulo importa el `domain` de otro módulo.** `customers` y
   `employees` no se conocen entre sí. Si en el futuro un módulo necesita
   datos de otro, se expone a través del `<modulo>.service.ts` exportado por
   su `*.module.ts` (nunca su repositorio ni sus entidades internas), o se
   modela como un evento de dominio. Nunca un `import` directo entre
   `domain/` de dos módulos.
3. Es una decisión consciente que cada módulo tenga su propia copia de
   utilidades de dominio pequeñas (por ejemplo, `domain/mail.ts` y
   `domain/errors/domain.error.ts` existen duplicados en `customers` y en
   `employees`). Es el costo de que los módulos no se conozcan entre sí. **No
   "arreglar" esto moviéndolo a un paquete compartido** sin discutirlo antes:
   eso reintroduce acoplamiento entre módulos de dominio.
4. Código realmente transversal y sin lógica de negocio (conexión a la base,
   health check) sí puede vivir fuera de un módulo de dominio — ver
   `backend/src/prisma/` y `backend/src/health/` como ejemplo. Eso no rompe la
   regla anterior porque no es dominio de ningún contexto de negocio.

## Frontend: monolito tradicional

Una sola SPA (React + Vite), organizada por feature, sin capas
domain/application/infrastructure ni puertos/adaptadores:

```
frontend/src/features/<feature>/
  api/         # llamadas HTTP (axios) + hooks de React Query
  components/  # componentes de esa feature
  pages/       # pantallas
  schemas/     # validación de formularios (zod)
  types/       # tipos calcados del contrato de la API
```

Los componentes consumen la API directamente a través de los hooks de
`api/` (ver `frontend/src/features/cashier/`). No hay una capa de dominio propia
del frontend ni abstracciones de puerto: la validación de negocio "real" vive
en el backend, y el frontend solo la duplica de forma liviana en los
`schemas/` de Zod para dar feedback inmediato en el formulario.

### Reglas para features nuevas

1. Una feature nueva es una carpeta bajo `features/`, con las subcarpetas de
   arriba que necesite (no todas son obligatorias si la feature no las usa).
2. No introducir capas hexagonales en el frontend (no crear `domain/`,
   `application/`, `infrastructure/` ahí). Si una feature empieza a necesitar
   eso, es una señal de que esa lógica debería vivir en el backend.
3. Los `types/` del frontend son un espejo de los DTOs de respuesta del
   backend correspondiente (ver cómo `frontend/src/features/cashier/types/customer.ts`
   calca a `CustomerResponseDto`) — al cambiar un DTO del backend, hay que
   actualizar el tipo espejado en el frontend.

## Por qué documentarlo

Esta arquitectura ya existe en el código de `customers` y `employees`, pero
no se podía derivar mirando un solo módulo: hace falta ver los dos para
confirmar que el aislamiento (regla 2) es intencional y no casualidad. Este
documento es la referencia para no romperla sin querer al revisar código o al
sumar gente nueva al equipo.
