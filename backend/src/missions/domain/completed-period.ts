import { DomainError } from './errors/domain.error.js';
import { shiftMonth } from './mission.js';

// US-29 (contrato S5 §3.1.7): el mes de GET /misiones/:id/completadas. Sin valor, el mes actual. Vale
// el mes actual y los 11 anteriores, "los últimos 12" (decisión de Jazmín). Un mes mal escrito, futuro
// o más viejo da el mismo mensaje (decisión de Jazmín).
export const INVALID_PERIOD_MESSAGE = 'Elegí un mes de los últimos 12.';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// `currentMonth` en YYYY-MM, hora de Argentina
export function resolveCompletedPeriod(period: string | undefined, currentMonth: string): string {
  if (period === undefined) return currentMonth;
  const oldest = shiftMonth(currentMonth, -11);
  if (!MONTH_PATTERN.test(period) || period > currentMonth || period < oldest) {
    throw new DomainError(INVALID_PERIOD_MESSAGE, 'period');
  }
  return period;
}
