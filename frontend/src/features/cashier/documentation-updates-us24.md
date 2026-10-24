# US-24: decisiones y cambios para revisar

Al hacer US-24 ("Ajustar puntos", frontend) se tomaron decisiones que no están en el contrato ni
en el prototipo. No se modificó ningún documento: queda anotado acá para que el equipo decida si
hay que corregir el contrato, el prototipo o la documentación.

## 1. Dónde está el modal y desde dónde se abre

- El modal es `features/cashier/components/AdjustPointsModal.tsx`, en la carpeta que
  `HISTORIAS_SPRINT_3.md` (§0) le asigna a US-24 ("modal de la ficha"). Se exporta desde
  `features/cashier/index.ts` para que lo use cualquier ficha.
- Hoy lo abre la **ficha del Administrador** (`features/customers/pages/CustomerDetailPage.tsx`,
  de CLI-ADM), con los dos botones "Ajustar puntos": el del encabezado y el de la alerta de saldo
  negativo. Antes estaban deshabilitados.
- La ficha del Cajero (US-19) todavía no existe. Como el ajuste es solo del Administrador
  (CA-24.1), esa ficha no tiene que mostrar el botón.
- Como hoy solo lo usa la ficha del Administrador, se puede evaluar moverlo a
  `features/customers`.

## 2. Diferencia entre el prototipo y el contrato

| Tema | Prototipo | Contrato | Qué se hizo |
|---|---|---|---|
| "Restar" más que el saldo | "Confirmar ajuste" sigue habilitado | §3.5.1: si la vista previa da < 0, se deshabilita y se muestra "No se puede restar más que el saldo disponible." | Lo que dice el contrato |

## 3. Huecos del contrato que se completaron (decisiones de Melisa)

| Sección | Hueco | Qué se hizo |
|---|---|---|
| §3.5.1, `points` | Fija el máximo de 1.000.000, pero no da mensaje | Texto nuevo: "El máximo es 1.000.000 puntos." |
| §3.5.1, `reason` | Fija el máximo de 500 caracteres, pero no da mensaje | El campo no deja escribir más de 500 (`maxLength`), así que no hace falta mensaje |
| §3.5.1, errores sin texto | 403, 404 o un error de red no tienen mensaje | "No se pudo aplicar el ajuste.", junto con lo que manda el backend |

Hay que llevar al contrato el mensaje del máximo de puntos.

## 4. Textos que no están en el contrato ni en el prototipo

- "El máximo es 1.000.000 puntos."
- "No se pudo aplicar el ajuste."
- "Aplicando…" (mientras se confirma)
- "Cargando…" (mientras se pide el saldo)

## 5. Comportamiento

- **Vista previa:** "Saldo: X pts → Y pts", calculada en la pantalla (la única cuenta que la §3.5
  permite). El saldo actual sale de `GET /customers/:id/puntos`. Si la cantidad todavía no es un
  entero, la vista previa deja el saldo igual. Un resultado negativo va en rojo y con "−".
- **Restar con saldo negativo:** la vista previa siempre da < 0, así que "Confirmar ajuste" queda
  deshabilitado (decisión #1).
- **"Regularizar a 0":** solo con saldo negativo. Completa Sumar, el valor absoluto del saldo y el
  motivo "Regularización por anulación de consumo".
- **Después de confirmar:** se cierra el modal y aparece el toast "Ajuste aplicado: {±n} pts.
  Nuevo saldo: {n} pts.", armado con la respuesta del backend (`movement.points` y
  `balanceAfter`). Se vuelve a pedir todo lo del cliente (saldo, nivel, movimientos y consumos,
  claves `['customers', id]`) y los movimientos de puntos de US-26 (claves `['points-movements']`).
- **Errores:** se decide por `code`. `CUSTOMER_INACTIVE` e `INSUFFICIENT_BALANCE` muestran el
  texto del contrato.

## 6. Mock

`mocks/handlers/cashier.handlers.ts` simula `POST /api/customers/:id/ajustes-de-puntos`:

- 401 sin token y 403 `FORBIDDEN` para el Cajero y el Cliente;
- 400 con los mensajes del contrato (cantidad vacía, no entera o ≤ 0, motivo vacío);
- 404 si el cliente no existe y 409 `CUSTOMER_INACTIVE` si está dado de baja;
- 409 `INSUFFICIENT_BALANCE` si se resta más que el saldo o con saldo negativo.

Al ajustar, actualiza el saldo del mock: Sumar cancela primero la deuda y lo que sobra crea un lote
a 12 meses; Restar descuenta FIFO. No toca los puntos acumulados (el nivel no cambia) y agrega el
movimiento `MANUAL_ADJUSTMENT`.

## 7. Componente compartido nuevo

- `shared/components/ui/Textarea.tsx`, con la receta `textareaStyles` (`styles/ui/input.ts`):
  campo de varios renglones con el mismo aspecto que `Input` (borde, foco, error y solo lectura),
  alto libre que se puede agrandar hacia abajo y 2 renglones por defecto. Se agregó a pedido de
  Melisa. Lo puede usar también el motivo de anulación (US-22).
- Para `docs/architecture/estructura-frontend.md` (§10): sumar `Textarea` a la fila de Controles.
