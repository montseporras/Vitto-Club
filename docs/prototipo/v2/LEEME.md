# Prototipo v2 (fuente de verdad del frontend)

Esta carpeta tiene el prototipo *Vitto Club Prototipo v2*, exportado de Claude Design como
**Standalone HTML** ("archivo único") y desempaquetado.

**Por qué desempaquetado.** El archivo único guarda los componentes comprimidos: Claude no puede buscar
texto adentro. Desempaquetado, cada pantalla es un `.html` que se busca con grep.

| Archivo | Qué tiene |
|---|---|
| `pagina-principal.html` | Login y las vistas Cliente, Cajero y Administrador, Configuración y modales |
| `RegistrarConsumo.html` | Buscar cliente, vista previa, "Consumo registrado" y paneles de 24 hs |
| `FichaCliente.html` | Ficha del cliente |
| `Consumos.html` | Listado y detalle de consumos y modal de anulación |
| `MovimientosPuntos.html` | Movimientos de puntos (Administrador) |
| `Auditoria.html` | Auditoría |
| `MiPerfil.html` | Mi perfil del Cliente |
| `CambiarPassword.html` | Ventana "Cambiá tu contraseña" |
| `SidebarMenu.html` | Menú lateral |
| `Recompensas.html` | Catálogo de recompensas del Administrador y modal Crear / Editar (Sprint 4) |
| `GestionCanjes.html` | Canjes del Administrador y modal "Canje {código}" (Sprint 4) |
| `CanjePorCodigo.html` | Caja → Canjes por código (Sprint 4) |
| `CanjeAccion.html` | Ventanas Canjear, Registrar uso y Rechazar canje (Sprint 4) |
| `ClienteCanjes.html` | Cliente → Canjes: Catálogo y Mis canjes (Sprint 4) |
| `Misiones.html` | Misiones del Administrador: listado, detalle y modales Crear / Editar (Sprint 5) |
| `ClienteMisiones.html` | Cliente → Misiones (Sprint 5) |
| `Estadisticas.html` | Estadísticas y reportes: Clientes, Consumos, Puntos y Programa, con el modal del PDF (Sprint 5) |
| `ConfigNotificaciones.html` | Configuración → Notificaciones: mensajes automáticos, promociones y historial (Sprint 5) |
| `datos-consumos.js`, `datos-canjes.js`, `datos-sprint5.js` | Datos y funciones de ejemplo del prototipo. **No son fuente de verdad** |
| `_componentes.json`, `_empaquetar.mjs`, `_desempaquetar.mjs` | Herramientas para armar y desarmar el archivo único (ver abajo) |

`ConfigPromociones.html` **no existe**: se eliminó el 11/11 (las promociones ya no se guardan).

## Cómo actualizarlo cuando cambie el prototipo

1. En Claude Design: Export → **Standalone HTML**.
2. Desde la raíz del repo, primero en seco (muestra qué archivos cambiarían):
   ```bash
   node docs/prototipo/v2/_desempaquetar.mjs "ruta/al/archivo-unico.html" docs/prototipo/v2 --dry
   ```
   y, si está bien, sin `--dry` para escribir. Solo toca los archivos que cambiaron y conserva sus saltos de
   línea.
3. Si el script avisa `NO AGREGADO`, el export trae un componente que no está en `_componentes.json`: o es uno
   eliminado a propósito (como `ConfigPromociones.html`) o hay que sumarlo a esa lista.
4. Reemplazá el archivo único del repo (`../Vitto Club Prototipo - archivo unico.html`) por el exportado, anotá
   abajo la fecha y commiteá.

Si no se actualiza, Claude programa contra una versión vieja.

Último export cargado: **12/11/2026, a la tarde** (ajustes de pantallas del Sprint 5, a pedido de Denise; ver
la última sección). Se exportó sobre la versión editada a mano: los cambios hechos a mano de abajo siguen
incluidos. Se desempaquetó con `_desempaquetar.mjs`, y esta carpeta y el archivo único coinciden.

