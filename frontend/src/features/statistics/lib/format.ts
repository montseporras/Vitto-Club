// Este archivo tiene los formatos de números de la pantalla de estadísticas.
// Los enteros salen de @/shared/lib/numbers; acá solo lo que falta.
import { formatInteger } from '@/shared/lib/numbers';

// Espacio duro: no deja que una línea se parte entre una cifra y su "$" o su "%".
export const NBSP = String.fromCharCode(160);

/**
 * 9751700 → "$ 9.751.700" (como el prototipo: espacio duro entre el $ y la cifra).
 * Los montos de las estadísticas no llevan centavos.
 */
export const formatStatisticsMoney = (value: number) => `$${NBSP}${formatInteger(value)}`;

const ONE_DECIMAL = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 33.333 → "33,3" (un decimal, con coma). */
export const formatOneDecimal = (value: number) => ONE_DECIMAL.format(value);

/** Parte sobre el total, en porcentaje (0 si el total es 0, para no dividir por cero). */
export const percentOf = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

/** 8.46 → "8,5 %"; −3 → "−3,0 %" (un decimal, espacio duro antes del % y el signo menos real). */
export const formatPercent = (value: number) => {
  const text = formatOneDecimal(Math.abs(value));
  return `${value < 0 && text !== '0,0' ? '−' : ''}${text}${NBSP}%`;
};

/** 36.6 → "37 %" (porcentaje entero con espacio duro; lo usa la pestaña Programa, como el prototipo). */
export const formatWholePercent = (value: number) => `${Math.round(value)}${NBSP}%`;

/** newFrequent ÷ new, como porcentaje con un decimal. Sin nuevos: "0,0" (como el prototipo). */
export const conversionPercent = (newFrequent: number, newCustomers: number) =>
  newCustomers > 0 ? formatOneDecimal((newFrequent / newCustomers) * 100) : '0,0';
