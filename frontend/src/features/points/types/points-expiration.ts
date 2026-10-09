// Este archivo define la forma de los datos de la vigencia de los puntos.
// Lo usan el formulario, las llamadas a la API y el mock para hablar todos de lo mismo.

// Cuerpo de PUT /settings/points-expiration.
// Los puntos vencen "pointsExpirationMonths" meses después de acreditarse (RF-010).
export interface UpdatePointsExpirationDto {
  pointsExpirationMonths: number;
}

// Respuesta de GET /settings/points-expiration. updatedAt es la fecha (ISO 8601)
// de la versión guardada: la agrega el backend, no se envía al guardar.
export interface PointsExpiration extends UpdatePointsExpirationDto {
  updatedAt: string;
}
