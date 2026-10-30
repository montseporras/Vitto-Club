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
