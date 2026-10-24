# CLI-ADM: decisiones y cambios para revisar

Al hacer CLI-ADM ("Clientes" del Administrador, frontend) se tomaron decisiones que no están en
el contrato ni en el prototipo, y se tocó código de otras historias. No se modificó ningún
documento: queda anotado acá para que el equipo decida si hay que corregir el contrato, el
prototipo o la documentación.

## 1. Corrección del contrato: el documento no se edita

**Decisión de Melisa:** al editar un cliente desde "Ver más", **ni el tipo ni el número de
documento se pueden modificar**, tampoco por el Administrador.

| Dónde | Qué dice hoy | Qué hay que cambiar |
|---|---|---|
| `API_CONTRACT_SPRINT_3.md` §3.8.2, tabla de campos | `documentType` / `documentNumber`: "Editables solo por el Administrador" | Que no son editables por nadie |
| `API_CONTRACT_SPRINT_3.md` §3.8.2, "Si el Administrador corrige el documento…" (evento `customer.document-changed`) | La contraseña inicial pasa a ser el documento nuevo | Revisar si sigue haciendo falta |
| `HISTORIAS_SPRINT_3.md`, CA-CLI.4 y CA-CLI.7 | El Administrador edita el documento; corrección de documento con `mustChangePassword` | Ajustar los dos criterios |

En la pantalla, el documento se muestra bloqueado, con el texto "El documento no se puede
modificar." (el que el contrato ya usa para el Cajero), y no viaja en el `PATCH`.

El backend de develop todavía acepta el documento del Administrador. Si se corrige el contrato,
hay que pedir el cambio al backend.

## 2. Código de otras historias que se modificó

| Archivo | De quién | Qué cambió |
|---|---|---|
| `features/cashier/pages/ManualCustomerRegistrationPage.tsx` | US-17-AJ (Maga) | El formulario pasó a `features/cashier/components/CustomerRegistrationForm.tsx`, para que "+ Registrar cliente" use el mismo (CA-CLI.11). La pantalla "Nuevo cliente" de Caja se ve y funciona igual |
| `features/cashier/schemas/create-customer.schema.ts` | US-17-AJ (Maga) | Las reglas de los campos se separaron en `customerFieldsSchema`; `createCustomerSchema` las usa igual que antes. La edición del Administrador toma de ahí nombre, apellido, mail y teléfono |
| `features/cashier/api/customer-errors.ts` | US-17-AJ (Maga) | El cliente dado de baja se reconoce por `code === 'CUSTOMER_INACTIVE'` (contrato §3.8.2) y ya no por el texto "is inactive". Mensaje: "El cliente está dado de baja." |
| `features/cashier/pages/IdentifyCustomerPage.tsx` | US-46 | Acepta `newCustomerPath` (en Administración, "Registrar cliente" lleva a Clientes, §3.1.1) y el documento ya cargado (lo usa "Registrar consumo" de la ficha) |
| `mocks/handlers/cashier.handlers.ts` | US-17-AJ, US-46 | Mocks nuevos de `GET /customers`, `GET /customers/:id`, `PATCH /customers/:id/deactivate`, `PATCH …/activate` (404) y `GET /customers/:id/consumos`. El `PATCH /customers/:id` sigue el contrato: `reason`, `403 FORBIDDEN_FIELD` para el Cajero, `409 CUSTOMER_INACTIVE` en castellano. Se sumaron 20 clientes de relleno para probar el paginador |

**`GET /customers/:id/consumos`:** el endpoint es de US-22 (Deni). Para la ficha se agregaron su
tipo `Consumption` (en `features/customers/types/`) y su mock. Hay que coordinar para no
duplicarlos cuando se haga US-22.

## 3. Lo que no está en el prototipo

- **Paginador** debajo de la tabla de Clientes (`shared/components/ui/Pagination.tsx`): "Página
  X de Y", con los botones "Anterior" y "Siguiente". El contrato pide 20 por página (§3.8.1) y el
  prototipo no tiene controles de página.
- **Búsqueda:** la tabla se filtra mientras se escribe, como el prototipo, pero el pedido a
  `GET /customers?q=…` se manda 300 ms después de dejar de escribir (*debounce*).

## 4. Ficha del cliente ("Ver ficha"), provisoria

Sigue `FichaCliente.html` con rol Administrador. Se ajusta cuando se haga US-19.

| Elemento | Qué hace hoy | Por qué |
|---|---|---|
| "Ajustar puntos" (encabezado y alerta de saldo negativo) | Deshabilitado | El modal es de US-24 |
| "Registrar consumo" | Lleva a "Buscar cliente" de Administración con el cliente ya buscado | El registro del consumo es de US-21 |
| "Ver" (por consumo) y "Ver todos" | Llevan a Consumos y Movimientos de puntos, que muestran "Próximamente" | Son pantallas de US-23 y US-26 |

**Ajustes de estilo según el prototipo:**
- Toda la ficha va en un solo contenedor blanco (encabezado, saldo, datos y pestañas), como el
  prototipo. Antes eran dos tarjetas separadas.
