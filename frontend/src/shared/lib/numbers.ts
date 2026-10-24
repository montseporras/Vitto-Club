const INTEGER = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/** 1240 → "1.240"; -350 → "−350" (el signo menos, no el guion). */
export const formatInteger = (value: number) =>
  (value < 0 ? '−' : '') + INTEGER.format(Math.abs(value))

/** Con signo siempre: "+500" o "−500". */
export const formatSignedInteger = (value: number) =>
  (value > 0 ? '+' : '') + formatInteger(value)

const MONEY = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** 50000 → "$50.000"; 12500.5 → "$12.500,5". */
export const formatMoney = (value: number) => `$${MONEY.format(value)}`
