// Este archivo define las reglas de validación del formulario de equivalencia de
// puntos. Lo usa el formulario para avisar los errores antes de llamar a la API.
import { z } from 'zod';
// Zod es una librería para describir reglas sobre los datos ("tiene que ser un número", "mayor a 0", "sin decimales"). Ese conjunto de reglas se llama schema.
// React Hook Form (la librería del formulario) le pasa lo que escribió el usuario, y Zod responde si está bien o qué mensaje de error mostrar en cada campo.

// Topes máximos de cada campo (a confirmar con backend).
export const MAX_BASE_AMOUNT = 1_000_000;
export const MAX_POINTS = 10_000;

// Los pesos admiten hasta centavos. Se compara con tolerancia por el redondeo de los decimales.
const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const pointsEquivalenceSchema = z.object({
    // primero defino todas las reglas de baseAmount ($$)
  baseAmount: z
    .number({ message: 'Ingresá un monto' }) //muestra el mensaje si no es un numero, por ejemplo que este vacio y no se evalua lo de abajo
    .positive('El monto tiene que ser mayor a 0')
    .max(
      MAX_BASE_AMOUNT,
      `El monto no puede superar $ ${MAX_BASE_AMOUNT.toLocaleString('es-AR')}`,
    )
    .refine(hasAtMostTwoDecimals, 'Usá como máximo 2 decimales'),
    // separo con coma y defino points (ptos por monto)
  points: z
    .number({ message: 'Ingresá una cantidad de puntos' })
    .int('Tiene que ser un número entero, sin decimales')
    .min(1, 'Los puntos tienen que ser mayores a 0')
    .max(
      MAX_POINTS,
      `No puede superar los ${MAX_POINTS.toLocaleString('es-AR')} puntos`,
    ),
});

// Tipo de TypeScript de los valores del formulario, sacado automáticamente del
// schema con z.infer. Equivale a escribir a mano: { baseAmount: number; points: number }
export type PointsEquivalenceFormValues = z.infer<
  typeof pointsEquivalenceSchema
>;