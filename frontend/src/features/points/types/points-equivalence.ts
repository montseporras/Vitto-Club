// Este archivo define la forma de los datos de la equivalencia de puntos.
// Lo usan el formulario, las llamadas a la API y el mock para hablar todos de lo mismo.

// Respuesta de GET /settings/points-equivalence.
// "Por cada $ baseAmount se otorgan points puntos" (RF-09).
export interface PointsEquivalence {
  baseAmount: number;
  points: number;
}

// Cuerpo de PUT /settings/points-equivalence.
export type UpdatePointsEquivalenceDto = PointsEquivalence;