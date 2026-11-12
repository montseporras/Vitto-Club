# US-39: cambios de documentación para revisar

Al hacer US-39 ("Consultar catálogo de recompensas", frontend), algunos puntos del contrato y de los
documentos quedaron con huecos. No los modificamos: quedan anotados acá para que el equipo decida si hace
falta cambiarlos.

> **SCRUM-129 en Jira** ("Solicitar Canje", RF-043 / RF-044) junta US-39 (catálogo) y US-40 (confirmar).
> El frontend de US-40 ya estaba hecho; esta rama hace US-39 y conecta las dos. Se siguió la historia de
> `HISTORIAS_SPRINT_4.md` y el contrato, no el texto de Jira (ver §4).

## 1. Qué se hizo

| Pieza | Dónde | Notas |
|---|---|---|
| Catálogo: saldo, aviso de saldo negativo, filtros, tarjetas, vacío y pie | `components/RewardsCatalog.tsx` | "Canjear" abre `ConfirmRedemptionFlow` (US-40) con la recompensa y el `balance` del catálogo |
| Tarjeta de recompensa | `components/CatalogRewardCard.tsx` | Imagen genérica, nombre, descripción (2 líneas), "{n} pts", etiqueta de vencimiento (`RewardExpiryTag`, de US-40) y Canjear |
| Pestaña Canjes con "Mis canjes / Catálogo" | `pages/MyRedemptionsPage.tsx` | **Cambió el 12/11 (pedido de Denise):** abre en Mis canjes, que va a la izquierda; con `?vista=catalogo` abre el Catálogo. "Ver mis canjes" de "¡Canje confirmado!" cambia de vista |
| Inicio: "Tenés un canje para usar" y recompensas | `components/RedemptionToUseCard.tsx`, `components/RewardsPreview.tsx` | **Cambió el 12/11 (pedido de Denise):** `RewardsPreview` reemplazó a `RewardsCard` (se borró) y muestra las primeras 5 recompensas con "Canjear" y el botón "Ver catálogo completo". Antes `RewardsCard` había reemplazado a `RewardsComingSoonCard` (US-19). El router le pasa a `CustomerHomePage` la ruta de Canjes, porque un feature no puede importar rutas de `app/` |
| Historial del Cliente | `pages/MyHistoryPage.tsx` | **Pedido de Denise (12/11):** un solo título y el selector "Consumos / Puntos", una lista por vez. No es de US-39: se anota acá porque vive en el mismo feature |
| `GET /customers/me/recompensas` | `features/rewards/api/`, hook `useMyCatalog(filter)` | La clave cuelga de `['rewards']`: si al confirmar llega `REWARD_NOT_AVAILABLE`, US-40 ya invalida esa clave y el catálogo se refresca solo (CA-40.3) |
| Tipos | `features/rewards/types/reward.ts` | `CatalogFilter`, `CatalogReward` y `CustomerCatalog` |
| Mocks | `mocks/handlers/rewards.handlers.ts` | Los tres filtros con su orden, Inactivas y dadas de baja afuera, la Activa vencida sin procesar llega como Vencida, y 403 para Cajero y Administrador. El saldo sale del mismo lugar que `GET /customers/me/puntos` (`myBalanceOf`, en `my-account.handlers.ts`) |

Recompensas que se sumaron a los mocks: "Licuado de estación" (venció ayer y sigue `ACTIVE`) y "Tostado con
jugo" (vence en 8 días, no tiene que aparecer en "Próx. a vencer").

Para probar: con Lucía (350 pts) se ven "Te faltan 50 pts" (400) y "Te faltan 550 pts" (900). Con Martín
(−120 pts) se ve el aviso de saldo negativo y Canjear queda deshabilitado en todas.

## 2. Huecos del contrato (`docs/sprint-4/API_CONTRACT_SPRINT_4.md`)

Lo tiene que decidir el equipo y llevarlo al contrato.

