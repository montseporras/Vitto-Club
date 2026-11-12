# Ajustes a pantallas de sprints anteriores · Sprint 5 · Vitto Club

> **Para qué es este archivo.** Junta los cambios del Sprint 5 que tocan pantallas hechas en el **Sprint 3**
> (Clientes, Consumos, Auditoría) y en el **Sprint 4** (Recompensas, Canjes). Dice qué cambia, qué texto de los
> contratos y las historias anteriores queda reemplazado y cómo se acepta. Va con el **ARRASTRE-S4** de
> `HISTORIAS_SPRINT_5.md`.
>
> **Armado el 12/11/2026** a pedido de Deni, con los cambios del prototipo de ese día (decisiones **S5-56**,
> **S5-57** y **S5-58** del contrato del Sprint 5, §8.3). Los ajustes del 11/11 (S5-41) siguen en el contrato del
> Sprint 5, §3.13.
>
> **Solo frontend.** El backend no cambia: todos los listados ya aceptan `page` y `limit`.
>
> **Precedencia.** Manda `API_CONTRACT_SPRINT_5.md`. En los puntos de la sección 3, este archivo **reemplaza** lo
> que dicen `API_CONTRACT_SPRINT_3.md`, `API_CONTRACT_SPRINT_4.md`, `HISTORIAS_SPRINT_3.md` y
> `HISTORIAS_SPRINT_4.md`. El resto de esos documentos sigue igual.

---

## 1. Formato común de las pantallas del Administrador (S5-56)

Todas las pantallas del menú de Administración usan el formato de **Auditoría**, que es el modelo:

| Elemento | Cómo queda |
|---|---|
| **Recuadro** | Blanco, borde `#f0d9c4`, radio 18 px, sombra suave, **22 px** de margen interno. Llega **hasta abajo de la pantalla**, con el mismo espacio abajo que arriba (32 px): alto mínimo = alto de la ventana − encabezado − 64 px |
| **Título** | Letra de títulos, **20 px**, negrita (800), marrón `#5a2a14`, 8 px de espacio abajo |
| **Subtítulo** (si tiene) | 13 px, gris `#7a6e63`, pegado al título |
| **Tabla** | Encabezado de 13 px en negrita, mayúsculas, marrón `#7a3a1d` sobre `#fdf0e4`; filas de **14 px** con 10 × 12 px de margen |
| **Paginado** | Abajo del recuadro: "Mostrando a–b de N" (13 px, gris) a la izquierda y **Anterior** · **Siguiente** a la derecha |
| **Nota del prototipo** | No va en la pantalla: está en el menú lateral, plegada (S5-58). **No es parte del diseño** |

Se aplica a: Recompensas, Canjes, Misiones, Clientes, Estadísticas y reportes, Auditoría y Consumos (también la
vista de Consumos del Cajero, que usa el mismo componente). No cambian las ventanas de Configuración ni la
vista del Cliente.

> **Lo que no cambia:** las barras de filtros de cada pantalla (en Recompensas, Canjes, Misiones y Consumos, la
> barra con los campos juntos; en Auditoría y Clientes, los campos sueltos) quedan como están.

## 2. Paginado que entra en la pantalla (S5-57)

En **Recompensas, Canjes, Misiones, Consumos y Auditoría**:

1. La cantidad de filas por página es **la que entra** entre la primera fila de la tabla y el paginado, sin que
   el recuadro pase el borde de abajo de la pantalla. **Mínimo 3.**
2. "Mostrando…", **Anterior** y **Siguiente** quedan **siempre a la vista**, sin bajar.
3. Se recalcula al **cambiar el tamaño de la ventana**. Si la página actual queda fuera del total, se muestra la
   última.
4. La pantalla manda esa cantidad en `limit` (1–100). Si no la puede calcular, usa el valor de antes (10, u 8 en
   Consumos).
5. Una fila que se abre (el detalle de Auditoría) puede hacer crecer el recuadro: ahí sí se baja.

**Implementación sugerida:** un hook compartido, por ejemplo `useRowsThatFit(tableRef, pagerRef)`, con
`ResizeObserver`, que devuelva la cantidad de filas. Para que no oscile entre dos valores con filas de distinto
alto, solo sube cuando entra una fila más del alto mayor de la página y, si después se pasa, queda fijo en el
valor menor hasta el próximo cambio de tamaño. Va en `shared/`: **es pieza compartida, hay que pedir permiso**.

## 3. Qué reemplaza de los documentos anteriores

