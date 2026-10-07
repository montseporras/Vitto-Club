// Este archivo define las reglas de validación del formulario de bonificación por
// primera compra. Lo usa el formulario para avisar los errores antes de llamar a la API.
import { z } from 'zod';

// Topes del valor según el tipo de bonificación (a confirmar con backend).
export const MAX_PERCENTAGE = 100;
export const MAX_FIXED_POINTS = 10_000;

export const firstPurchaseBonusSchema = z
  .object({
    type: z.enum(['PERCENTAGE', 'FIXED'], {
      message: 'Seleccioná un tipo de bonificación',
    }),
    value: z
      .number({ message: 'Ingresá un valor' })
      .int('Tiene que ser un número entero, sin decimales')
      .min(1, 'El valor tiene que ser mayor a 0'),
  })
  // El tope del valor depende del tipo elegido.
  .refine(
    (form) => form.type !== 'PERCENTAGE' || form.value <= MAX_PERCENTAGE,
    {
      message: `El porcentaje no puede superar ${MAX_PERCENTAGE}`,
      path: ['value'],
    },
  )
  .refine((form) => form.type !== 'FIXED' || form.value <= MAX_FIXED_POINTS, {
    message: `No puede superar los ${MAX_FIXED_POINTS.toLocaleString('es-AR')} puntos`,
    path: ['value'],
  });

export type FirstPurchaseBonusFormValues = z.infer<
  typeof firstPurchaseBonusSchema
>;