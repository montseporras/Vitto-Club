// Este archivo define la forma de los datos de la vigencia de los puntos.
// Lo usan el formulario, las llamadas a la API y el mock para hablar todos de lo mismo.

// Cuerpo de PUT /loyalty/configuration/points-validity.
// Los puntos vencen "pointsExpirationMonths" meses después de acreditarse (RF-010).
export interface UpdatePointsExpirationDto {
  pointsExpirationMonths: number;
}

// Respuesta de GET /loyalty/configuration/points-validity. updatedAt es la fecha (ISO 8601)
// de la versión guardada: la agrega el backend, no se envía al guardar. Es null mientras
// nadie la configuró y el backend responde el valor por defecto.
export interface PointsExpiration extends UpdatePointsExpirationDto {
  updatedAt: string | null;
}
