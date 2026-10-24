const INTEGER = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/** 1240 → "1.240"; -350 → "−350" (el signo menos, no el guion). */
export const formatInteger = (value: number) =>
  (value < 0 ? '−' : '') + INTEGER.format(Math.abs(value))

/** Con signo siempre: "+500" o "−500". */
export const formatSignedInteger = (value: number) =>
  (value > 0 ? '+' : '') + formatInteger(value)
