import { canClaim, CLAIM_MESSAGES, claimRejection, endOfPeriod } from './mission-claim.js';

describe('claimRejection (§3.3.3)', () => {
  it('Completada con recompensa → se puede reclamar', () => {
    expect(claimRejection('COMPLETED', 50)).toBeNull();
    expect(canClaim('COMPLETED', 50)).toBe(true);
  });

  it.each([
    ['IN_PROGRESS', 50, CLAIM_MESSAGES.notCompleted],
    ['CLAIMED', 50, CLAIM_MESSAGES.alreadyClaimed],
    ['EXPIRED', 50, CLAIM_MESSAGES.expired],
    ['COMPLETED', null, CLAIM_MESSAGES.noReward],
  ] as const)('%s con %s pts → "%s"', (status, points, message) => {
    expect(claimRejection(status, points)).toBe(message);
    expect(canClaim(status, points)).toBe(false);
  });

  it('el estado manda sobre la recompensa: una En progreso sin recompensa dice "todavía no está completada"', () => {
    expect(claimRejection('IN_PROGRESS', null)).toBe(CLAIM_MESSAGES.notCompleted);
  });
});

describe('endOfPeriod (§3.3.1)', () => {
  it.each([
    ['2026-11', '2026-11-30'],
    ['2026-12', '2026-12-31'],
    ['2028-02', '2028-02-29'],
    ['2027-02', '2027-02-28'],
  ])('%s → %s', (period, end) => {
    expect(endOfPeriod(period)).toBe(end);
  });
});
