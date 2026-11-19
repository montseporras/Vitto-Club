import { DomainError } from './errors/domain.error.js';
import { INVALID_PERIOD_MESSAGE, resolveCompletedPeriod } from './completed-period.js';

describe('resolveCompletedPeriod (§3.1.7)', () => {
  it('sin valor → el mes actual', () => {
    expect(resolveCompletedPeriod(undefined, '2026-11')).toBe('2026-11');
  });

  it('el mes actual y los 11 anteriores valen', () => {
    expect(resolveCompletedPeriod('2026-11', '2026-11')).toBe('2026-11');
    expect(resolveCompletedPeriod('2025-12', '2026-11')).toBe('2025-12');
  });

  it.each(['2025-11', '2026-12', '2026-13', '2026-1', 'noviembre'])('%s → "Elegí un mes de los últimos 12."', (period) => {
    const run = () => resolveCompletedPeriod(period, '2026-11');
    expect(run).toThrow(DomainError);
    expect(run).toThrow(INVALID_PERIOD_MESSAGE);
  });
});
