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

## Cómo actualizarlo cuando cambie el prototipo

1. En Claude Design: Export → **Standalone HTML**.
2. Desde la raíz del repo:
   ```bash
   python scripts/desempaquetar_prototipo.py "ruta/al/archivo-unico.html" docs/prototipo/v2
   ```
3. Si el script avisa `SIN-NOMBRE-xxxx`, hay un componente nuevo: avisá para sumarle su nombre al script.
4. Anotá abajo la fecha, y commiteá.

Si no se actualiza, Claude programa contra una versión vieja.

Último export cargado: **27/10/2026** (pantallas del Sprint 4, a pedido de Denise). Se exportó sobre la
versión editada a mano de esta carpeta: los cambios del 20/10 de abajo siguen incluidos. Se desempaquetó con
un script de Node fuera del repo (el `.py` de arriba sigue sin existir).

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

**Ojo con el paso 2 de arriba:** `scripts/desempaquetar_prototipo.py` no está en el repo.

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

**El archivo único (`../Vitto Club Prototipo - archivo unico.html`) NO se actualizó** con estos cambios: guarda los componentes comprimidos y `scripts/desempaquetar_prototipo.py`, que lo arma, no está en el repo. Hasta que se vuelva a exportar, ese archivo y esta carpeta no coinciden.

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
| `datos-sprint5.js` | Funciones nuevas del prototipo: `completaronMes`, `reenviar` y `enviarPromoAhora` |. Se sacó el registro de auditoría de ejemplo de una promoción

**Diferencias con el contrato del Sprint 5 que hay que llevar al contrato** (el prototipo ya las tiene):

- Promociones sin guardar: el contrato tiene la tabla `promotions`, los endpoints 17 a 22, la auditoría
  `PROMOTIONS_UPDATED` y la tarjeta del Inicio del Cliente (§3.7).
- Reenviar un correo que falló: S5-28 dice "sin reintento" y no hay endpoint.
- Clientes que completaron una misión: el contrato solo trae `completedCount` (§2.3); falta un endpoint o campo
  con la lista.
- Estadísticas por mes: §3.9 pide `fromDate` / `toDate` y `groupBy`; con un mes alcanza con mandar el primer y
  el último día, pero `groupBy` y "por período" dejan de usarse. Los últimos 6 meses de Clientes usan `byMonth`.
- Gráficos de torta: S5-27 dice "tablas y barras con CSS"; las tortas también son CSS (`conic-gradient`), sin
  librería.
- Logo: se sacó de Notificaciones; el contrato lo ubica en Configuración → Notificaciones (US-14).

## Cambios hechos a mano (12/11/2026, a pedido de Denise)

| Dónde | Cambio |
|---|---|
| `Misiones.html` | Botón "Quitar horario" para borrar el horario si te arrepentís. La explicación del tipo de objetivo aparece al pasar el mouse (o al enfocar) el **?**, sin botón que despliega texto. Filtro **Orden**: Más recientes (por defecto) o Más antiguas |
| `Recompensas.html` | Filtro **Orden**: Más recientes (por defecto) o Más antiguas |
| `ConfigNotificaciones.html` | Promociones sale de la lista de mensajes automáticos. "Enviar promoción" arranca **vacío** (Asunto y Mensaje desde cero, con {nombre}), con **Cuándo se envía** (Ahora o Programar fecha y hora) y **Destinatarios** (todos los clientes activos o los de un nivel). Los envíos programados se listan en la tarjeta y se pueden cancelar |
| `Estadisticas.html` | Paleta pastel de la gama del naranja con turquesa y lavanda de apoyo (durazno, turquesa, mostaza, lavanda, terracota; validada para daltonismo). El centro de las tortas se lee mejor. Misiones asignadas: sin la aclaración de que se reclama sola a fin de mes, y "En progreso" solo en el mes en curso. Clientes por nivel: porcentaje de clientes que **subieron de nivel** en el mes. Recompensas más canjeadas: porcentaje sobre el total de canjes usados del mes. "Exportar reporte PDF" abre un modal para elegir las secciones (Clientes, Consumos, Puntos, Programa) con "Seleccionar todo" / "Deseleccionar todo" |
| `datos-sprint5.js` | La plantilla de Promociones queda vacía. Funciones nuevas: `destinatariosPromo`, `programarPromo`, `promosProgramadas`, `cancelarProgramada` y `enviarProgramadas`; dato de ejemplo `subieron` en las estadísticas |

**Más diferencias para llevar al contrato del Sprint 5:**

- Promociones: envío programado (fecha y hora) y destinatarios por nivel; `PROMOTION` deja de ser un mensaje
  automático configurable.
- Estadísticas: `GET /estadisticas/programa` no trae cuántos clientes subieron de nivel en el período.
- Reporte PDF: `GET /estadisticas/reporte.pdf` no recibe qué secciones incluir.
- Misiones y recompensas: el orden Más recientes / Más antiguas no está como parámetro de los listados.
