// Este archivo define la forma de los datos de la vigencia de los puntos.
// Lo usan el formulario, las llamadas a la API y el mock para hablar todos de lo mismo.

// Respuesta de GET /settings/points-expiration.
// Los puntos vencen "months" meses después de acreditarse (RF-010).
export interface PointsExpiration {
  months: number;
}

// Cuerpo de PUT /settings/points-expiration.
export type UpdatePointsExpirationDto = PointsExpiration;