**Ojo:** la lógica vieja de canjes de `pagina-principal.html` (estado "Pendiente", 30 minutos, reintegros)
sigue en el código del prototipo sin uso. **No se toma** (contrato del Sprint 4, §8.1 #5): las pantallas
buenas son los cinco componentes nuevos de la tabla.

## Cambios hechos a mano (20/10/2026, a pedido de Denise)

Después del último export, el prototipo se editó a mano para que **las pantallas ya programadas se vean
igual que la app real** (`frontend/`). Se cambiaron los `.html` de esta carpeta **y** el archivo único
(`../Vitto Club Prototipo - archivo unico.html`), que se volvió a empaquetar con el mismo contenido.

> **Cuidado:** si se vuelve a exportar desde Claude Design sin hacer estos cambios allá, se pierden.

**Criterio:**
- Lo que ya está programado se copió de la app: medidas, colores, textos y comportamiento.
- Lo que en el prototipo está completo y en la app todavía dice "Próximamente" **quedó como estaba en el
  prototipo** (por ejemplo, la configuración de Niveles, la vista del Cliente, el panel del Administrador).
- Se mantuvieron las cosas propias del prototipo: el botón "Tipos de datos", las cuentas de prueba del
  ingreso y las notas del prototipo.
- "Buscar cliente" del Cajero sigue siendo el flujo de Registrar consumo del Sprint 3 (todavía no está
  programado); solo se revisó que respete las decisiones ya tomadas.

**Qué cambió:**

| Dónde | Cambio |
|---|---|
| Marco (`pagina-principal.html`) | Encabezado centrado en 1280 px, logo de 36 px y título de 24 px; fondo `#fdf7ee` y texto `#2b1a10`, como la app |
| Menú lateral (`SidebarMenu.html` y `.vc-side`) | Sin fondo blanco, a 24 px del borde, 304 px de ancho (272 px en Configuración), opciones de 48 px y 16 px de letra. Contraído: 80 px y el resaltado es un cuadrado centrado sobre el ícono |
| Nuevo cliente | Mismo diseño que la app (tarjeta "Clientes / Registrar", campos de 48 px, botonera con fondo). Se mantuvo el botón "Cancelar" y el aviso de éxito del Sprint 3 |
| Configuración | Modal de 1280 px y 92 % del alto, con el encabezado y el botón "Cerrar ✕" de la app |
| Configuración → Empleados | Solo empleados activos (los eliminados no se ven ni se reactivan). Columnas Apellido, Nombre, Teléfono y Rol; si la cuenta está desactivada, la etiqueta roja "Desactivado" va pegada al rol |
| Modal del empleado | Mismo diseño que la app. "Eliminar empleado" (aviso: se elimina definitivamente) y "Desactivar cuenta" (aviso: después se puede activar nuevamente). Al registrar un empleado, una casilla permite crear su usuario en el mismo paso |
| Configuración → Puntos | Tarjetas a todo el ancho con título de 24 px y botonera con fondo, como la app. Niveles quedó completo |
| Modales | Todos tienen una cruz para cerrar: "Cerrar ✕" en los de encabezado naranja y una ✕ en la esquina en los demás (incluidos los de `Consumos.html`, `RegistrarConsumo.html`, `FichaCliente.html` y `CambiarPassword.html`) |
| Cerrar sesión | Mismo diálogo que la app: "¿Cerrar sesión?", 448 px y cruz |

Las clases nuevas del prototipo que copian los estilos de la app empiezan con `vc-c-` (pantallas) y
`vc-m` (modales), y están en el `<style>` de `pagina-principal.html`.

## Cambios hechos a mano (27/10/2026, a pedido de Denise)

| Dónde | Cambio |
|---|---|
| `RegistrarConsumo.html` | "Observaciones (opcional)" sale de la pantalla y pasa al modal de confirmación "Registrar consumo" (vista previa, Observaciones con contador "n/255", Cancelar · Aceptar), igual que `ConfirmConsumptionModal.tsx` de la app. "Registrar consumo" valida el monto y abre el modal; "Aceptar" registra |

Este cambio se hizo en el `.html` de esta carpeta **y** en el archivo único (se volvió a empaquetar solo ese
componente, con la misma compresión). Si se vuelve a exportar desde Claude Design sin hacerlo allá, se pierde.

## Cambios de textos (20/10/2026, a pedido de Magali)

Se editaron los `.html` de esta carpeta para alinear el vocabulario con el contrato:

- "Compra" → **"Consumo"** en los textos visibles (títulos, botones, notas, auditoría, tipos de datos). Los estados del consumo pasan a "Registrado" y "Anulado". Los nombres internos del código del prototipo (`registrarCompra`, `compraForm`, `compras`, etc.) **no se tocaron**: no se ven en pantalla.
- "Canjes pendientes" → **"Canjes"** en las pantallas de caja, y "No tiene canjes." (el canje no tiene estado "Pendiente").

**Pendiente (se hace en Claude Design y se vuelve a exportar):** el canje del prototipo todavía nace `Pendiente` y el Cajero lo "confirma". Según la Definición del Producto (sección 9) el canje **nace Confirmado** y pasa a Utilizado, Rechazado, Cancelado o Vencido. Esa lógica sigue en `pagina-principal.html`. En los lotes de puntos falta mostrar el estado "Anulado".

**El archivo único (`../Vitto Club Prototipo - archivo unico.html`) NO se actualizó** con estos cambios: guarda los componentes comprimidos y `scripts/desempaquetar_prototipo.py`, que lo arma, no está en el repo. Hasta que se vuelva a exportar, ese archivo y esta carpeta no coinciden. *(Actualizado el 12/11: se volvió a exportar y desempaquetar, y ahora coinciden.)*

## Cambios hechos a mano (11/11/2026, a pedido de Denise)

Se cambiaron los `.html` de esta carpeta **y** se volvió a armar el archivo único con `_empaquetar.mjs`.
Si se vuelve a exportar desde Claude Design sin hacer estos cambios allá, se pierden.

| Dónde | Cambio |
|---|---|
| `Misiones.html` | Al hacer clic en una misión se abre su **detalle** (datos generales y los clientes que la completaron este mes, con su estado) y el botón "Editar misión". Crear y editar van en **dos modales**: 1) Objetivo (nombre, descripción, tipo, días y horario) y 2) Recompensa y vigencia. El "Tipo de objetivo" tiene un botón **?** que explica Cantidad de consumos y Monto acumulado |
| `ConfigNotificaciones.html` | Se sacó la tarjeta del **logo**. Nueva tarjeta **Promociones**: "+ Enviar promoción" abre un modal (Título, Descripción, vista previa) que manda el correo en el momento, **sin guardar la promoción**. En el historial, las notificaciones que **fallaron** tienen el botón **Reenviar**. El filtro de fechas es un solo campo con calendario, como el de Consumos |
| `ConfigPromociones.html` | **Se eliminó.** Configuración ya no tiene la sección Promociones; tampoco está la tarjeta "Promociones" del Inicio del Cliente |
| Configuración → Puntos (`pagina-principal.html`) | Tarjetas más compactas (clase `vc-pts`): menos aire entre el contenido, el botón y los bordes |
| Panel del Administrador (`pagina-principal.html`) | Se sacó el botón "Volver" del encabezado. Todos los modales tienen su cruz para cerrar (se agregó la que faltaba en "Anular consumo") |
| `ClienteCanjes.html` | En "Mis canjes", "Día específico" y "Rango" pasan a una sola opción "Elegir fechas" con el calendario de Consumos |
| `Estadisticas.html` | El período es **un mes** (Mes y Año), sin fecha de inicio y fin ni selector Día / Semana / Mes. Más gráficos, todos con CSS y con colores pastel: **Clientes** (torta de frecuentes y columnas de los últimos 6 meses), **Consumos** (columnas por día de la semana y por franja horaria, con cantidad y monto), **Puntos** (torta por origen y barras acreditados / canjeados / vencidos / anulados; sin "Ajustes" ni la tabla por mes) y **Programa** (torta de las misiones asignadas por estado, torta de clientes por nivel y barras de recompensas más canjeadas). Todos los números usan la misma letra |
| `Auditoria.html` | El módulo **Misiones** del filtro ya no dice "(Próximamente)" (S5-33) y muestra los registros de `datos-sprint5.js`. Se agregaron las acciones "Regaló puntos de cumpleaños" y "Modificó cliente frecuente"; se sacó "Modificó promociones" (las promociones ya no se guardan) y dos registros de ejemplo viejos de una misión semanal |
| `datos-sprint5.js` | Funciones nuevas del prototipo: `completaronMes`, `reenviar` y `enviarPromoAhora`. Se sacó el registro de auditoría de ejemplo de una promoción |

