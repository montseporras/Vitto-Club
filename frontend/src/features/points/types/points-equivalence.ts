// Este archivo define la forma de los datos de la equivalencia de puntos.
// Lo usan el formulario, las llamadas a la API y el mock para hablar todos de lo mismo.

// Cuerpo de PUT /loyalty/configuration/points-equivalence.
// "Por cada $ baseAmount se otorgan pointsAwarded puntos" (RF-09).
export interface UpdatePointsEquivalenceDto {
  baseAmount: number;
  pointsAwarded: number;
}

// Respuesta de GET /loyalty/configuration/points-equivalence. updatedAt es la fecha (ISO 8601)
// de la versión guardada: la agrega el backend, no se envía al guardar.
export interface PointsEquivalence extends UpdatePointsEquivalenceDto {
  updatedAt: string;
}
