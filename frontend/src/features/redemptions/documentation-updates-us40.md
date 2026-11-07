# US-40: cambios de documentación para revisar

Al hacer US-40 ("Confirmar canje", frontend), algunos puntos del contrato y de los documentos
quedaron con huecos. No los modificamos: quedan anotados acá para que el equipo decida si hace falta
cambiarlos.

## 1. Qué se hizo

| Pieza | Dónde | Notas |
|---|---|---|
| Confirmar canje del Cliente: "Confirmar canje" y "¡Canje confirmado!" | `features/my-account/components/ConfirmRedemptionFlow.tsx` | Exportado desde `@/features/my-account`. Lo abre el catálogo (US-39) con la recompensa y el saldo; todavía no hay pantalla que lo haga |
| Caja: "Canjear recompensa" y "¿Aplicar el canje ahora?" | `components/CounterRedeemFlow.tsx` | "Sí, aplicar" abre la ventana de US-42 |
| Caja: "Recompensas a las que puede acceder" | `components/AvailableRewards.tsx`, usado en `features/cashier/components/CustomerActivityPanel.tsx` | Muestra las de `GET /recompensas/disponibles` con `points <= saldo` |
| `POST /customers/me/canjes` y `POST /customers/:id/canjes` | `api/redemptions.api.ts`, hooks `useConfirmMyRedemption` y `useConfirmCustomerRedemption` | Después de confirmar se vuelven a pedir los canjes. Con `REWARD_NOT_AVAILABLE` se refrescan las recompensas |
| Feature `rewards` (tipo y etiqueta) | `features/rewards/` | Tipo `Reward` (§3.1), etiqueta de vencimiento (`RewardExpiryTag`) y `useAvailableRewards`. US-34 y US-39 lo pueden reutilizar |
| Mocks | `mocks/handlers/rewards.handlers.ts` y `confirmRedemptionHandlers` en `redemptions.handlers.ts` | Cada error y cada rol del contrato (§3.7.1) |

## 2. Huecos del contrato (`docs/sprint-4/API_CONTRACT_SPRINT_4.md`)

Lo tiene que decidir el equipo y llevarlo al contrato.

| Sección | Hueco | Qué se hizo mientras tanto |
|---|---|---|
| §3.7.2, "¡Canje confirmado!" | No dice qué se muestra cuando la cuenta regresiva llega a 0 | Se mostró "El canje venció", como el prototipo |
| §3.7.2, Caja | Solo da texto para el saldo y para "La recompensa ya no está disponible.". No dice qué mostrar con `CUSTOMER_INACTIVE` ni con el `404` "No existe la recompensa." | Se muestra el `message` del backend. La decisión es por `code`, no por el texto |
| §3.7.2, Caja | "Validación de pantalla, antes de llamar": no dice si el botón queda deshabilitado | Se dejó Confirmar deshabilitado con el mensaje, igual que en el Cliente. El prototipo muestra el mensaje recién al apretar |
| §3.7.1, respuesta `201` | Dice `{ redemption }` pero no dice qué campos trae en la ruta del Cliente (§3.6.2 oculta varios) | El tipo `ConfirmedRedemption` usa solo lo que ven las dos rutas: `id`, `code`, `createdAt`, `expiresAt`, `status` y `reward` |
| §3.1, etiqueta de vencimiento | Dice "Contorno", "Neutro" y "Destacado", sin colores | Contorno = borde de acento; Neutro = `Badge` neutro; Destacado = `Badge` `accent` |
| §3.3 / §3.7.2, "imagen genérica" | No hay un archivo de imagen genérica | Ícono de regalo sobre fondo degradado, como el prototipo |

## 3. Decisiones de US-40 a pedido de Deni, para llevar al contrato

- `Reward` y su etiqueta de vencimiento viven en `features/rewards`, para que las reutilicen US-34 y
  US-39.
- Los errores de Caja sin texto propio muestran el `message` del backend.
- En 0, la cuenta regresiva dice "El canje venció".
- "Sí, aplicar" abre la ventana de "Registrar uso" (US-42).

## 4. Diferencias encontradas (no se resolvieron)

- **`frontend/CLAUDE.md` §5:** la lista de "Features que ya existen" no tiene `redemptions`.
- **Modales:** `shared/components/ui/Modal.tsx` no se cierra con Escape. Cada modal agrega su propio
  listener; en `redemptions` se hizo un hook (`useEscapeKey`). Convendría resolverlo en el `Modal`.
- **`PATCH /canjes/:code/usar`:** al usar el canje desde "Sí, aplicar", el cliente es el del panel.
  Con el backend real hay que revisar que el saldo se actualice sin esconder la tarjeta (ver
  `documentation-updates-us42.md`, §4).

## 5. Pendiente de otras historias

- **US-39 (catálogo):** montar `ConfirmRedemptionFlow` en el botón "Canjear" de cada tarjeta, pasando
  la recompensa y el `balance` del catálogo, y conectar "Volver al catálogo" y "Ver mis canjes"
  (`/mi-cuenta/canjes`). Probar el refresco del catálogo con `REWARD_NOT_AVAILABLE`.
- **US-42:** "Sí, aplicar" ya abre su ventana.
- **Backend:** repetir el recorrido con `VITE_API_MOCKS=false`.