| Sección | Hueco | Qué se hizo mientras tanto |
|---|---|---|
| §3.5.1, respuesta | El ejemplo de `items` no trae `updatedAt`, pero la §3.1 lo pone como "No nulo" en `Reward` | Se usó el ejemplo: `CatalogReward` es `Reward` sin `confirmedCount` ni `updatedAt`. Si el backend lo manda, no molesta |
| §3.5.1, "Te faltan" | No dice si "Te faltan {n} pts" va también en las Deshabilitadas o con saldo negativo | Solo se muestra si la recompensa se podría canjear y lo que falta es saldo. Con saldo negativo, el aviso de arriba y el tooltip ya explican por qué |
| §3.5.1, aviso de saldo negativo | Dice "arriba del catálogo". En el prototipo está arriba de las dos vistas (Catálogo y Mis canjes) | Se puso solo en el Catálogo: el saldo llega con el catálogo y Mis canjes no depende de él |
| §3.5.1, tooltip | El `title` va en el botón deshabilitado | Va en un `span` alrededor del botón, como el prototipo: varios navegadores no muestran el `title` de un botón deshabilitado |
| §3.5.1, Inicio | "Tenés un canje para usar" pide `GET /customers/me/canjes?status=CONFIRMED`. No dice el orden | Por aclaración de Tomas, se pide con `order=desc` para mostrar primero el más reciente. Si la consulta falla o carga, la tarjeta no aparece y el resto del Inicio sigue igual |
| §3.5.1, filtros | Los botones no tienen estilo definido | Como el prototipo: el elegido en naranja oscuro (y con `aria-pressed`) |
| §3.5.1, Catálogo / Mis canjes | El contrato no nombra el control. El prototipo tiene "Catálogo · Mis canjes" arriba de la pestaña | Se siguió el prototipo y la vista queda en la URL. Desde el 12/11 la vista por defecto es Mis canjes (así "Ver código" del Inicio abre Mis canjes sin parámetro) y `?vista=catalogo` abre el Catálogo |

## 3. Decisiones de US-39 a pedido de Deni, para llevar al contrato

Deni pidió resolver sin preguntar. Estas son las decisiones:

- ~~La pestaña Canjes abre en Catálogo, y `?vista=mis` abre Mis canjes.~~ Desde el 12/11, a pedido de Denise,
  abre en Mis canjes y `?vista=catalogo` abre el Catálogo.
- 12/11, a pedido de Denise: en el Inicio, la tarjeta "Recompensas" pasó a ser las primeras 5 recompensas con
  "Canjear" y un botón "Ver catálogo completo" que se ve siempre (CA-39.6 y §3.5 del contrato dicen otra
  cosa: hay que actualizarlos). Sin recompensas dice "No hay recompensas disponibles por ahora.".
- 12/11, a pedido de Denise: el Historial del Cliente tiene un solo título y el selector "Consumos / Puntos"
  (abre en Consumos, no recuerda la opción); los subtítulos viejos quedan ocultos para lectores de pantalla
  (§3.10.2 del contrato del Sprint 3 los pide visibles).
- "Te faltan {n} pts" solo cuando lo único que falta es saldo (ver §2).
- El aviso de saldo negativo va solo en la vista Catálogo (ver §2).
- Por aclaración de Tomas, la tarjeta de Inicio muestra primero el canje Confirmado más reciente (`order=desc`).
- Por aclaración de Tomas, `CatalogReward` omite `updatedAt`, como en el ejemplo de §3.5.1.
- Se borró `RewardsComingSoonCard` (US-19): CA-39.6 la reemplaza por la tarjeta "Recompensas".
- `CustomerHomePage` ahora recibe `redemptionsPath` del router (igual que `MyProfilePage` con `homePath`).

## 4. Diferencias entre contrato, prototipo, Jira y código (no se resolvieron)

- **Jira SCRUM-129:** dice que al solicitar el canje "se descuentan los puntos y el stock de forma inmediata".
  El contrato dice lo contrario (regla 2, decisión S4-1): confirmar no descuenta nada y se descuenta al
  registrar el uso (US-42). Se siguió el contrato. Es el mismo pendiente **PD-5**.
- **Jira SCRUM-129, puntos insuficientes:** pide "no permite realizar la solicitud". Lo cumple la pantalla
  (Canjear deshabilitado y "Te faltan {n} pts"), no el backend (decisión S4-2, CA-40.2).
- **Saldo del Cliente en los mocks:** el catálogo y el Inicio usan el saldo de `my-account.handlers.ts`;
  Caja usa otro (`pointsByCustomer`). Ya estaba anotado en `documentation-updates-us42.md`. Con el backend
  real el saldo es uno solo.
- **`frontend/CLAUDE.md` §5:** la lista de "Features que ya existen" sigue sin `redemptions`.
- **Tabla de asignaciones (`HISTORIAS_SPRINT_4.md` §0):** US-39 figura "Sin empezar" y sin responsable.
  Hay que completarla.

## 5. Pendiente de otras historias

- **US-34 (Crear recompensa):** cuando exista, el catálogo va a mostrar las recompensas reales. No hay nada
  que cambiar acá.
- **Backend de US-39:** repetir el recorrido con `VITE_API_MOCKS=false` cuando exista
  `GET /customers/me/recompensas`.
