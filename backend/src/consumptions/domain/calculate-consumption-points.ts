// CA-21.2 / CA-21.3 (US-21): la fórmula de puntos y de bonificación son de esta historia,
// no de BASE. BASE (PointsService, todavía sin implementar) es quien ACREDITA esos puntos
// al saldo del cliente (lotes, movimientos); esto solo calcula cuántos corresponden.
export type ConsumptionPointsEquivalence = {
  baseAmount: number;
  pointsAwarded: number;
};

export type FirstConsumptionBonus =
  | { bonusType: 'PERCENTAGE'; bonusValue: number }
  | { bonusType: 'FIXED_AMOUNT'; bonusValue: number };

export type ConsumptionPointsResult = {
  points: number;
  bonusPoints: number;
  totalPoints: number;
};

export function calculateConsumptionPoints(
  amount: number,
  equivalence: ConsumptionPointsEquivalence,
  bonus: FirstConsumptionBonus | null,
  isFirstConsumption: boolean,
): ConsumptionPointsResult {
  // §3.1.2: floor(amount / baseAmount × pointsAwarded). Se trunca, nunca se redondea.
  const points = Math.floor((amount / equivalence.baseAmount) * equivalence.pointsAwarded);

  // 0 si no es el primer consumo `REGISTERED` del cliente, o si no hay bonificación
  // configurada (decisión #2: un primer consumo anulado no cuenta, el siguiente vuelve a
  // recibirla — eso lo decide isFirstConsumption, no esta función).
  let bonusPoints = 0;
  if (isFirstConsumption && bonus) {
    bonusPoints =
      bonus.bonusType === 'PERCENTAGE'
        ? Math.floor((points * bonus.bonusValue) / 100)
        : bonus.bonusValue;
  }

  return { points, bonusPoints, totalPoints: points + bonusPoints };
}
