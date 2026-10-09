// Este archivo define las reglas de validación del formulario de vigencia de los
// puntos. Lo usa el formulario para avisar los errores antes de llamar a la API.
import { z } from 'zod';

// Tope máximo de la vigencia: 10 años. El backend admite más; este es el de la pantalla.
export const MAX_EXPIRATION_MONTHS = 120;

export const pointsExpirationSchema = z.object({
  pointsExpirationMonths: z
    .number({ message: 'Ingresá una cantidad de meses' })
    .int('Tiene que ser un número entero, sin decimales')
    .min(1, 'La vigencia tiene que ser de al menos 1 mes')
    .max(
      MAX_EXPIRATION_MONTHS,
      `La vigencia no puede superar los ${MAX_EXPIRATION_MONTHS} meses`,
    ),
});

export type PointsExpirationFormValues = z.infer<typeof pointsExpirationSchema>;
