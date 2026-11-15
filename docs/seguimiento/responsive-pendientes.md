# Responsive del frontend: qué se hizo y qué queda para el final

> **Rama:** `feature/responsive-base` · **Fecha:** 15/11/2026.
> **Primera tanda (14/11):** solo lo que no toca ninguna historia del Sprint 5. **Segunda tanda (15/11):** a pedido de
> Deni, también las piezas compartidas y las barras de filtros, con cambios **mínimos y puntuales** en las pantallas del
> sprint para reducir conflictos (ver sección 3). Lo que falta queda anotado en la sección 4.
>
> **Cómo se revisó:** lectura del código y compilación (`tsc`, `eslint`, `vite build`). **No se probó en el navegador:**
> falta verificar a 390, 768 y 1024 px con las DevTools (sección 5).

## 1. Puntos de corte

| Ancho | Qué cambia |
|---|---|
| **< 640 px** (celular) | Calendarios centrados en pantalla |
| **< 768 px** | Las **tablas pasan a tarjetas** (una debajo de la otra) |
| **< 1024 px** (tablet y celular) | El **menú lateral queda al costado pero cerrado** (solo íconos). Ingreso y Registro apilan el panel de marca y el formulario |
| **< 1200 px** | Las **barras de filtros** pasan a la opción "Filtros" desplegable |
| **≥ 1024 px** | Todo como antes |

## 2. Hecho

| Zona | Problema | Cambio |
|---|---|---|
| Ingreso y Registro (`AuthLayout`, `AuthShell`) | Entre 768 y ~900 px el formulario bajaba a una segunda fila dentro de una pantalla de alto fijo y quedaba comprimido | El lado a lado y el alto fijo pasan de `md` a `lg` |
| Menú lateral (`SideNav`: Caja, Administración y Configuración) | Debajo de 1024 px ocupaba una columna entera y en el modal de Configuración dejaba el contenido angosto | Queda al costado, **cerrado por defecto** (56 px, solo íconos con su nombre al pasar el cursor). Un botón lo abre y flota sobre el contenido sin achicarlo; se cierra al elegir una opción o al tocar afuera. Lo aplica el propio `SideNav`, así que vale también para el modal de Configuración sin tocar `AdminLayout` más que la dirección del `flex` |
| Tablas (`Table`) | En tablet y celular se cortaban y obligaban a desplazarse de costado | Debajo de 768 px cada fila es una **tarjeta** con una línea por dato, con el título de la columna a la izquierda. `Table.tsx` copia el texto de cada encabezado en `data-label` de sus celdas y `globals.css` da el formato. **Vale para todas las tablas** (Clientes, Recompensas, Canjes, Consumos, Auditoría, ficha del cliente, Empleados, últimas 24 h de Caja) sin tocar cada pantalla |
| Barras de filtros (`FilterBar`: Canjes, Consumos, Auditoría, Clientes y Recompensas) | Al envolver quedaban líneas separadoras sueltas y celdas partidas; con el menú lateral abierto el contenido mide ~800 px aunque la ventana sea de 1100 | **Desde 1200 px** de ancho la barra unida en fila, como antes. **Debajo**, se reemplaza por una opción **"Filtros"** (cerrada al entrar) que se abre y muestra **cada campo en su propio recuadro redondeado**, uno debajo del otro, con "Filtrar" al final. Recompensas pasó a usar el mismo `FilterBar` |
| Filtros de Auditoría y Clientes | Eran campos sueltos, distintos a los del resto | Ahora son la misma **barra unida** que Canjes y Consumos (`FilterBar`/`FilterCell`). Se siguen aplicando al cambiar cada campo (sin botón "Filtrar"); Auditoría conserva "Limpiar filtros" |
| Filtros de Recompensas | Barra armada a mano con la misma falla | Solo clases: en fila desde `lg`, apilada debajo |
| Encabezado (`appHeaderStyles`) | En celular no entraban todos los botones | Pasa a varias líneas si hace falta y los botones tienen menos margen |
| Recuadro de Administración (`AdminPanel`) | 22 px de margen interno en celular | 16 px debajo de `sm` |
| Selectores de fecha | Calendario de 280 px anclado a la izquierda: se salía de la pantalla | En celular se muestra centrado |
| Nombres del menú cerrado | Después de un clic o un toque el nombre quedaba a la vista hasta tocar en otro lado | Se muestra 2 segundos y se oculta solo (animación `vitto-tip`). Con el mouse encima sigue apareciendo al pasar el cursor |
| Estadísticas y reportes | Gráficos de 6 y 7 columnas con etiquetas que se pisaban, filas con anchos fijos, encabezado y pestañas que no entraban | **Celular (< 640 px):** los gráficos "Por día de la semana", "Por franja horaria" y "De los N acreditados…" pasan a **barras horizontales** (una fila por dato: etiqueta, barra, cantidad y monto o porcentaje). Las tortas se apilan (gráfico arriba, referencias abajo). "Recompensas más canjeadas" pone la barra en una segunda línea. Las tarjetas de Puntos van en una columna. Selector de mes, año y "Exportar reporte PDF" envuelven (el botón a todo el ancho). Pestañas más compactas. Encabezados y pies de tarjeta envuelven en vez de desbordarse. **Desde 640 px los gráficos de columnas no cambian** |
| Configuración → Puntos | Tarjetas muy espaciadas: cada dato en su propia fila, con la botonera aparte, y había que hacer scroll | Cada configuración en **una sola línea** con "Guardar" al final de esa misma línea: Equivalencia ("Por cada $ X se otorgan Y puntos"), Niveles (nivel · desde · beneficio, una fila por nivel), Clientes frecuentes y Vigencia **lado a lado**, y Bonificación (modalidad · valor · Guardar). Menos margen entre tarjetas |
| Formularios en modales (Empleados, Clientes, etc.) | Mucho espacio entre secciones y campos | Menos espacio entre secciones, campos y botonera (`formSectionStyles`, `formActionsStyles`, cuerpo del modal) para que entren sin scroll |
| Gráficos de Estadísticas | Colores fuertes que se mezclaban con el texto | **Paleta pastel** en barras, tortas y puntitos (terracota `#dba58d`, turquesa `#8ec5cd`, mostaza `#ecd9a0`, coral `#efb3a2`, durazno `#f9c7b0`, topo `#cdbfb6`). Los textos que resaltan siguen en el tono oscuro. "Recompensas más canjeadas" con letra más chica |
| Números en títulos | Playfair Display dibuja los dígitos "de antes" (el 7 baja, el 2 queda chico), p. ej. el código de un canje | `globals.css` declara `Playfair Display` solo para los dígitos (U+0030–0039) con la fuente Lora, la de los números del resto de la app. Vale para todos los títulos sin tocar cada pantalla |
| Cierre de sesión | Botones apretados a 320 px; se cortaba en pantallas bajas | Una columna debajo de 420 px y el diálogo se desplaza si no entra |

