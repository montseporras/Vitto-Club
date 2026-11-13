// Este archivo tiene los formatos de números de la pantalla de estadísticas.
// Los enteros y los montos salen de @/shared/lib/numbers; acá solo lo que falta.

const ONE_DECIMAL = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 33.333 → "33,3" (un decimal, con coma). */
export const formatOneDecimal = (value: number) => ONE_DECIMAL.format(value);

/** newFrequent ÷ new, como porcentaje con un decimal. Sin nuevos: "0,0" (como el prototipo). */
export const conversionPercent = (newFrequent: number, newCustomers: number) =>
  newCustomers > 0 ? formatOneDecimal((newFrequent / newCustomers) * 100) : '0,0';
