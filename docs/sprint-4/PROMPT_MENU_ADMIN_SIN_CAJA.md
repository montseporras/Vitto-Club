# Prompt — Sacar "Buscar cliente" y "Canjes por código" del menú de Administración

> Copiar desde acá para abajo y pegarlo en Claude Code, en la raíz del repo.

---

> **Nota de precedencia.** Este prompt se escribió antes de las historias del Sprint 4. En lo que toca al **menú de Administración** (orden, nombres y qué entradas existen) lo **supera el contrato §3.13.3 y CA-NAV.1** de `HISTORIAS_SPRINT_4.md`. Ante cualquier choque entre este prompt y el contrato, **manda el contrato** (`CLAUDE.md` §1.1).

Leé `CLAUDE.md` (raíz) y `frontend/CLAUDE.md` antes de empezar.

## Contexto

El Administrador tiene dos paneles:

- **Administración:** el menú lateral de administración.
- **Caja (mostrador):** se entra con el botón "Caja" del encabezado y tiene el mismo menú que el Cajero.

Hoy **"Buscar cliente"** (registrar consumo) aparece en los dos menús. Lo mismo pasaría con **"Canjes por código"** si ya está agregado. Es una funcionalidad de mostrador repetida.

**Decisión de la PO (Deni, 25/10/2026):** estas dos opciones van **solo en Caja**. El Administrador las usa entrando a Caja, como cualquier operación de mostrador. **No se pierde ningún permiso.** En Caja el Administrador sigue siendo `ADMIN` y conserva lo que ya tenía; por ejemplo, anular cualquier consumo, no solo los propios.

El prototipo ya está actualizado en `docs/prototipo/v2/pagina-principal.html`. Ahí `adminNavItems` ya no tiene `consumo` ni `canjeCodigo`.

## Qué hay que hacer

1. **Menú de administración.** Sacá las entradas "Buscar cliente" y "Canjes por código", si existe. Buscá dónde se arma el menú con grep; probablemente esté en `src/shared/components/navigation/` o en la config del layout de administración.
   - El menú de Administración queda en este orden (contrato §3.13.3, CA-NAV.1): **Recompensas · Canjes · Misiones (Próx.) · Clientes · Estadísticas y reportes (Próx.) · Auditoría · Consumos**. No lleva "Movimientos de puntos" (se saca por decisión de la PO; ver `PROMPT_SACAR_MOVIMIENTOS_DE_PUNTOS.md`).
   - **Recompensas** queda habilitada y se llama así (hoy el menú dice "Catálogo de recompensas": renombralo). **Canjes** se agrega. Mientras la historia de cada una no esté hecha, las dos entradas llevan a la pantalla "Próximamente"; cuando se programen, apuntan a sus rutas reales.
2. **Menú de Caja.** No se toca. Sigue con Buscar cliente · Nuevo cliente · Canjes por código, para Cajero y Administrador.
3. **Rutas.**
   - Si existe una ruta de administración que muestra la pantalla de registrar consumo (por ejemplo `/admin/consumo` o similar; buscala en `src/app/router/paths.ts` e `index.tsx`), eliminala.
   - Si alguien entra a esa URL a mano, que **redirija a la ruta de Caja equivalente**. Así no quedan links rotos.
   - Hacé lo mismo con "Canjes por código" si tiene ruta propia de administración.
   - La ruta de Caja tiene que seguir permitiendo `CASHIER` y `ADMIN` en `RoleRoute`.
4. **Links que llevaban a la pantalla de administración.** Buscá con grep todos los `navigate(...)` y `<Link>` que apuntaban a la ruta eliminada. Como mínimo:
   - el botón **"Registrar consumo" de la Ficha del cliente**, cuando la abre el Administrador desde Clientes;
   - cualquier otro acceso desde Consumos o Movimientos que lleve a registrar un consumo.

   Ahora tienen que ir a la **ruta de Caja** con el documento del cliente precargado: el mismo comportamiento que tiene hoy el Cajero, con tipo y número de documento en el estado o en la query, como ya se haga. Al llegar, la pantalla busca sola al cliente.
5. **"Volver" desde Caja** no cambia: vuelve al panel de Administración.
6. **No toques:**
   - los endpoints ni el backend: es un cambio solo de navegación;
   - los permisos del backend;
   - las pantallas de Consumos, Movimientos o Clientes, salvo el destino de los links del punto 4.

## Criterios de aceptación

- **CA-1.** Dado un Administrador en el panel de Administración, cuando mira el menú lateral, entonces **no** ve "Buscar cliente" ni "Canjes por código".
- **CA-2.** Dado un Administrador que entra a Caja, cuando mira el menú, entonces ve "Buscar cliente", "Nuevo cliente" y "Canjes por código", y funcionan igual que antes.
- **CA-3.** Dado un Administrador en la Ficha de un cliente, desde Clientes, cuando aprieta "Registrar consumo", entonces queda en **Caja → Buscar cliente** con ese cliente ya buscado.
- **CA-4.** Dado un Administrador en Caja, cuando anula un consumo registrado por otro empleado, entonces puede hacerlo. El rol sigue siendo `ADMIN`.
- **CA-5.** Dado alguien que abre a mano la URL vieja de administración, entonces lo redirige a la ruta de Caja equivalente, sin error ni pantalla en blanco.
- **CA-6.** Dado un Cajero, entonces su menú y sus rutas no cambian.
- **CA-7.** Dado un Administrador, cuando mira el menú, entonces ve exactamente: Recompensas · Canjes · Misiones (Próx.) · Clientes · Estadísticas y reportes (Próx.) · Auditoría · Consumos. Recompensas y Canjes llevan a "Próximamente" hasta que su historia esté hecha.

## Verificación

- Corré los scripts que **existan** en `frontend/package.json` (`lint`, `typecheck` o `tsc --noEmit`, `test`). Si algún script no existe (por ejemplo, `test`, porque Vitest puede no estar instalado), **avisame en vez de instalarlo o inventarlo**.
- Si hay tests del menú o del router que esperaban las entradas viejas, **actualizalos**. No los borres.
- Recorrido manual con MSW: CA-1 a CA-6, con un usuario `ADMIN` y otro `CASHIER`.
- Al terminar, listame los archivos que cambiaste y las rutas que quedaron redirigidas.

Si encontrás otra pantalla de mostrador repetida en Administración que no esté en esta lista, **preguntame antes de sacarla**.
