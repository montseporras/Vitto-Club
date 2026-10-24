# CLAUDE.md — Frontend de Vitto Club

Este archivo completa al [`CLAUDE.md` de la raíz](../CLAUDE.md). Leé los dos. Si algo de acá choca con el
de la raíz, preguntá.

**Stack:**
- React con Vite y TypeScript.
- Tailwind CSS y shadcn/ui.
- React Router.
- TanStack Query.
- React Hook Form con Zod.
- Axios (una sola instancia, en `src/shared/api/http.ts`).
- MSW para los mocks.

**La estructura y las convenciones** están en `docs/architecture/estructura-frontend.md`. Leelo antes de la
primera tarea.

---

## 1. Dos fuentes de verdad, cada una para lo suyo

| Pregunta | Fuente |
|---|---|
| ¿Cómo se ve? ¿Qué texto dice? ¿Qué campos tiene y en qué orden? ¿Qué pasa al apretar el botón? ¿Qué se muestra vacío? | **Prototipo v2**, en `docs/prototipo/v2/` |
| ¿A qué endpoint llamo? ¿Qué campos mando y cuáles llegan? ¿Qué `code` puede volver y qué muestro? ¿Qué rol ve esto? | **Contrato**, en `docs/sprint-3/API_CONTRACT_SPRINT_3.md` |

**Si no coinciden:**
- Datos, reglas, permisos y mensajes de error → **el contrato**.
- Textos que el contrato cita → **el contrato**, porque ya están corregidos.
- El resto de los textos, la disposición y los estilos → **el prototipo**.

El contrato lista en la **§8.1** las 13 diferencias del prototipo que corrige. Leela antes de cada pantalla.
Algunos ejemplos:
- "Compra" pasa a ser "Consumo".
- Se muestra el tipo de documento real, no "DNI" fijo.
- Se agrega el campo "Observaciones".
- Se saca la columna "Puntos" en Clientes.
- El teléfono lleva entre 8 y 15 dígitos.
- La pantalla pide la contraseña actual para cambiar el correo.

**Si una pantalla, un texto o un estado no está en ninguna de las dos fuentes, preguntá.** No lo diseñes vos.

---

## 2. Cómo leer el prototipo

`docs/prototipo/v2/` es el export de Claude Design. **Usá solamente estos archivos:**

| Archivo | Qué tiene |
|---|---|
| `pagina-principal.html` | Login y las tres vistas (`view === 'login' \| 'cliente' \| 'empleado' \| 'admin'`), la configuración y los modales. Pesa unos 350 KB: **buscá con grep, no lo leas entero** |
| `RegistrarConsumo.html` | "Buscar cliente", la tarjeta del cliente, el monto, la vista previa, "Consumo registrado" y los paneles de 24 h |
| `FichaCliente.html` | Ficha del cliente (Cajero y Administrador) |
| `Consumos.html` | Listado y detalle de consumos (Administrador) y el modal de anulación |
| `MovimientosPuntos.html` | Movimientos de puntos (Administrador) |
| `Auditoria.html` | Auditoría (Administrador) |
| `MiPerfil.html` | Mi perfil del Cliente |
| `CambiarPassword.html` | Ventana "Cambiá tu contraseña" que se abre al ingresar (§3.11.3) |
| `SidebarMenu.html` | Menú lateral de mostrador y de administración |

`docs/prototipo/v2/LEEME.md` explica cómo se desempaquetó la carpeta y qué se cambió a mano. Leelo si
algo del prototipo no coincide con la app.

**No uses** `docs/prototipo/Vitto Club Prototipo - archivo unico.html`: guarda los componentes
comprimidos y no se puede buscar con grep. La carpeta `v2/` es su versión desempaquetada.

**Puntos de búsqueda en el archivo principal:**

| Vista | Qué buscar |
|---|---|
| Cajero | `empleadoScreen === 'consumo'`, `'cliente'`, `'altaCliente'` |
| Administrador | `adminScreen === 'consumo'`, `'consumos'`, `'clientes'`, `'movimientos'`, `'auditoria'` |
| Configuración | `configScreen === 'config'`, `'empleados'` |
| Cliente | `clienteTab === 'historial'`, `'perfil'` |

