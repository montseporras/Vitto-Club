# Prompt — Sacar "Movimientos de puntos" del menú de Administración

> Copiar desde acá para abajo y pegarlo en Claude Code, en la raíz del repo.

---

> **Nota de precedencia.** Si algo de este prompt choca con el contrato (§3.13.3) o con CA-NAV.1 de `HISTORIAS_SPRINT_4.md`, **manda el contrato** (`CLAUDE.md` §1.1).

Leé `CLAUDE.md` (raíz) y `frontend/CLAUDE.md` antes de empezar.

## Contexto y decisión

**Decisión de la PO (Deni, 25/10/2026):** se saca la sección **"Movimientos de puntos"** del menú de Administración.

**Por qué:**
- Es una pantalla de **solo consulta**: no tiene ninguna acción.
- Lo único que aportaba frente a otras pantallas era el **saldo resultante** de cada movimiento, y al Administrador no le sirve.
- Hace ruido en el menú.

**Dónde se ven ahora los movimientos:**
- **De un cliente:** en la **Ficha del cliente**, pestaña "Movimientos de puntos". Es el lugar natural para consultarlos.
- **De todos los clientes juntos:** en **Auditoría**, que ya registra acreditaciones, reversiones, canjes, ajustes y vencimientos.

El prototipo ya está actualizado en `docs/prototipo/v2/`:
- `pagina-principal.html`: `adminNavItems` ya no tiene `movimientos`.
- `FichaCliente.html`: la pestaña de movimientos muestra todo, paginado, sin "Ver todos".
- `MovimientosPuntos.html` se elimina.

## Qué hay que hacer

1. **Menú de Administración.** Sacá la entrada "Movimientos de puntos". Buscá dónde se arma el menú con grep. El menú queda así: Recompensas · Canjes · Misiones (Próx.) · Clientes · Estadísticas y reportes (Próx.) · Auditoría · Consumos.
2. **Ruta.**
   - Eliminá la ruta de la página de movimientos de puntos del Administrador, en `src/app/router/paths.ts` e `index.tsx`.
   - Si alguien entra a la URL vieja a mano, que **redirija a Clientes**.
   - Si la URL traía el cliente (por ejemplo `?cliente=<dni>` o similar), que redirija **a la ficha de ese cliente**, con la pestaña "Movimientos de puntos" abierta.
3. **Ficha del cliente, pestaña "Movimientos de puntos" (Administrador).**
   - Sacá el botón **"Ver todos"**, que llevaba a la página eliminada.
   - En lugar de los últimos 5, la pestaña muestra **todos los movimientos del cliente**, paginados de a 10, del más nuevo al más viejo, con "Mostrando 1–10 de N" y los botones Anterior / Siguiente. El paginado aparece solo si hay más de 10.
   - Columnas, igual que hoy: Fecha y hora · Tipo (badge) · Detalle · Puntos (verde +, rojo −). **No se agrega la columna "Saldo resultante".**
   - Usá el endpoint que ya usa la página de movimientos, filtrado por el cliente y con su paginación. Si hay dudas sobre el nombre, revisá el contrato. **No inventes un endpoint nuevo.** Si el endpoint del cliente no pagina, preguntame antes de cambiar el backend.
4. **Ficha del cliente para el Cajero:** **no cambia.** Sigue mostrando solo "Movimientos de las últimas 24 hs".
5. **Código que queda sin usar.**
   - Borrá la página y los componentes que solo usaba la sección eliminada. Mantené los hooks, queries o tipos de la API que ahora usa la ficha.
   - Antes de borrar algo de `src/shared/`, **preguntame**.
   - Sacá también los mocks de MSW que solo servían para esa página, si quedan huérfanos.
6. **Documentación del repo.**
   - En `frontend/CLAUDE.md`, sacá la fila de `MovimientosPuntos.html` de la tabla del prototipo.
   - Si `docs/architecture/estructura-frontend.md` o el contrato mencionan la pantalla, dejá una nota: *"Se sacó del menú de Administración el 25/10/2026; los movimientos se consultan en la ficha del cliente y en Auditoría."*
   - **No cambies el contrato de la API.** Los endpoints siguen existiendo.
7. **No toques** el backend ni la Auditoría.

## Criterios de aceptación

- **CA-1.** Dado un Administrador en el panel de Administración, cuando mira el menú, entonces **no** ve "Movimientos de puntos".
- **CA-2.** Dado un Administrador en la ficha de un cliente con más de 10 movimientos, cuando abre la pestaña "Movimientos de puntos", entonces ve los 10 más recientes, "Mostrando 1–10 de N" y puede pasar de página. No hay botón "Ver todos".
- **CA-3.** Dado un cliente sin movimientos, cuando el Administrador abre la pestaña, entonces ve "Este cliente todavía no tiene movimientos de puntos.".
- **CA-4.** Dado un Cajero en la ficha de un cliente, entonces sigue viendo solo los movimientos de las últimas 24 hs, sin paginado nuevo ni otros cambios.
- **CA-5.** Dado alguien que abre a mano la URL vieja, entonces lo redirige a Clientes, o a la ficha del cliente si la URL lo traía, sin error.
- **CA-6.** Dado un Administrador en Auditoría, cuando filtra por módulo "Puntos", "Consumos" o "Canjes", entonces sigue viendo los movimientos de todos los clientes. No cambia nada.

## Verificación

- Corré los scripts que **existan** en `frontend/package.json` (`lint`, `typecheck` o `tsc --noEmit`, `test`). Si alguno no existe (por ejemplo `test`), **avisame en vez de instalarlo o inventarlo**.
- Si hay tests de la página eliminada, borralos.
- Si hay tests del menú o de la ficha, actualizalos.
- Recorrido manual con MSW, de CA-1 a CA-6, con un usuario `ADMIN` y otro `CASHIER`.
- Al terminar, listame:
  - los archivos borrados;
  - los archivos modificados;
  - la ruta que quedó redirigida.
