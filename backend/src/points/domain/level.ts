// §3.4.1 / CA-BASE.8. Bronce siempre arranca en 0 (fijo, no editable). Plata y Oro son
// los únicos umbrales configurables (US-27, fuera de mi alcance: yo solo los leo).
export type Level = 'BRONZE' | 'SILVER' | 'GOLD';

export type LevelSummary = {
  current: Level;
  next: Level | null;
  currentMinPoints: number;
  nextMinPoints: number | null;
  pointsToNext: number;
  progressPercent: number;
};

// NIV-BEN (S5 §3.10): resumen del nivel más el texto informativo del nivel actual y del siguiente.
// El texto no interviene en ningún cálculo de puntos (S5-26).
export type LevelBenefitTexts = {
  bronzeBenefit: string | null;
  silverBenefit: string | null;
  goldBenefit: string | null;
};

export type LevelWithBenefits = LevelSummary & {
  benefit: string | null;
  nextBenefit: string | null;
};

const BRONZE_MIN_POINTS = 0;

function benefitOf(level: Level | null, texts: LevelBenefitTexts): string | null {
  if (level === 'BRONZE') return texts.bronzeBenefit;
  if (level === 'SILVER') return texts.silverBenefit;
  if (level === 'GOLD') return texts.goldBenefit;
  return null;
}

// `nextBenefit` es null en Oro (no hay nivel siguiente)
export function withBenefits(summary: LevelSummary, texts: LevelBenefitTexts): LevelWithBenefits {
  return {
    ...summary,
    benefit: benefitOf(summary.current, texts),
    nextBenefit: benefitOf(summary.next, texts),
  };
}

// NOTA: el contrato no especifica el método de redondeo de progressPercent (a diferencia
// de "points", que explícitamente trunca). Uso Math.round como criterio razonable; si el
// equipo prefiere floor/ceil, es un cambio de una línea.
export function calculateLevel(
  lifetimePoints: number,
  silverMinPoints: number,
  goldMinPoints: number,
): LevelSummary {
  if (lifetimePoints >= goldMinPoints) {
    return {
      current: 'GOLD',
      next: null,
      currentMinPoints: goldMinPoints,
      nextMinPoints: null,
      pointsToNext: 0,
      progressPercent: 100,
    };
  }

  if (lifetimePoints >= silverMinPoints) {
    return {
      current: 'SILVER',
      next: 'GOLD',
      currentMinPoints: silverMinPoints,
      nextMinPoints: goldMinPoints,
      pointsToNext: goldMinPoints - lifetimePoints,
      progressPercent: Math.round(
        ((lifetimePoints - silverMinPoints) / (goldMinPoints - silverMinPoints)) * 100,
      ),
    };
  }

  return {
    current: 'BRONZE',
    next: 'SILVER',
    currentMinPoints: BRONZE_MIN_POINTS,
    nextMinPoints: silverMinPoints,
    pointsToNext: silverMinPoints - lifetimePoints,
    progressPercent: Math.round(
      ((lifetimePoints - BRONZE_MIN_POINTS) / (silverMinPoints - BRONZE_MIN_POINTS)) * 100,
    ),
  };
}