Los componentes se insertan con `<dc-import name="RegistrarConsumo" …>`. Para encontrar un texto, buscalo
literal. Por ejemplo: `grep -n "Ver movimientos de las últimas 24 hs" docs/prototipo/v2/*.html`.

**Lo que se toma del prototipo:**
- la disposición;
- los textos;
- los estados vacíos;
- los modales y diálogos de confirmación;
- los toasts;
- el orden de las columnas;
- qué botón aparece para cada rol.

**Lo que NO se toma del prototipo:**
- **Sus datos:** clientes, saldos, consumos, cuentas demo y `consumos-store.js`.
- **Sus cálculos:** puntos, saldo, nivel y plazo de 24 h. Todo eso viene del backend.
- **Su código:** no es React. Se reproduce con los componentes de `src/shared/components/`.

> **El prototipo puede cambiar.** Si el archivo de la carpeta no coincide con lo que dice
> `HISTORIAS_SPRINT_3.md` (por ejemplo, porque falta una pantalla o un texto), frená y preguntá si hay
> un export más nuevo.

---

## 3. Paso a paso de una historia de frontend

1. **Contrato.**
   - Anotá los endpoints de la historia.
   - Anotá la forma exacta de cada respuesta.
   - Anotá cada fila de la tabla de errores: `code` y mensaje.
2. **Prototipo.** Buscá las pantallas de la historia y anotá:
   - los textos;
   - los campos;
   - los botones por rol;
   - los estados vacíos y de error.

   Lo que choque con el contrato va al Plan previo, con lo que manda según la sección 1.
3. **Tipos** en `features/<feature>/types/`. Tienen que ser **idénticos** al contrato:
   - los mismos nombres;
   - los nulos (`string | null`);
   - los enums como uniones de strings (`'REGISTERED' | 'VOIDED'`).
4. **Mocks de MSW** en `src/mocks/handlers/<feature>.handlers.ts`, registrados en
   `src/mocks/handlers/index.ts`. Tienen que simular **lo que hace el backend según el contrato**, no lo
   que hace el prototipo:
   - la respuesta de éxito, con la forma completa;
   - **cada error** de la tabla del contrato, con su status y su `code`;
   - las reglas por rol: al Cajero se le fuerza `last24h`, y recibe `403` donde corresponde;
   - la paginación `{ items, total, page, limit }`.

   Los datos de ejemplo pueden inspirarse en los del prototipo, pero tienen que respetar las reglas. Un
   ejemplo: un cliente con consumos no recibe bonificación.
5. **API** en `features/<feature>/api/`:
   - `<feature>.api.ts` hace las llamadas con `http`, de `@/shared/api/http`;
   - `<feature>.keys.ts` tiene las claves;
   - `<feature>.queries.ts` tiene los hooks de TanStack Query.

   Después de una mutación, invalidá las consultas afectadas. Por ejemplo, al registrar un consumo:
   puntos, consumos y movimientos del cliente.
6. **Schemas de Zod** en `features/<feature>/schemas/`. Los mensajes son **los del contrato**; si el
   contrato no los cita, los del prototipo. La validación de la pantalla **nunca puede ser más estricta que
   la del backend**.
7. **Componentes y página** según el prototipo, en `features/<feature>/components/` y `pages/`. Usá lo que
   ya existe en `src/shared/components/`:
   - `ui/`: `Button`, `Input`, `Select`, `Card`, `Page`, `Modal`, `Table`, `Badge`, `Alert`, `DataList`,
     `DateInput` y `PasswordInput`;
   - `forms/`;
   - `feedback/`;
   - `navigation/`.

   Si te falta un componente, preguntá antes de crearlo en `shared/`.
8. **Ruta.**
   - La constante va en `src/app/router/paths.ts`.
   - La ruta va en `src/app/router/index.tsx`, con `lazy()` y `RoleRoute`, y los roles que dice el contrato.
   - La entrada del menú, solo para los roles que la ven en el prototipo y el contrato.
9. **Recorrido manual con mocks**, criterio por criterio de la historia (sección 6).
10. **Verificación** (sección 6).

---

## 4. Reglas del frontend que no se negocian

