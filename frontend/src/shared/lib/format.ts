/** Monto en pesos con separador de miles: 50000 → '$50.000'. */
export const formatMoney = (amount: number) =>
  `$${amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`

/** Puntos enteros con separador de miles. El signo menos va con "−" (U+2212). */
export const formatPoints = (points: number) =>
  `${points < 0 ? '−' : ''}${Math.abs(points).toLocaleString('es-AR')}`