## 3. Archivos del Sprint 5 que se tocaron (revisar al mergear)

Los cambios son de pocas líneas y no tocan la lógica. Si hay conflicto, se resuelve quedándose con las clases de esta rama.

| Archivo | Qué se tocó | Historia que también lo toca |
|---|---|---|
| `AdminLayout.tsx` | Una línea del contenedor (`flex-col` → fila), `aside` y `className` del menú | US-28 (Misiones), US-14 (Notificaciones) |
| `CashierLayout.tsx` | Igual que arriba | — |
| `AuditFilters.tsx` | Se reescribió el bloque de filtros | ARRASTRE-S4 (otros bloques) |
| `CustomersPage.tsx` | Se reemplazó el bloque de filtros (y dos imports) | ARRASTRE-S4, US-33 |
| `styles/ui/form.ts`, `modalStyles.body` | Se redujeron los espacios de formularios y modales (afecta a todos los formularios) | Formularios nuevos del sprint (US-28, US-14, US-34) |
| `features/statistics/*` (páginas y 10 componentes) | Solo clases de Tailwind y las dos listas para celular en `ColumnsChart` y `PointsDestinationCard` | US-51 a US-55 |
| `RewardsAdminPage.tsx` | Clases de las tres celdas del filtro | US-34 |
| `AdminPanel.tsx` | `p-[22px]` → `p-4 sm:p-[22px]` | ARRASTRE-S4 |

## 4. Pendiente (para el final)

| Qué | Dónde | Lo toca |
|---|---|---|
| Vista del Cliente en tablet | `CustomerLayout`: header y barra inferior limitados a 576 px pero el `main` ocupa todo el ancho | US-31, US-33 (pestaña Misiones) |
| Estadísticas (revisión final) | Ya adaptada (ver arriba); al mergear US-51 a US-55 revisar que los gráficos nuevos sigan el mismo criterio | US-51 a US-55 |
| Misiones y Notificaciones | `features/missions`, `features/notifications` | US-28, US-29, US-14 |
| Ficha del cliente | `CustomerDetailPage` (`min-h-[calc(100svh-8rem-3.5rem)]`, `max-w-[460px]`) | US-33 |
| Misiones en Caja y Cliente | Tarjetas y avisos nuevos | US-30, US-31, US-33 |
| Modales de Recompensas (alta y edición) | `RewardCreateModal` (`max-w-[600px]`) | US-34 |
| Tablas nuevas del sprint | Se ven como tarjetas solas si usan `Table`; si arman su propio listado, hay que usar el mismo formato | US-28, US-14 |

**Regla para las pantallas nuevas del sprint:** pensarlas para 390, 768 y 1024 px: grillas con salto
(`grid-cols-1 sm:grid-cols-2`), filas de `flex` con `flex-wrap`, nada de anchos fijos en px sin un `max-w`, listados con el
componente `Table` (así pasan a tarjetas solos) y filtros con `FilterBar`/`FilterCell`.

## 5. Verificación que falta

Con las DevTools (modo dispositivo) a **390, 768 y 1024 px**, en las tres vistas (Cliente, Cajero, Administrador):

1. Ingreso y Registro a 768 px: ¿se ve el formulario completo?
2. Menú de Caja y Administración: ¿empieza cerrado, se abre sobre el contenido y se cierra al elegir una opción?
3. Modal de Configuración (Empleados y Puntos) a 768 y 390 px.
4. Tablas a 390 px: Clientes, Recompensas, Canjes, Consumos, Auditoría (incluido el detalle desplegado) y Empleados.
5. Estadísticas a 390 y 768 px, en las cuatro pestañas (Clientes, Consumos, Puntos y Programa).
6. Barras de filtros a 768 y 390 px: Clientes, Auditoría (con "Rango personalizado"), Canjes, Consumos y Recompensas.
7. Selectores de fecha en celular.
8. Encabezado con "Caja", usuario y engranaje a 390 px.
9. Cierre de sesión y pantalla de despedida a 320 px.
10. Nombres del menú cerrado: que se oculten solos a los 2 segundos.
