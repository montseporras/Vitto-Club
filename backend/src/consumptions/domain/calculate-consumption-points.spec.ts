import { calculateConsumptionPoints } from './calculate-consumption-points.js';

describe('calculateConsumptionPoints', () => {
  const equivalence = { baseAmount: 1000, pointsAwarded: 10 };

  it('CA-21.2: trunca (ejemplo del contrato: $1.550 con $1.000 = 10 pts -> 15 pts)', () => {
    const result = calculateConsumptionPoints(1550, equivalence, null, false);
    expect(result.points).toBe(15);
    expect(result.bonusPoints).toBe(0);
    expect(result.totalPoints).toBe(15);
  });

  it('ejemplo del contrato: $50.000 con $1.000 = 10 pts -> 500 pts', () => {
    const result = calculateConsumptionPoints(50000, equivalence, null, false);
    expect(result.points).toBe(500);
  });

  it('bonusPoints es 0 si no es el primer consumo, aunque haya bonificación configurada', () => {
    const bonus = { bonusType: 'PERCENTAGE' as const, bonusValue: 15 };
    const result = calculateConsumptionPoints(50000, equivalence, bonus, false);
    expect(result.bonusPoints).toBe(0);
    expect(result.totalPoints).toBe(result.points);
  });

  it('bonusPoints es 0 si es el primer consumo pero no hay bonificación configurada', () => {
    const result = calculateConsumptionPoints(50000, equivalence, null, true);
    expect(result.bonusPoints).toBe(0);
  });

  it('CA-21.3 PERCENTAGE: floor(points * bonusValue / 100)', () => {
    const bonus = { bonusType: 'PERCENTAGE' as const, bonusValue: 15 };
    const result = calculateConsumptionPoints(50000, equivalence, bonus, true);
    expect(result.points).toBe(500);
    expect(result.bonusPoints).toBe(75); // floor(500 * 15 / 100) = 75
    expect(result.totalPoints).toBe(575);
  });

  it('CA-21.3 PERCENTAGE trunca el resultado', () => {
    const bonus = { bonusType: 'PERCENTAGE' as const, bonusValue: 7 };
    const result = calculateConsumptionPoints(1550, equivalence, bonus, true); // points = 15
    expect(result.bonusPoints).toBe(1); // floor(15 * 7 / 100) = floor(1.05) = 1
  });

  it('CA-21.3 FIXED_AMOUNT: bonusValue tal cual, sin truncar de más', () => {
    const bonus = { bonusType: 'FIXED_AMOUNT' as const, bonusValue: 50 };
    const result = calculateConsumptionPoints(50000, equivalence, bonus, true);
    expect(result.bonusPoints).toBe(50);
    expect(result.totalPoints).toBe(550);
  });

  it('totalPoints siempre es points + bonusPoints', () => {
    const bonus = { bonusType: 'FIXED_AMOUNT' as const, bonusValue: 20 };
    const result = calculateConsumptionPoints(1550, equivalence, bonus, true);
    expect(result.totalPoints).toBe(result.points + result.bonusPoints);
  });
});
