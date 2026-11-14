// Este archivo define las reglas de validación del mínimo de un cliente frecuente.
// El mensaje es el del contrato (S5 §3.9.6): entero de 1 a 100.
import { z } from 'zod';

export const MIN_FREQUENT_CONSUMPTIONS = 1;
export const MAX_FREQUENT_CONSUMPTIONS = 100;

const MESSAGE = 'Ingresá un número entero de 1 a 100.';

export const frequentCustomersSchema = z.object({
  minConsumptions: z
    .number({ message: MESSAGE })
    .int(MESSAGE)
    .min(MIN_FREQUENT_CONSUMPTIONS, MESSAGE)
    .max(MAX_FREQUENT_CONSUMPTIONS, MESSAGE),
});

export type FrequentCustomersFormValues = z.infer<typeof frequentCustomersSchema>;