| Documento | Sección | Decía | Ahora |
|---|---|---|---|
| `API_CONTRACT_SPRINT_3.md` | §3.3.1 Consumos · `limit` | "La pantalla usa `8`" | "La pantalla usa las filas que entran en su alto (mínimo 3)" |
| `API_CONTRACT_SPRINT_3.md` | §3.3.1 Consumos · Pantalla | "Paginación: Mostrando 1–8 de 17" | "Mostrando 1–{n} de N", siempre a la vista (§2 de este archivo) |
| `API_CONTRACT_SPRINT_3.md` | §3.9.4 Auditoría · `limit` | "La pantalla usa `10`" | Las filas que entran en su alto (mínimo 3) |
| `API_CONTRACT_SPRINT_3.md` | §3.9.4 Auditoría · Pantalla | "Paginación: Mostrando 1–10 de N" | "Mostrando 1–{n} de N", siempre a la vista |
| `API_CONTRACT_SPRINT_3.md` | §3.8 Clientes | Sin formato de recuadro | Recuadro y título del §1 (el listado no cambia) |
| `API_CONTRACT_SPRINT_4.md` | §3.2.1 Recompensas · `limit` | "Por defecto `20`. La pantalla usa `10`" | "Por defecto `20`. La pantalla usa las filas que entran en su alto (mínimo 3)" |
| `API_CONTRACT_SPRINT_4.md` | §3.2.1 Recompensas · Pantalla | "Paginado: Mostrando 1–10 de N, con Anterior y Siguiente" | "Mostrando 1–{n} de N", siempre a la vista |
| `API_CONTRACT_SPRINT_4.md` | §3.12.3 Canjes · `page` / `limit` | "La pantalla usa `limit=10`" | Las filas que entran en su alto (mínimo 3) |
| `API_CONTRACT_SPRINT_4.md` | §3.12.3 Canjes · Pantalla | "Paginado: Mostrando 1–10 de N" | "Mostrando 1–{n} de N", siempre a la vista |
| `API_CONTRACT_SPRINT_4.md` | §3.2 y §3.12.3 | Títulos de 24 px en negro y recuadro de radio 24 px con 32 px de margen | Formato del §1 |
| `HISTORIAS_SPRINT_3.md` | Criterios de Consumos (US-23) y Auditoría (US-58) que fijan el paginado de a 8 o de a 10 | Paginado de a 8 / de a 10 | CA-AJ.3 de este archivo |
| `HISTORIAS_SPRINT_4.md` | CA-34.1 (Recompensas) | "Paginado de a 10: Mostrando 1–10 de N" | CA-AJ.3 |
| `HISTORIAS_SPRINT_4.md` | CA-45.8 (Canjes del Administrador) | "Paginado de a 10" | CA-AJ.3 |

No cambia ninguna ruta, parámetro, respuesta ni mensaje de error.

## 4. Qué cambia en cada pantalla

| Pantalla | Sprint | Recuadro y título | Paginado | Otros |
|---|---|---|---|---|
| Clientes | 3 (CLI-ADM) y 4 (CLI-DOC) | Sí | — (no tiene) | El recuadro llega hasta abajo; "+ Registrar cliente" sigue debajo de la tabla |
| Consumos | 3 (US-23) | Sí (también el detalle de un consumo) | Sí | Sigue igual para el Cajero, con el mismo formato |
| Auditoría | 3 (US-58) | Ya lo tenía (es el modelo) | Sí | La nota "cada movimiento se puede abrir…" pasa al menú lateral |
| Recompensas | 4 (US-34 a US-38) | Sí | Sí | La nota de US-34 a US-38 pasa al menú lateral |
| Canjes | 4 (US-45) | Sí | Sí | La nota de US-42 a US-45 pasa al menú lateral |
| Misiones | 5 (US-28) | Sí | Sí | "Simular fin de mes" pasa al menú lateral (solo prototipo) |
| Estadísticas y reportes | 5 (US-51 a US-55) | Sí | — | Rediseño de S5-51 (contrato §3.9.7) |

## 5. Criterios de aceptación

- **CA-AJ.1 [F] Formato común.** En las siete pantallas del §4, el recuadro, el título, el subtítulo y la tabla
  miden y se ven como en Auditoría (§1). Un test visual o una revisión con el prototipo lo confirma.
- **CA-AJ.2 [F] Hasta abajo.** Con una ventana de 1440 × 900 y otra de 1366 × 768, el borde de abajo del
  recuadro queda a 32 px del borde de la pantalla en las siete, aunque la lista tenga pocas filas (si el
  contenido no entra, el recuadro crece; en Estadísticas, todo tiene que entrar sin bajar).
- **CA-AJ.3 [F] Paginado a la vista.** En Recompensas, Canjes, Misiones, Consumos y Auditoría, con más filas
  que las que entran: se ven "Mostrando 1–{n} de N", Anterior y Siguiente **sin bajar**; {n} es al menos 3;
  "Siguiente" muestra las {n} siguientes.
- **CA-AJ.4 [F] Cambio de tamaño.** Al agrandar o achicar la ventana, {n} se recalcula y no queda oscilando.
- **CA-AJ.5 [F] `limit`.** El pedido al backend lleva `limit={n}` (con MSW se ve en el *handler*).
- **CA-AJ.6 [F] Sin cambios de comportamiento.** Filtros, clic en la fila, modales, toasts y textos siguen como
  en su contrato.

**Recorrido del frontend:** abrir cada pantalla en las dos medidas de CA-AJ.2, pasar de página, achicar la
ventana y volver a agrandarla.

## 6. Documentación fuera del repo

Nada: son detalles de pantalla que no están en el Plan de Proyecto, el Seguimiento ni la Definición del
Producto.