1. **No calcules lo que calcula el backend:**
   - puntos, bonificación y saldo resultante (usá `GET /consumos/preview`);
   - nivel y progreso;
   - si se puede anular (`canVoid`);
   - las 24 h.

   **Hay solo dos excepciones:** la vista previa del modal "Ajustar puntos" (§3.5) y el saldo resultante del
   modal "Anular consumo" (§3.2.2). Las dos están escritas en el contrato.
2. **Decidí por `code`, nunca por el texto del error.** Usá `ApiError` y `toApiError` de
   `@/shared/api/ApiError`. `message` puede ser un arreglo, y `details` marca el campo con el error.
3. **Roles:**
   - Se tipan con `Role` de `@/domain/roles` (`'ADMIN' | 'CASHIER' | 'CUSTOMER'`).
   - Las etiquetas salen de `ROLES`.
   - No escribas "Cajero" ni "Administrador" a mano.
   - Que un botón no se vea no reemplaza al `403` del backend: hacen falta las dos cosas.
4. **Fechas:**
   - La API manda ISO UTC.
   - La pantalla muestra `dd/mm/aaaa hh:mm`, en hora de Argentina.
   - Los filtros mandan `YYYY-MM-DD`.
   - Usá o extendé `@/shared/lib/dates`. No metas una librería nueva.
5. **Montos:**
   - El input acepta `50000`, `50.000`, `12500,50` y `12.500,50`.
   - Antes de enviarlo, se convierte a número JSON (§3.1.3).
   - Se muestra con `$` y separador de miles.
6. **Puntos:** siempre enteros. En los movimientos van con signo: verde si es +, rojo si es −. El saldo
   negativo va en rojo.
7. **Tipo de documento real.** Mostrá "DNI" o "Pasaporte" según `documentType`. Nunca "DNI" fijo.
8. **Lo de otros sprints** (canjes, recompensas, misiones, foto) se muestra **exactamente** como dice el
   contrato: "Próximamente", un botón deshabilitado o un texto fijo. Usá `ComingSoon` si corresponde.
9. **Imports:**
   - Usá el alias `@/`.
   - Un feature importa otro **solo** desde su `index.ts` (`@/features/<nombre>`).
   - `shared/` no importa nada de `features/`. ESLint (`boundaries`) lo controla.
10. **Accesibilidad:**
    - Cada input tiene su `label`.
    - Los errores van asociados al campo con `aria-describedby`.
    - Los botones de solo ícono llevan `aria-label`.
    - Los modales tienen foco y se cierran con Escape.
    - El color no puede ser la única señal: un saldo negativo, además de rojo, lleva el signo "−".
11. **Responsive.** La vista del Cliente es para celular: barra inferior fija y perfil desde el ícono
    superior (§3.10). Las del Cajero y el Administrador, para la computadora de la caja.
12. **No toques `backend/`.**
13. **No instales dependencias** (tampoco una librería de componentes o de fechas) sin permiso.

---

## 5. Carpeta de cada pantalla

Cada historia de `HISTORIAS_SPRINT_3.md` indica la **carpeta del feature**. Si está vacía o dice
"a confirmar", preguntá antes de crearla.

Features que ya existen:
- `auth`
- `employees`
- `cashier`
- `points` (configuración de puntos)
- `customers`
- `levels`
- `audit`
- `my-account`
- `rewards`
- `missions`
- `notifications`
- `statistics`

---

## 6. Verificar (desde `frontend/`)

```bash
npm run lint      # ESLint (incluye boundaries)
npm run build     # tsc -b + vite build: tiene que compilar sin errores
npm run dev       # con mocks (VITE_API_MOCKS distinto de 'false'), para el recorrido manual
```

**Hoy el frontend no tiene un framework de tests instalado.** No instales Vitest ni Testing Library por tu
cuenta. Si el equipo decide sumarlos, te lo va a pedir.

Mientras tanto, la verificación es un **recorrido manual con mocks**. Por cada criterio de la historia:
1. qué hiciste;
2. con qué rol;
3. qué viste.

También probá:
- **cada `code` de error**, forzándolo en el handler de MSW;
- **cada rol que ve la pantalla**, con las cuentas demo de los mocks;
- **el estado vacío** y **el de carga**.

Si el backend de la historia ya existe, repetí el recorrido con `VITE_API_MOCKS=false`
(`docs/SETUP.md`, §3.1) y anotá las diferencias. No las "arregles" en el frontend si el que no cumple el
contrato es el backend.
