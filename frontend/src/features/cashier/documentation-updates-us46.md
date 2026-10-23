# US-46: cambios de documentación para revisar

Al hacer US-46 ("Buscar cliente" del Mostrador, frontend), algunos documentos quedaron
desactualizados o con huecos. No los modificamos: quedan anotados acá para que el equipo
decida si hace falta cambiarlos.

## 1. `docs/architecture/estructura-frontend.md`

| Sección | Qué dice hoy | Qué cambió en el código | Propuesta |
|---|---|---|---|
| §10, tabla de componentes | `PageCard` es la tarjeta principal "con encabezado de marca, `eyebrow` y `title`" | `eyebrow` es opcional (`shared/components/ui/Page.tsx`). "Buscar cliente" no lo usa: muestra el título y debajo el subtítulo "Cliente" con una línea, como el prototipo | Aclarar que `eyebrow` es opcional |
| §10, tabla de componentes | `Badge` tiene las variantes `success` y `danger` | También existían `alert` y `neutral`, y se agregó `accent` (`styles/ui/badge.ts`) para el nivel ("Nivel Plata") | Listar las cinco variantes |
| §10, tokens | La paleta es `accent`, `olive`, `beige`, `sage` y `neutral` | Se agregó `--color-negative: #b3261e` (`styles/theme.css`), el rojo del prototipo para puntos negativos y saldo negativo. No está en el manual de marca | Sumar `negative` a la paleta |
| §10, recetas | — | Se agregó `formSectionTitleStyles` (`styles/ui/form.ts`) para el título de un bloque con línea debajo, y `pointsToneStyles` (`styles/ui/layout.ts`) para el verde y el rojo de los puntos | Opcional: mencionarlas |
| §03, árbol | `shared/lib/`: "utilidades (cn, fechas, formateadores es-AR)". `shared/types/`: "Paginado<T>, ApiResponse<T>" | Se agregaron `shared/lib/numbers.ts` (enteros con separador de miles y signo "−") y `shared/types/pagination.ts` (`Paginated<T>`, en inglés por la regla de idioma) | Opcional: nombrar los archivos y usar `Paginated<T>` |

## 2. Diferencias del documento que ya existían antes de US-46

No se resolvieron. Son para decidir si se corrige el documento o el código.

| Sección | Qué dice | Qué hay en el código |
|---|---|---|
| §04, tabla de layouts | `CashierLayout`: "Pantalla completa, botones grandes, sin sidebar" | El mostrador tiene menú lateral desde SCRUM-57, a pedido del equipo |
| §08, Cajero | La identificación del cliente está en `/caja` | Está en `/caja/cliente`; `/caja` redirige ahí |
| §09 c | Los datos del cliente se modelan como "una unión discriminada (un tipo por vista)" | No está implementado: `GET /customers/by-document` devuelve el `Customer` completo. En US-46 la tarjeta de caja recibe solo nombre y documento (`Pick<Customer, …>`), pero el tipo por vista no existe |

## 3. `frontend/CLAUDE.md`

| Sección | Qué dice | Qué hay |
|---|---|---|
| §2, archivos del prototipo | `Vitto Club Prototipo v2.dc.html`, `RegistrarConsumo.dc.html`, etc. | En `docs/prototipo/v2/` los archivos son `pagina-principal.html`, `RegistrarConsumo.html`, etc. (sin `.dc`) |

## 4. Huecos del contrato (`docs/sprint-3/API_CONTRACT_SPRINT_3.md`)

Lo tiene que decidir el equipo y llevarlo al contrato.

| Sección | Hueco | Qué se hizo mientras tanto |
|---|---|---|
| §3.4.1, `level.nextMinPoints` | No dice qué vale en el nivel Oro, que no tiene siguiente. Sí lo dice para `next` (`null`), `pointsToNext` (`0`) y `progressPercent` (`100`) | El tipo es `number \| null` y el mock manda `null`, igual que BASE en la rama `consumo` (`calculateLevel`). Ninguna pantalla del Sprint 3 lo usa |
| §3.4.1, `level.progressPercent` | No dice si se redondea o se trunca (`points` sí dice que se trunca) | El mock usa `Math.round`, igual que BASE |
| §3.1.4, panel de canjes y recompensas | El texto fijo "No tiene puntos suficientes…" se muestra a todos hasta el Sprint 4, aunque el cliente tenga saldo (por ejemplo, 1.250 pts). Un cajero lo puede tomar como un dato real | Se dejó como dice el contrato. Opciones: (a) dejarlo; (b) mostrar "Próximamente", como las otras funciones del Sprint 4; (c) sacar el bloque hasta el Sprint 4 |

## 5. Textos que no están en el contrato ni en el prototipo

Melisa los aprobó; conviene sumarlos al prototipo o al contrato:

- "Cargando…", mientras se cargan los movimientos del panel.
- "No se pudieron cargar los movimientos.", si falla `GET /customers/:id/movimientos`.
- "No se pudo buscar el cliente.", si falla `GET /customers/:id/puntos` (es el texto que ya se usaba cuando falla la búsqueda por documento).

## 6. Decisiones de US-46 para llevar a `HISTORIAS_SPRINT_3.md`

- **P3:** en "Buscar cliente" del Mostrador se sacó "Editar datos" (decisión de Melisa). En Administración no se cambió nada.
- **P5:** US-47 ("resumen del cliente en 2 segundos") entra como criterio de US-46 (decisión de Melisa).
- `EditCustomerForm`, `useUpdateCustomer` y el mock `PATCH /customers/:id` quedaron sin uso. Se dejaron por si los reutiliza Clientes del Administrador (CLI-ADM): falta decidir si se borran.
