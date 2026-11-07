# US-43: cambios de documentación para revisar

Al hacer US-43 ("Rechazar / cancelar canje", frontend), algunos puntos del contrato y de los documentos
quedaron con huecos. No los modificamos: quedan anotados acá para que el equipo decida si hace falta
cambiarlos.

## 1. Qué se hizo

| Pieza | Dónde | Notas |
|---|---|---|
| Ventana "Rechazar canje {código}" | `components/RejectRedemptionModal.tsx` | La misma para el panel de Caja, "Rechazar canje" de la ventana de US-42 y Canjes del Administrador. Queda exportada para "Canjes por código" (US-41) |
| Motivo del rechazo | `schemas/reject-redemption.schema.ts` | Mismas reglas y mensajes que el backend (§3.10.1): vacío, menos de 5 y más de 500, con el texto recortado |
| Diálogo "Cancelar canje" del Cliente | `features/my-account/components/CancelRedemptionDialog.tsx`, abierto desde `MyRedemptionsPage` | El botón "Cancelar canje" de Mis canjes (US-45) ya existía. Ahora abre este diálogo |
| `PATCH /canjes/:code/rechazar` y `PATCH /customers/me/canjes/:code/cancelar` | `api/redemptions.api.ts`, hooks `useRejectRedemption` y `useCancelMyRedemption` | Después de rechazar o cancelar se vuelven a pedir solo los canjes (también con un error). No se piden saldo, movimientos ni recompensas: no cambian (sin reintegro) |
| Conexiones | `cashier/components/CustomerActivityPanel.tsx` y `pages/RedemptionsAdminPage.tsx` | Los tres botones que US-42 y US-45 dejaron sin conectar ahora abren la ventana: "Rechazar" del panel, "Rechazar canje" de Registrar uso y "Rechazar" del modal "Canje {código}" |
| Mocks | `mocks/handlers/redemptions.handlers.ts` (`rejectCancelHandlers`) | Cada error y cada rol del contrato. Rechazar y cancelar no tocan saldo, movimientos ni stock. Se sumó el canje `B6RW4Y` (Lucía, Confirmado) para probar sin gastar los de US-42 |

Para probar con los mocks:
- **Rechazar:** Caja → Lucía (DNI 40123456) → "Ver canjes…" → Rechazar en `B6RW4Y`.
- **Rechazar después de un error de US-42:** Martín (DNI 38987654) → Registrar uso de `S5NB7X` → "Rechazar canje".
- **Cancelar:** cuenta de Lucía → Canjes → "Cancelar canje".
- **"Ya resuelto":** dejar abierta la ventana sobre `Q4TN8B` (vence a los ~1,5 min de cargar la app) hasta que venza.

## 2. Huecos del contrato (`docs/sprint-4/API_CONTRACT_SPRINT_4.md`)

Lo tiene que decidir el equipo y llevarlo al contrato.

| Sección | Hueco | Qué se hizo mientras tanto |
|---|---|---|
| §3.10.2, errores | No dice qué mostrar con `REDEMPTION_EXPIRED`, `REDEMPTION_NOT_CONFIRMED` ni con el `404` "Código no encontrado." al rechazar | Se muestra el `message` del backend dentro de la ventana, como el prototipo (`CanjeAccion`, alerta roja), y queda solo "Volver". Con un `400` (motivo inválido que pasó la pantalla) se muestra el mensaje y se puede corregir y reintentar |
| §3.10.3, errores del Cliente | Da los textos ("El canje ya venció." / "El canje ya no se puede cancelar.") pero no dice dónde se muestran | El prototipo cierra el diálogo y los muestra en el toast. Se mostraron **dentro del diálogo**, con solo "Volver": el toast de la app es de éxito (lleva un ✓) y un error ahí se lee como si hubiera salido bien. La lista se vuelve a pedir igual |
| §3.10.2, motivo | No dice si el textarea limita a 500 caracteres. US-24 y US-22 usan `maxLength`, así que el error de "más de 500" nunca aparece | No se puso `maxLength`. CA-43.2 pide validar los tres casos en la pantalla y el prototipo muestra el mensaje de más de 500 |
| §3.10.2, chips | No dice si el chip queda marcado ni qué pasa si después se edita el texto | Como el prototipo: el chip elegido queda resaltado (y con `aria-pressed`). Elegir uno borra el error del campo. Editar el texto no desmarca el chip |
| §3.10.2, encabezado | El contrato no lo cita. El prototipo muestra "Cliente: {nombre} · {doc}" y "Recompensa: {nombre} · {n} pts" arriba de la nota | Se siguió el prototipo, con el tipo de documento real |
| §3.10.2, placeholder | No lo cita | Se usó el del prototipo: "Ej: no hay insumos para preparar la recompensa" |

## 3. Decisiones de US-43 a pedido de Deni, para llevar al contrato

Deni pidió resolver sin preguntar. Estas son las decisiones:

- Con un error final (vencido, ya resuelto o código inexistente) desaparece el botón que reintenta
  ("Rechazar" o "Cancelar canje") y queda "Volver". Es lo mismo que se hizo en US-42.
- Los errores al cancelar se muestran dentro del diálogo, no en el toast (ver §2).
- No se limita el textarea a 500 caracteres: se valida y se muestra el mensaje (ver §2).
- "Rechazar canje" de la ventana de US-42 abre la ventana de rechazo con el mismo canje y el mismo
  cliente.
- Rechazar y cancelar no vuelven a pedir saldo ni movimientos: el contrato dice que no cambian.

## 4. Diferencias entre contrato, prototipo y código (no se resolvieron)

- **Jira (SCRUM-132) y backlog:** dicen "reintegrando los puntos y reponiendo el stock". Contradicen la
  regla 5 del contrato (decisión S4-1) y figuran como **PD-5** en `HISTORIAS_SPRINT_4.md`. Se siguió el
  contrato: no hay reintegro.
- **Prototipo, cancelar con error:** muestra el error en el toast (ver §2).
- **`RegisterUseModal` llama a `onClose` después de `onReject`.** Por eso quien lo abre guarda el canje
  en su propio estado antes de que se cierre la ventana. Funciona, pero conviene tenerlo en cuenta al
  reusarla en US-41.
- **`frontend/CLAUDE.md` §5:** la lista de "Features que ya existen" sigue sin `redemptions` (ya anotado
  en US-40).
- **Modales:** `shared/components/ui/Modal.tsx` sigue sin cerrarse con Escape. Se usó `useEscapeKey`,
  como en US-40 y US-42.

## 5. Pendiente de otras historias

- **US-41 (Canjes por código):** `ManageRedemptionPage` sigue siendo un placeholder. Su botón
  "Rechazar" tiene que abrir `RejectRedemptionModal` con el canje y el `customer` que devuelve
  `GET /canjes/:code`. El recorrido del frontend de US-43 incluye "rechazar desde Canjes por código":
  no se pudo hacer porque esa pantalla no existe.
- **US-43, backend:** los rechazos automáticos (CA-43.7: recompensa desactivada o eliminada, cliente dado
  de baja) son solo del backend. En la pantalla se ven como "Rechazado por: Sistema" en Canjes del
  Administrador, cosa que ya resolvió US-45.
- **US-36 y US-38 (frontend):** el aviso antes de desactivar o eliminar una recompensa con canjes
  Confirmados (decisión S4-8) es de esas historias.
- **Backend:** repetir el recorrido con `VITE_API_MOCKS=false` cuando existan `PATCH /canjes/:code/rechazar`
  y `PATCH /customers/me/canjes/:code/cancelar`.
