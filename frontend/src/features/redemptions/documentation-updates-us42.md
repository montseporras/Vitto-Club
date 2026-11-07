# US-42: cambios de documentación para revisar

Al hacer US-42 ("Registrar uso del canje", frontend), algunos puntos del contrato y de los documentos
quedaron con huecos. No los modificamos: quedan anotados acá para que el equipo decida si hace falta
cambiarlos.

## 1. Qué se hizo

| Pieza | Dónde | Notas |
|---|---|---|
| Ventana "Registrar uso del canje {código}" | `components/RegisterUseModal.tsx` | La misma para el panel de Caja, "Sí, aplicar" de US-40 y Canjes del Administrador. Queda exportada para "Canjes por código" (US-41) |
| Bloque "Canjes para usar ahora" | `components/RedemptionsToUse.tsx`, usado en `features/cashier/components/CustomerActivityPanel.tsx` | Reemplaza el texto fijo "No tiene canjes." del Sprint 3 |
| `PATCH /canjes/:code/usar` | `api/redemptions.api.ts`, hook `useRegisterRedemptionUse` | Después del uso se vuelven a pedir canjes, movimientos del cliente y recompensas |
| Mocks | `mocks/handlers/redemptions.handlers.ts` (`registerUseHandlers`) | Cada error del contrato y cada rol; descuenta saldo y stock, y agrega el movimiento `REDEMPTION` |
| `redemptionCode` en `PointsMovement` | `features/cashier/types/points.ts`, `features/points-movements/types/points-movement.ts` | Contrato §3.13.2. Los datos de ejemplo llevan `redemptionCode: null` |

Para probar los errores con los mocks: `S5NB7X` (Martín, saldo negativo → `INSUFFICIENT_BALANCE`) y
`J8UC3V` (Sofía, recompensa agotada → `REWARD_NOT_AVAILABLE`).

## 2. Huecos del contrato (`docs/sprint-4/API_CONTRACT_SPRINT_4.md`)

Lo tiene que decidir el equipo y llevarlo al contrato.

| Sección | Hueco | Qué se hizo mientras tanto |
|---|---|---|
| §3.9.2, errores | Dice qué mostrar con `INSUFFICIENT_BALANCE`, `REWARD_NOT_AVAILABLE`, `REDEMPTION_EXPIRED` y `REDEMPTION_NOT_CONFIRMED`. No dice nada de `CUSTOMER_INACTIVE` ni del `404` "Código no encontrado." al usar | Se muestra el `message` del backend, sin "Rechazar canje" y sin Confirmar |
| §3.9.2, "sin botones" | Para `REDEMPTION_EXPIRED` y `REDEMPTION_NOT_CONFIRMED` dice "sin botones". El prototipo (`CanjeAccion.html`) deja "Cancelar" para cerrar la ventana | Se siguió el prototipo: queda solo "Cancelar" |
| §3.9.2, resultado | Pide el mensaje y la tarjeta "Puntos descontados · Saldo". El prototipo suma la fila "Cliente" y, en Canjes del Administrador, un aviso al apretar "Listo" | Se agregó la fila "Cliente" (prototipo). No se agregó el aviso: el contrato no lo pide |
| §3.12.2, panel | Dice que el panel se actualiza al abrirse y después de cada acción, sin polling. No dice qué pasa con "Vence en {n} min" cuando un canje llega a 0 | Igual que Mis canjes (§3.11): al llegar a 0 la lista se vuelve a pedir una vez por canje y el canje desaparece |
| §3.13.2 | Agrega `redemptionCode` a `PointsMovement`, pero ninguna pantalla del Sprint 4 lo muestra | Se agregó al tipo (para que sea idéntico al contrato) y a los mocks. Falta decidir dónde se usa |
| §3.13.2 | "Texto del Cliente en su historial: "Canjeaste {recompensa}"" | No se hizo: ningún criterio de US-42 lo pide. Lo muestra el historial del Cliente, que es de otra historia |

## 3. Decisiones de US-42 a pedido de Deni, para llevar al contrato

- Con un error, el canje no se puede usar desde la ventana: el botón Confirmar desaparece.
- "Rechazar canje" (con saldo insuficiente o recompensa no disponible), "Rechazar" del panel y
  "Rechazar" del modal de Canjes del Administrador abren la ventana de US-43. Como todavía no existe,
  el panel no hace nada y los otros dos solo cierran la ventana. Hay que conectarlos al hacer US-43.
- La cuenta regresiva del panel vuelve a pedir la lista al llegar a 0 (ver §2).

## 4. Diferencias entre contrato, prototipo y código (no se resolvieron)

- **Saldo del Cliente en los mocks:** la pantalla Inicio del Cliente usa un saldo propio
  (`mocks/handlers/my-account.handlers.ts`), distinto del de Caja (`pointsByCustomer` en
  `cashier.handlers.ts`). Registrar el uso cambia el de Caja; el del Cliente no se actualiza.
  Con el backend real no pasa, porque el saldo es uno solo.
- **Cómo se actualiza el saldo en Caja:** la pantalla "Buscar cliente" esconde la tarjeta del cliente
  mientras vuelve a pedir el saldo, salvo que esté en modo "quiet refresh". Si el hook de registrar
  uso invalidara el saldo, la ventana se cerraba sola. Por eso `RegisterUseModal` avisa con `onUsed` y
  el que tiene la tarjeta a la vista (`IdentifyCustomerPage`) vuelve a pedir el saldo en silencio.
- **`CustomerActivityPanel`:** cambió sus props (`customer` y `balance` en lugar de `customerId`, y
  `onBalanceChanged`). Si otra rama del panel está abierta, puede haber conflicto.

## 5. Pendiente de otras historias

- **US-41 (Canjes por código):** `ManageRedemptionPage` sigue siendo un placeholder. Su botón
  "Aplicar" tiene que abrir `RegisterUseModal` con el cliente que devuelve `GET /canjes/:code`.
- **US-43 (Rechazar / cancelar):** ver §3.
- **Backend:** repetir el recorrido con `VITE_API_MOCKS=false` cuando exista `PATCH /canjes/:code/usar`.
