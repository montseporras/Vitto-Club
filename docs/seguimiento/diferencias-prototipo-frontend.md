# Diferencias entre el prototipo v2 y el frontend (alineación visual)

> Actualización visual sin historia asociada, pedida por Denise Nagel (2026-10-19). Rama
> `feature/frontend-prototype-v2-design`. Alcance: solo apariencia (estilos, disposición y textos) de
> pantallas y componentes que ya existían. No se agregaron pantallas, rutas, endpoints ni mocks.

## Regla aplicada

**Lo programado manda en lo funcional; el prototipo manda en lo visual.** Si algo ya funcionaba y el
prototipo lo muestra distinto, se mantuvo el comportamiento actual y solo se anota acá. No se tocó ninguna
historia, endpoint, mock, tipo ni schema.

## 1. Diferencias que se mantuvieron a propósito

| Pantalla | Qué muestra el prototipo | Qué hace el código | Por qué se mantuvo |
|---|---|---|---|
| Menú de mostrador (Cajero) | "Gestionar canje por código" aparece deshabilitado, con etiqueta "Próx." | El ítem sigue activo y navega a la pantalla de canje | Ya está programado y funciona; el prototipo lo muestra como futuro pero en el código es una historia ya hecha. No se desactiva nada que funcione (regla 7 del CLAUDE.md raíz) |
| Configuración (Administrador) | "Niveles de fidelización" aparece anidado dentro de "Puntos" | Sigue siendo su propia sección en el menú de Configuración | Cambiar la agrupación de secciones es una decisión de navegación/estructura que no está en el contrato; no se reorganizó sin que el equipo lo pida (sección 0 del CLAUDE.md raíz) |
| Ficha de cliente (Cajero) | — | El botón "Editar datos" sigue con ese texto | No había ninguna diferencia de texto que corregir contra el contrato (§8.1); se dejó como está |
| Registrar cliente (alta desde Cajero) | El pie del formulario tiene botón "Cancelar" además de "Registrar cliente" | Solo existe el botón "Registrar cliente" | Hoy esa pantalla no tiene ninguna acción de cancelar programada; agregar el botón sería agregar comportamiento nuevo (navegación), fuera del alcance de "solo apariencia" (PASO 3) |
| Registrarme (autorregistro) | — | El pie no tiene botón "Cancelar" ni la leyenda de campos obligatorios (ese lugar ya lo usa un texto de ayuda: "Ante cualquier duda...") | Para no duplicar mensajes en el mismo lugar se dejó el texto de ayuda existente y no se agregó la leyenda "Los campos marcados con \* son obligatorios" en esta pantalla puntual |

## 2. Diferencias visuales resueltas con componentes/recetas compartidas

Estos cambios se hicieron en `styles/ui/*.ts` y en `shared/components/**`, así que se propagan solos a
todas las pantallas que ya usan esos componentes:

| Componente/receta | Qué se cambió | Pantallas que impacta |
|---|---|---|
| `sideNavStyles` / `sideNavVariants` (`styles/ui/navigation.ts`) + `SideNav.tsx` | Se sacó la tarjeta con borde/fondo/sombra; el ítem inactivo queda transparente, el activo pasa a fondo durazno claro con texto marrón (antes era un botón naranja sólido); se agregó una flecha (`›`) a la derecha de cada ítem, como en `SidebarMenu.html` | Menú del Cajero (`CashierLayout`) y menú "Secciones" dentro del modal de Configuración del Administrador |
| `CashierLayout.tsx` | Se agregó `title="Menú de mostrador"` al `SideNav` (ya existía la prop, solo faltaba usarla) | Menú del Cajero |
| `formSectionStyles` (`styles/ui/form.ts`) + `FormSection.tsx` | Se sacó el círculo numerado; el título pasó a mayúsculas chicas con línea debajo, como "Datos personales"/"Documento"/"Contacto" en el prototipo. Se aplicó igual en alta y edición (decisión de Denise Nagel, ver sección 4) | Registrar cliente, Registrarme, y cualquier formulario con secciones |
| `formFieldStyles` (`styles/ui/form.ts`) + `FormField.tsx` | Los campos obligatorios ahora muestran un `*` junto a la etiqueta (antes no había ninguna marca) | Todos los formularios con `FormField` |
| `formActionsStyles` (`styles/ui/form.ts`) + `FormActions.tsx` | El pie del formulario pasó a tener fondo claro (antes solo tenía una línea arriba) | Todos los formularios con `FormActions` |
| `ManualCustomerRegistrationPage.tsx` | Se agregó la leyenda "Los campos marcados con \* son obligatorios" en el pie, usando la prop `message` que ya existía en `FormActions` | Registrar cliente (Cajero) |
| `pageCardStyles` / `pageCardHeaderStyles` (`styles/ui/layout.ts`) + `Page.tsx` (`PageCard`) | Se sacó la columna naranja grande con el isologo gigante. Ahora el encabezado es una tira clara (durazno pálido) con el título en tinta oscura, como en la pantalla "Registrar cliente" del prototipo. Se agregó una variante `variant="plain"` (sin tira de color, solo título arriba del cuerpo) para pantallas como "Buscar cliente", que en el prototipo (`RegistrarConsumo.html`) no tienen encabezado de color | Registrar cliente (`variant="header"`, por defecto) y Buscar cliente (`variant="plain"`) |
| Nuevo componente `AuthShell` (`shared/components/ui/AuthShell.tsx`) + `authShellStyles` (`styles/ui/layout.ts`) | Se creó este componente para el ingreso y el registro: panel de marca a la izquierda (franja de color con "Vitto Club", título grande y la frase "Sabores de casa, todos los días") + formulario a la derecha, como el split-screen del prototipo. Reemplaza al `PageCard` que usaban antes `LoginPage` y `RegisterPage` | Ingresar, Registrarme |