> **Diferencias con el contrato.** Las que había entre estos cambios y el contrato del Sprint 5 (promociones
> sin guardar, reenvío de correos, clientes que completaron una misión, estadísticas por mes, tortas con CSS y
> logo) **ya están incorporadas al contrato v3** (decisiones S5-34 a S5-50 y §8.1). Ya no hay que llevarlas.

## Cambios hechos a mano (12/11/2026, a pedido de Denise)

| Dónde | Cambio |
|---|---|
| `Misiones.html` | Botón "Quitar horario" para borrar el horario si te arrepentís. La explicación del tipo de objetivo aparece al pasar el mouse (o al enfocar) el **?**, sin botón que despliega texto. Filtro **Orden**: Más recientes (por defecto) o Más antiguas |
| `Recompensas.html` | Filtro **Orden**: Más recientes (por defecto) o Más antiguas |
| `ConfigNotificaciones.html` | Promociones sale de la lista de mensajes automáticos. "Enviar promoción" arranca **vacío** (Asunto y Mensaje desde cero, con {nombre}), con **Cuándo se envía** (Ahora o Programar fecha y hora) y **Destinatarios** (todos los clientes activos o los de un nivel). Los envíos programados se listan en la tarjeta y se pueden cancelar |
| `Estadisticas.html` | Paleta pastel de la gama del naranja con turquesa y lavanda de apoyo (durazno, turquesa, mostaza, lavanda, terracota; validada para daltonismo). El centro de las tortas se lee mejor. Misiones asignadas: sin la aclaración de que se reclama sola a fin de mes, y "En progreso" solo en el mes en curso. Clientes por nivel: porcentaje de clientes que **subieron de nivel** en el mes. Recompensas más canjeadas: porcentaje sobre el total de canjes usados del mes. "Exportar reporte PDF" abre un modal para elegir las secciones (Clientes, Consumos, Puntos, Programa) con "Seleccionar todo" / "Deseleccionar todo" |
| `datos-sprint5.js` | La plantilla de Promociones queda vacía. Funciones nuevas: `destinatariosPromo`, `programarPromo`, `promosProgramadas`, `cancelarProgramada` y `enviarProgramadas`; dato de ejemplo `subieron` en las estadísticas |

