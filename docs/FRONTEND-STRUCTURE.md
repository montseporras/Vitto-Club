# Estructura del frontend

> Grupo 11 · Seminario Integrador · Vitto Club · Septiembre 2026

Este documento describe cómo se organiza el código de la aplicación web de Vitto Club: roles y acceso, estructura de carpetas, capa de datos, mapa de pantallas y convenciones de estilo.

**Stack:** React + Vite · TypeScript · Tailwind CSS + shadcn/ui · React Router · TanStack Query · React Hook Form + Zod · Axios · MSW (mocks)

## Índice

1. [Roles y acceso a la aplicación](#01-roles-y-acceso-a-la-aplicación)
2. [Capas del proyecto](#02-capas-del-proyecto)
3. [Árbol de carpetas](#03-árbol-de-carpetas)
4. [La carpeta `app/`](#04-la-carpeta-app)
5. [La carpeta `features/`](#05-la-carpeta-features)
6. [`shared/` y `domain/`](#06-shared-y-domain)
7. [Stack de datos y mocks](#07-stack-de-datos-y-mocks)
8. [Mapa de pantallas](#08-mapa-de-pantallas)
9. [Particularidades del dominio](#09-particularidades-del-dominio)
10. [Estilos y convenciones](#10-estilos-y-convenciones)

---

## 01. Roles y acceso a la aplicación

Vitto Club es una única aplicación web responsive, sin aplicaciones separadas por audiencia. Los tres roles ingresan por la misma pantalla de inicio de sesión y el sistema los redirige según su rol:

```
                    ┌──► CLIENTE        /mi-cuenta
/login  ────────────┼──► CAJERO         /caja
(una sola pantalla  └──► ADMINISTRADOR  /admin
 para los tres roles)
```

Solo el Cliente puede darse de alta por su cuenta. Los otros dos roles son creados siempre por un usuario ya autenticado:

| Rol | Cómo se crea la cuenta | Pantalla |
|---|---|---|
| **Cliente** | Se autoregistra desde la aplicación (nombre, documento, contacto, contraseña). | `/registro` |
| **Cajero** | Lo da de alta un Administrador autenticado. | `/admin` → Empleados y usuarios |
| **Administrador** | El primero se crea mediante la semilla de base de datos (seed script de Prisma, que se ejecuta una sola vez al desplegar). Los siguientes los crea otro Administrador desde la misma pantalla que los Cajeros. | `/admin` → Empleados y usuarios |

> **Sobre el campo "rol"**
>
> Para la aplicación web, el único rol relevante es el de sistema: Cliente, Cajero o Administrador. No existe un "rol laboral" separado (cocina, salón, etc.). Al registrar a un miembro del personal, el único dato de rol que se solicita es Cajero o Administrador, y ese rol determina qué puede ver y hacer dentro de la aplicación.

Empleados y usuarios del sistema constituyen, en la práctica, una misma alta: un formulario con nombre, apellido, nombre de usuario, contraseña y rol (Cajero o Administrador). No existe un paso separado para "crear empleado" y luego "crear su cuenta".

---

## 02. Capas del proyecto

Todo el código pertenece a una de cuatro categorías. Esta separación ordena el trabajo cuando varias personas modifican el mismo repositorio en simultáneo.

- **`app/`** — Arranque de la aplicación y control de acceso: providers, router y los layouts de cada rol. Es reducida y rara vez se modifica.
- **`features/`** — Funcionalidad de la aplicación. Una carpeta por módulo de negocio, alineada con los Epics del Product Backlog. Concentra la mayor parte del código.
- **`shared/`** — Infraestructura técnica de uso transversal: cliente HTTP, componentes de interfaz reutilizables y utilidades. No contiene lógica de negocio.
- **`domain/`** — Vocabulario del negocio que no pertenece a un único feature: estados de un canje, niveles y reglas de vigencia.

```
app  ──usa──►  features  ──usa──►  shared / domain
```

Las dependencias van en un solo sentido: `shared/` no conoce a `features/`, y `features/` no conoce a `app/`. Esta regla se hace cumplir mediante el plugin de ESLint `eslint-plugin-boundaries`.

> **Criterio de ubicación**
>
> Si un archivo conoce conceptos del negocio (cliente, compra, canje), pertenece a `features/`. Si es independiente del negocio, pertenece a `shared/`.

---

## 03. Árbol de carpetas

```
frontend/src/
├── app/                        # arranque de la app, no lógica de negocio
│   ├── main.tsx
│   ├── App.tsx
│   ├── providers/              # QueryClient, Auth, Toast
│   ├── router/
│   │   ├── index.tsx           # todas las rutas, con lazy()
│   │   ├── ProtectedRoute.tsx  # ¿hay sesión?
│   │   ├── RoleRoute.tsx       # ¿el rol de la sesión está permitido?
│   │   └── paths.ts            # constantes de rutas
│   └── layouts/
│       ├── CustomerLayout.tsx  # mobile-first, tabs abajo
│       ├── CashierLayout.tsx   # pantalla operativa de caja
│       ├── AdminLayout.tsx     # sidebar + topbar
│       └── AuthLayout.tsx      # /login y /registro
│
├── features/                   # un módulo por Epic del backlog
│   ├── auth/                   # EP01 — login unificado + registro de Cliente
│   ├── employees/              # EP01 — alta de Cajeros y Administradores
│   ├── customers/              # EP03 — directorio del Administrador
│   ├── cashier/                # EP03/EP04/EP06/EP07 — pantallas del Cajero
│   ├── rewards/                # EP06 — catálogo (ABM del Administrador)
│   ├── missions/               # EP05 — misiones mensuales (ABM)
│   ├── levels/                 # EP05 — Bronce / Plata / Oro (ABM)
│   ├── notifications/          # EP08 — mensajes automáticos (config)
│   ├── statistics/             # EP09 — dashboards + exportar PDF
│   ├── audit/                  # EP09 — historial de operaciones
│   └── my-account/             # EP03/EP04/EP05/EP06 — vista del Cliente
│
├── shared/                     # infraestructura técnica
│   ├── api/
│   │   ├── http.ts             # instancia de axios + interceptores
│   │   ├── queryClient.ts
│   │   ├── ApiError.ts
│   │   └── download.ts         # blobs (PDF de reportes)
│   ├── components/
│   │   ├── ui/                 # Button, Input, Select, Card, Page, Modal, Table, Badge, Alert...
│   │   ├── forms/              # FormField, FormSection, FormActions, SegmentedRadio
│   │   ├── navigation/         # AppHeader, SideNav
│   │   └── feedback/           # StatusText, ComingSoon
│   ├── hooks/                  # useDebounce, useMediaQuery
│   ├── lib/                    # utilidades (cn, fechas, formateadores es-AR)
│   └── types/                  # Paginado<T>, ApiResponse<T>
│
├── domain/                     # vocabulario del negocio compartido
│   ├── roles.ts                # Cliente, Cajero, Administrador
│   ├── redemption-statuses.ts  # Pendiente, Confirmado, Utilizado, Rechazado, Vencido
│   ├── statuses.ts             # estados de compra, misión y recompensa
│   ├── levels.ts               # Bronce (0) / Plata (300) / Oro (800)
│   └── expiration.ts           # reglas de vencimiento (puntos, canjes, recompensas)
│
├── mocks/                      # MSW — handlers que simulan la API de NestJS
│   ├── handlers/               # uno por feature, mismas rutas que el backend real
│   └── browser.ts
│
├── api-contract/               # tipos generados del Swagger de NestJS (no editar)
└── styles/                     # sistema de diseño (ver sección 10)
    ├── theme.css               # tokens de marca
    ├── globals.css             # estilos base
    └── ui/                     # recetas de estilo por componente
```

---

## 04. La carpeta `app/`

Contiene todo lo que ocurre antes de que se renderice la primera pantalla, junto con el marco que determina qué versión de la aplicación ve cada rol una vez iniciada la sesión.

### `providers/`

La aplicación se envuelve, en este orden, con:

- **`QueryClientProvider`** — caché de datos del servidor (TanStack Query).
- **`AuthProvider`** — usuario autenticado y su rol.
- **`ToastProvider`** — notificaciones breves de confirmación o error.

### `router/`

Existe una única pantalla de inicio de sesión con tres destinos posibles. `ProtectedRoute` verifica que haya una sesión activa y `RoleRoute` verifica que el rol de esa sesión esté habilitado para la ruta solicitada; en caso contrario, redirige a `/login` o a la raíz.

La ruta raíz `/` no tiene pantalla propia: evalúa el rol de la sesión activa y redirige a `/mi-cuenta`, `/caja` o `/admin` según corresponda.

### `layouts/`

| Layout | Rol | Ruta raíz | Forma |
|---|---|---|---|
| `CustomerLayout` | Cliente | `/mi-cuenta` | Mobile-first, tabs fijas abajo (RNF-3) |
| `CashierLayout` | Cajero | `/caja` | Pantalla completa, botones grandes, sin sidebar (RNF-1, RNF-2, RNF-5) |
| `AdminLayout` | Administrador | `/admin` | Sidebar + topbar, escritorio |
| `AuthLayout` | todos | `/login`, `/registro` | Centrado, una tarjeta |

---

## 05. La carpeta `features/`

Se organiza una carpeta por módulo de negocio. Frente a la alternativa de agrupar por tipo técnico (`components/`, `pages/`, `hooks/` a nivel raíz), esta organización mantiene junto todo el código de una misma funcionalidad y reduce los conflictos cuando varias personas trabajan en paralelo.

### Estructura interna de un feature

Todos los features respetan la misma estructura:

```
features/<nombre>/
├── api/
│   ├── <nombre>.api.ts          # llamadas al backend
│   ├── <nombre>.keys.ts         # claves de caché de TanStack Query
│   └── <nombre>.queries.ts      # hooks de consulta y mutación
├── components/                  # componentes exclusivos del feature
├── pages/                       # un archivo por pantalla
├── schemas/                     # validaciones con Zod
├── types/                       # DTOs del feature
└── index.ts                     # API pública del feature
```

El archivo `index.ts` define la API pública del feature. Cuando un feature necesita algo de otro, lo importa exclusivamente desde ese `index.ts` (`@/features/<nombre>`) y nunca desde sus carpetas internas, de modo que la estructura interna de cada módulo pueda cambiar sin afectar al resto. ESLint bloquea los imports internos mediante la regla `no-restricted-imports`.

---

## 06. `shared/` y `domain/`

`shared/` reúne lo que no pertenece a ningún módulo de negocio: la instancia de Axios, los componentes de presentación y las utilidades de formato. Como criterio práctico, un archivo pertenece a `shared/` si podría trasladarse a otro proyecto sin modificaciones.

### Razón de ser de `domain/`

Existe vocabulario de negocio que no pertenece a un único feature. El estado de un canje, por ejemplo, se utiliza en tres módulos distintos:

- `features/cashier/` — el Cajero confirma o rechaza un canje.
- `features/my-account/` — el Cliente consulta el estado de sus canjes.
- `features/statistics/` — reporte de canjes por estado.

Si esa definición viviera dentro de `features/cashier/`, los otros dos módulos tendrían que importar desde allí y se rompería la regla de capas de la sección 02. Por eso se centraliza en `domain/`, junto con las transiciones válidas entre estados; las acciones disponibles en pantalla («Aplicar», «Rechazar») se derivan de esas transiciones en lugar de repetir la misma condición en cada pantalla.

| | `shared/` | `domain/` | `features/` |
|---|---|---|---|
| **Qué es** | Infraestructura técnica | Vocabulario del negocio | Módulos de negocio |
| **¿Conoce el negocio?** | No | Conoce sus conceptos y estados | Sí, completamente |

---

## 07. Stack de datos y mocks

El Plan de Proyecto fija React + Vite + TypeScript + Tailwind/shadcn para la capa visual. Para la navegación y la comunicación con el backend se incorporan cuatro librerías, cada una con una responsabilidad concreta:

- **React Router** — Gestiona la navegación entre las pantallas de las tres vistas sin recargar la página. Se integra con `lazy()` para cargar cada pantalla bajo demanda y reducir el tamaño inicial de la aplicación.
- **TanStack Query** — Administra los datos que provienen del servidor: los solicita, los almacena en caché y los vuelve a pedir cuando quedan desactualizados (por ejemplo, luego de registrar una compra). Evita implementar manualmente en cada pantalla la lógica de carga, error y actualización.
- **React Hook Form + Zod** — Resuelven los formularios y su validación. Zod permite definir cada regla una sola vez y utilizarla tanto para validar los datos ingresados como para tipar el formulario.
- **Axios** — Cliente HTTP para comunicarse con la API de NestJS. Una única instancia, definida en `shared/api/http.ts`, centraliza la URL base, el envío del token JWT y el manejo de sesiones expiradas mediante interceptores, sin repetir esa lógica en cada llamada.

### Mocks con MSW

Mientras el backend (NestJS) se desarrolla en paralelo, el frontend se construye contra **MSW (Mock Service Worker)**: una librería que intercepta las llamadas `fetch` / `axios` del navegador y devuelve respuestas simuladas, usando exactamente las mismas rutas que luego expondrá la API real.

De este modo, ningún feature queda bloqueado a la espera de que un endpoint del backend esté disponible. Cuando lo esté, se desactiva el mock correspondiente y la aplicación pasa a consumir la API real sin modificar el código de las pantallas.

Los handlers se ubican en `src/mocks/handlers/`, uno por feature, replicando las rutas del backend.

---

## 08. Mapa de pantallas

Las pantallas y sus nombres corresponden a las validadas en el prototipo interactivo del equipo.

### Acceso — `AuthLayout`

| Ruta | Pantalla |
|---|---|
| `/login` | Ingresar — usuario/correo y contraseña, un solo formulario para los tres roles |
| `/registro` | Registrarme — solo crea cuentas con rol Cliente |

### Cliente — `CustomerLayout`, tabs fijas abajo

| Ruta | Pantalla |
|---|---|
| `/mi-cuenta` | Inicio — puntos, nivel, catálogo de recompensas con filtros, canjear |
| `/mi-cuenta/historial` | Historial de compras e historial de movimientos de puntos |
| `/mi-cuenta/misiones` | Misiones del mes, progreso, reclamar recompensa |
| `/mi-cuenta/canjes` | Mis canjes — código y estado |
| `/mi-cuenta/perfil` | Mi perfil — editar teléfono, correo, fecha de nacimiento |

### Cajero — `CashierLayout`

| Ruta | Pantalla |
|---|---|
| `/caja` | Identificar cliente por documento → resumen (puntos, nivel), registrar compra, ver canjes y recompensas alcanzables |
| `/caja/canje` | Gestionar canje por código — cuando el cliente solo tiene el código |
| `/caja/alta-cliente` | Alta manual de cliente — cuando no se encuentra por documento |

### Administrador — `AdminLayout`

| Ruta | Pantalla |
|---|---|
| `/admin/recompensas` | Catálogo de recompensas — crear, editar, activar/desactivar |
| `/admin/misiones` | Misiones mensuales — crear, editar/baja |
| `/admin/clientes` | Clientes — buscar, filtrar por nivel, ver más / editar (con motivo) |
| `/admin/estadisticas` | Estadísticas y reportes — clientes activos, compras, puntos, canjes; exportar PDF |
| `/admin/auditoria` | Auditoría — filtro por usuario, cliente y fecha (exacta o rango) |

### Configuración — modal accesible desde el ícono de engranaje

| Sección | Contenido |
|---|---|
| Empleados y usuarios | ABM de Cajeros y Administradores (nombre, usuario, contraseña, rol) |
| Equivalencia de puntos | Puntos por cada $1000, vigencia en meses, bonificación 1ª compra |
| Niveles de fidelización | Bronce / Plata / Oro — puntaje mínimo y beneficio |
| Notificaciones | 4 tipos (vencimiento, cumpleaños, promociones, misiones) — activar/desactivar y editar mensaje |

---

## 09. Particularidades del dominio

### a) Vigencia de los puntos

Cada acreditación de puntos tiene su propia fecha de vencimiento. El saldo se calcula como Σ(acreditaciones vigentes) − débitos, y se muestra en tres pantallas (resumen en caja, inicio del Cliente e historial de movimientos).

> **Importante**
>
> El cálculo autoritativo corresponde al backend, que también vence los puntos automáticamente. El frontend utiliza `domain/expiration.ts` únicamente para decidir qué indicador mostrar (por ejemplo, «vence pronto»), nunca para descontar puntos por su cuenta.

### b) Actualización de canjes en caja

Si un Cliente solicita un canje desde su celular mientras está en el local, el Cajero lo visualiza al volver a buscar al cliente o al recargar `/caja`. Dado que esa pantalla utiliza TanStack Query, basta con invalidar la consulta al buscar nuevamente; no se requieren WebSockets ni cambios en el backend.

### c) Datos del cliente según la vista

La pantalla de identificación en caja muestra nombre, documento, puntos y nivel, pero no el correo ni el teléfono, que sí ve el Cliente en su propio perfil. Esta diferencia se modela en TypeScript como una unión discriminada (un tipo por vista) y no como un único DTO con campos opcionales. Así, el compilador impide acceder a datos de contacto desde la vista de caja, en lugar de que el error aparezca recién en producción como un valor `undefined`.

### d) Operaciones sensibles con motivo y auditoría

Anular una compra y editar los datos de un cliente desde Administración requieren indicar un motivo antes de confirmarse. Ese motivo se registra en el historial de auditoría junto con el usuario que realizó la acción y la fecha. Ambas acciones comparten el mismo flujo para no reimplementarlo en cada pantalla.

---

## 10. Estilos y convenciones

La interfaz se construye con Tailwind CSS sobre un sistema de diseño propio, basado en el Manual de marca de La Vitto. El objetivo es que todas las pantallas compartan la misma estética sin que cada desarrollador tenga que definir colores, tipografías o espaciados por su cuenta.

### Organización del sistema de diseño

El sistema se compone de tres niveles:

| Nivel | Ubicación | Contenido |
|---|---|---|
| **Tokens** | `src/styles/theme.css` | Paleta de marca (`accent`, `olive`, `beige`, `sage`, `neutral`), colores de superficie y texto (`bg`, `surface`, `text`, `ink`), tipografías (`font-heading`: Playfair Display; `font-sans`: Lora) y radio de borde. |
| **Recetas de estilo** | `src/styles/ui/` | Clases de Tailwind que definen la apariencia de cada componente (botones, formularios, tarjetas, tablas, alertas, navegación). Las variantes se declaran con `class-variance-authority`. |
| **Componentes** | `src/shared/components/` | Componentes de React que aplican esas recetas y son los que se usan en las pantallas. |

`src/styles/globals.css` aplica los estilos base: fondo, tipografía de cuerpo y tipografía de títulos (`h1` a `h4`).

### Cómo aplicarlo en una pantalla nueva

1. **Usar los componentes compartidos.** Toda pantalla debe construirse con los componentes de `@/shared/components` en lugar de elementos HTML con clases propias. En particular:

   | Necesidad | Componente |
   |---|---|
   | Estructura de la pantalla | `Page` (contenedor) y `PageCard` (tarjeta principal con encabezado de marca, `eyebrow` y `title`) |
   | Tarjetas secundarias | `Card`, `CardTitle` |
   | Formularios | `FormSection` (bloque numerado), `FormField` (etiqueta + control + error/ayuda), `FormActions` (botonera final), `SegmentedRadio` |
   | Controles | `Input`, `Select`, `DateInput`, `Label` |
   | Acciones | `Button` — variantes `primary`, `secondary`, `ghost`; tamaño `lg` para la pantalla de caja |
   | Estados y mensajes | `Alert` (`success` / `error`), `Badge` (`success` / `danger`), `StatusText` |
   | Datos | `Table` y sus subcomponentes, `DataList` (pares etiqueta/valor) |
   | Diálogos | `Modal` |
   | Navegación | `AppHeader`, `SideNav` (se usan desde los layouts) |

2. **Usar los tokens, nunca valores fijos.** Cuando se necesite una clase de Tailwind adicional, se deben utilizar los tokens del tema (`bg-accent-700`, `text-ink`, `border-accent-200`, `font-heading`, etc.). No se admiten colores en hexadecimal, fuentes ni valores arbitrarios escritos directamente en los componentes.

3. **Ajustes puntuales mediante `className`.** Todos los componentes aceptan la prop `className`, que se combina con la receta base mediante la utilidad `cn` (`@/shared/lib/utils`). Se reserva para ajustes de ubicación o espaciado propios de la pantalla (márgenes, anchos, alineación), no para redefinir la apariencia del componente.

4. **Cambios de estética en un solo lugar.** Si un componente necesita una apariencia nueva (por ejemplo, una variante adicional de botón), se agrega como variante en la receta correspondiente de `src/styles/ui/` y queda disponible para todo el proyecto. Las modificaciones globales de color o tipografía se realizan únicamente en `theme.css`.

5. **Componentes nuevos.** Si se necesita un componente reutilizable que todavía no existe, sus clases se definen como receta en `src/styles/ui/` (exportada desde `index.ts`) y el componente se crea en `src/shared/components/`, siguiendo el mismo patrón que los existentes.

> **Contraste**
>
> El naranja principal (`accent` / `accent-500`) no ofrece contraste suficiente con texto blanco. Las superficies con texto blanco (botones primarios, encabezados de tarjeta) utilizan `accent-700`, tal como lo hacen las recetas existentes.

### Convenciones de código

| Qué | Convención | Ejemplo |
|---|---|---|
| Carpetas | kebab-case, en inglés (mismos términos que el backend) | `my-account/` |
| Componentes | PascalCase, `.tsx` | `CustomerSummary.tsx` |
| Hooks | `use` + camelCase | `useCustomerByDocument.ts` |
| Rutas URL | español, sin tildes ni ñ | `/mi-cuenta/misiones` |
| Archivos | inglés, mismos términos que el backend | `create-customer.schema.ts` |
| Imports | alias `@/` desde `src` | `@/shared/api/http` |
| Barrels | solo `features/*/index.ts` | evita ciclos |

Las reglas de capas y de imports se validan con ESLint (`eslint-plugin-boundaries` y `no-restricted-imports`) desde el inicio del desarrollo, para que la estructura se mantenga a medida que más personas trabajan sobre el repositorio.