## 3. Diferencias visuales que no se pudieron resolver igual de bien

- **Color exacto del panel de marca del login/registro:** el prototipo usa un naranja puntual
  (`#b8653d`) que no es ninguno de los tokens de `theme.css`. Se reutilizó el token más cercano que ya
  existe (`accent-600`, `#ca643c`) en vez de inventar un token nuevo que no sale del manual de marca. Si el
  equipo confirma que ese tono sí está en el manual, se puede agregar como token aparte.
- **Isologo tenue en los encabezados claros:** el prototipo pone el isologo en un tono oscuro/sepia muy
  tenue sobre el fondo durazno pálido. El único archivo de isologo que hay en el proyecto es
  `logo-vitto-iso-white.png` (blanco, pensado para fondo naranja fuerte); aplicado sobre el fondo claro
  queda casi invisible. No se agregó un archivo de imagen nuevo porque esa decisión (qué asset usar) no es
  algo que se pueda inventar sin que el equipo lo provea.
- **Texto del título grande del panel de marca (`{{ authPanelTitulo }}` en el prototipo):** no se tiene el
  texto literal exacto que usa esa variable en el prototipo para cada pestaña. Se reutilizó el título que
  ya existía en el código ("Ingresar" / "Registrarme") en vez de inventar un texto nuevo.

## 4. Decisión tomada a pedido de Denise Nagel

- El título de `FormSection` (antes con círculo numerado) se cambió a mayúsculas con línea debajo **para
  todos los formularios, tanto de alta como de edición** (no solo donde el prototipo lo muestra así). En
  el prototipo, la pantalla de edición de cliente usa círculos numerados y la de alta usa el título con
  línea; se unificó en el estilo con línea en todo el código para no tener dos estilos de sección
  convivientes sin que el contrato o el prototipo lo pidan en edición.

## 5. Lo que el prototipo tiene y el frontend todavía no (fuera de alcance de este cambio)

No se tocó nada de esto; queda para las historias correspondientes:

- Pantallas de Administrador: Clientes, Consumos, Movimientos de puntos, Auditoría, Buscar cliente del
  administrador.
- En la búsqueda del Cajero: el formulario de Consumo, y los paneles de saldo, nivel y las 24 h.
- La vista completa de Cliente (inicio, historial, perfil, barra inferior).
- La ventana de cambio de contraseña al primer ingreso.
- Nuevas entradas de menú o secciones de Configuración.

## 6. Inconsistencias de documentación encontradas (no corregidas)

- `frontend/CLAUDE.md` nombra los archivos del prototipo con extensión `.dc.html` (por ejemplo
  `RegistrarConsumo.dc.html`). Los archivos reales en `docs/prototipo/v2/` no tienen esa extensión; son
  `.html` simples (confirmado en `docs/prototipo/v2/LEEME.md`).
- `docs/CONTRIBUTING.MD` tiene un ejemplo de rama con el formato de ticket viejo (`TC-12`), que no es el
  que usa el equipo hoy.

## 7. Verificación hecha

- `npm run lint` (frontend): sin errores.
- `npm run build` (frontend): sin errores (`tsc -b && vite build`).
- **No se hizo el recorrido manual con captura de pantallas** pedido en el PASO 7: este entorno no tiene
  una herramienta de navegador disponible para abrir `npm run dev` y comparar visualmente contra el
  prototipo. Falta que alguien del equipo haga ese recorrido (Login, Registrarme, Buscar cliente, Nuevo
  cliente, Gestionar canje, Configuración → Empleados/Puntos/Niveles, vista de Cliente) antes de dar por
  cerrado el cambio.
