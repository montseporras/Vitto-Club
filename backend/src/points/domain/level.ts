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

const BRONZE_MIN_POINTS = 0;

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