> **Más diferencias con el contrato.** También están ya incorporadas al contrato v3: el envío programado y los
> destinatarios por nivel de las promociones (S5-39), `levelUps` en `GET /estadisticas/programa` (S5-47), las
> secciones elegidas del reporte PDF (S5-49) y el parámetro `order` de misiones y recompensas (S5-45).

## Cambios hechos a mano (12/11/2026, a la tarde, a pedido de Denise)

Rediseño y ajustes de pantallas del Sprint 5 (decisiones S5-51 a S5-58 del contrato). El detalle de qué cambia
en cada pantalla ya programada está en `docs/sprint-5/AJUSTES_PANTALLAS_SPRINTS_ANTERIORES.md`. Se cambiaron los
`.html` de esta carpeta **y** el archivo único. Si se vuelve a exportar desde Claude Design sin hacer estos cambios
allá, se pierden.

| Dónde | Cambio |
|---|---|
| `Estadisticas.html` | Rediseño (S5-51, contrato §3.9.7): bloques Clientes, Consumos, Puntos y Programa, con "Conversión de clientes nuevos", "Base vigente", "Saldo neto" y "Tasa de efectividad". Pasa de la paleta pastel con lavanda a la **paleta de la marca** (`#a9532b` y su gama). Todo tiene que entrar en la pantalla, sin bajar |
| Recuadro común del Administrador (clase `vc-pg` en `pagina-principal.html`) | Recompensas, Canjes, Misiones, Clientes, Estadísticas, Auditoría y Consumos (S5-56): recuadro blanco, borde `#f0d9c4`, radio 18 px, 22 px de margen interno, que llega hasta abajo de la pantalla; título de 20 px, negrita, `#5a2a14`. Auditoría es el modelo. Las barras de filtros no cambian |
| Paginado que entra en la pantalla (S5-57) | En Recompensas, Canjes, Misiones, Consumos y Auditoría la cantidad de filas por página es la que entra en el alto (mínimo 3), con "Mostrando…", Anterior y Siguiente siempre a la vista. Se recalcula al cambiar el tamaño de la ventana |
| Notas del prototipo (S5-58) | Salen de las pantallas y quedan **plegadas en el menú lateral**. "Simular fin de mes" también pasó ahí. **No son parte del diseño** |

**Ojo:** los `.html` que quedaron así son los de Recompensas, Canjes, Misiones, Consumos, Auditoría, Estadísticas y
`pagina-principal.html`. Antes de este cambio, esos seis componentes seguían con el marco viejo (radio 24 px,
32 px de margen y título de 24 px).