- El saldo actual, el nivel con su barra y "Puntos por vencer" van en un recuadro (`Card`), con
  "Puntos por vencer" separado por una línea. El saldo se muestra a 48 px.
- Los datos del cliente (documento, fecha de alta, email y teléfono) van en dos columnas.
- "Registrar consumo" y "Ajustar puntos" usan el botón grande (`size="lg"`, prototipo `btn-lg`).
- Las filas de las dos pestañas se pintan al pasar el mouse.
- Las pestañas "Últimos consumos" y "Movimientos de puntos" son un control segmentado, como el
  prototipo (`.vc-seg`, hasta 460 px de ancho): el mismo aspecto que el selector DNI/Pasaporte,
  con la pestaña elegida en `accent-700` y texto blanco. Antes eran dos botones sueltos.

## 5. Ajustes de estilo en Clientes

- **Tabla:** la fila se pinta al pasar el mouse (`accent-50` al 60 %, prototipo
  `.table tbody tr:hover`) sin cambiar el cursor, porque la fila no es clickeable.
- **"Ver más" y "Ver ficha"** de cada fila: sin borde, con la variante `ghost` (prototipo
  `btn-ghost`).
- **Modal "Ver más":** diálogo blanco, sin la franja naranja de arriba ni la gris de abajo, con
  la ✕ en la esquina y el nombre del cliente como título (prototipo `.dialog`). "Eliminar" va a
  la izquierda sin borde (`ghost`), y "Cerrar" (con borde) y "Editar" / "Guardar cambios" (con
  fondo) van a la derecha. El aviso "No modificaste ningún dato." va arriba de los botones.
  Solo cambió este modal: el componente compartido `Modal` sigue igual.

## 6. Menú y rutas del Administrador

- **Menú:** las 8 opciones del prototipo, en su orden. Como en el prototipo, "Catálogo de
  recompensas", "Misiones" y "Estadísticas y reportes" quedan deshabilitadas, con la etiqueta
  "Próx.", en gris y sin hacer nada al clic (prototipo `.vc-si-dis` y `.vc-si-tag`). La etiqueta
  se achicó un poco para que "Catálogo de recompensas" entre entero en los 304 px del menú; si
  un nombre no entra, se corta con "…". El resto lleva a su pantalla.
- **Rutas nuevas**, en `app/router/paths.ts`: `/admin/clientes` y `/admin/clientes/:id`
  (Clientes y la ficha), `/admin/buscar-cliente`, y `/admin/recompensas`, `/admin/misiones`,
  `/admin/estadisticas`, `/admin/auditoria`, `/admin/consumos` y `/admin/movimientos`, que
  muestran "Próximamente". De estas, `/admin/buscar-cliente`, `/admin/consumos` y
  `/admin/movimientos` no figuran en la §08 de `docs/architecture/estructura-frontend.md`. Quien
  haga cada pantalla las puede cambiar.
- `/admin` redirige a `/admin/clientes`, la pantalla inicial del prototipo.

## 7. Textos que no están en el contrato ni en el prototipo

- "Cargando…"
- "No se pudo cargar el listado de clientes."
- "No se pudo cargar el cliente."
- "No se pudieron cargar los consumos."
- "No se pudo guardar el cliente."
- "No se pudo eliminar el cliente."
- "Guardando…" y "Eliminando…"
- "Página X de Y", "Anterior" y "Siguiente" (paginador)
- "No modificaste ningún dato." (ya lo usaba la edición de Caja)

## 8. Piezas compartidas nuevas o modificadas

Para tener en cuenta en `docs/architecture/estructura-frontend.md` (§10):

- `shared/components/ui/Pagination.tsx`, con su receta `paginationStyles` (`styles/ui/table.ts`).
- `TableRow` acepta `highlight`: la fila se pinta al pasar el mouse sin ser clickeable
  (prototipo: `.table tbody tr:hover`), con la receta `rowHighlight` (`styles/ui/table.ts`).
- `SideNav` acepta opciones deshabilitadas, con etiqueta (`{ disabled: true, tag: 'Próx.' }`),
  con sus recetas `itemDisabled`, `tag`, `tagCollapsed` y `labelWithTag` (`styles/ui/navigation.ts`).
- `segmentedTabsStyles` (`styles/ui/form.ts`): control segmentado hecho con botones, para
  pestañas. Mismo aspecto que `segmentedStyles` (el de `SegmentedRadio`), que funciona con radios
  y sirve para formularios. Por ahora es solo una receta: si otra pantalla necesita pestañas,
  conviene pasarlo a un componente en `shared/components/`.
- `ComingSoon`: la descripción pasó a ser opcional.
- `icons.ts`: íconos del menú del Administrador (`gift`, `target`, `chart`, `history`,
  `receipt`, `arrowsLeftRight`).
- `shared/lib/dates.ts`: `isoToDisplayDateOnly` (fecha sin hora, en hora de Argentina).
- `shared/lib/numbers.ts`: `formatMoney` (montos con $ y separador de miles).
- `domain/statuses.ts`: estados del consumo y tipos de movimiento de puntos, con las etiquetas
  del contrato (§2.2).
