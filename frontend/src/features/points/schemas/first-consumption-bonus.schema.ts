// Este archivo define las reglas de validación del formulario de bonificación por
// primera compra. Lo usa el formulario para avisar los errores antes de llamar a la API.
import { z } from 'zod';

// Topes del valor según el tipo de bonificación (los mismos que valida el backend).
export const MAX_PERCENTAGE = 100;
export const MAX_FIXED_POINTS = 10_000;

// El porcentaje admite hasta 2 decimales. Se compara con tolerancia por el redondeo.
const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const firstPurchaseBonusSchema = z
  .object({
    bonusType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT'], {
      message: 'Seleccioná un tipo de bonificación',
    }),
    bonusValue: z
      .number({ message: 'Ingresá un valor' })
      .min(1, 'El valor tiene que ser al menos 1'),
  })
  // El tope y los decimales del valor dependen del tipo elegido.
  .refine(
    (form) =>
      form.bonusType !== 'PERCENTAGE' || form.bonusValue <= MAX_PERCENTAGE,
    {
      message: `El porcentaje no puede superar ${MAX_PERCENTAGE}`,
      path: ['bonusValue'],
    },
  )
  .refine(
    (form) =>
      form.bonusType !== 'PERCENTAGE' || hasAtMostTwoDecimals(form.bonusValue),
    {
      message: 'Usá como máximo 2 decimales',
      path: ['bonusValue'],
    },
  )
  .refine(
    (form) =>
      form.bonusType !== 'FIXED_AMOUNT' || Number.isInteger(form.bonusValue),
    {
      message: 'Tiene que ser un número entero, sin decimales',
      path: ['bonusValue'],
    },
  )
  .refine(
    (form) =>
      form.bonusType !== 'FIXED_AMOUNT' || form.bonusValue <= MAX_FIXED_POINTS,
    {
      message: `No puede superar los ${MAX_FIXED_POINTS.toLocaleString('es-AR')} puntos`,
      path: ['bonusValue'],
    },
  );

export type FirstPurchaseBonusFormValues = z.infer<
  typeof firstPurchaseBonusSchema
>;
