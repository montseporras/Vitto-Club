// Validación del alta de empleado con Zod (RF-01).
// Reglas alineadas con la base de datos: nombre/apellido/mail/rol obligatorios,
// teléfono opcional. Los largos máximos siguen al schema de Prisma.
import { z } from 'zod';

export const registrarEmpleadoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(80, 'Máximo 80 caracteres'),
  apellido: z
    .string()
    .trim()
    .min(1, 'El apellido es obligatorio')
    .max(80, 'Máximo 80 caracteres'),
  telefono: z
    .string()
    .trim()
    .max(30, 'Máximo 30 caracteres')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .trim()
    .min(1, 'El mail es obligatorio')
    .email('Ingresá un mail válido')
    .max(150, 'Máximo 150 caracteres'),
  rol: z.enum(['CASHIER', 'ADMIN'], {
    message: 'Seleccioná un rol',
  }),
});

export type RegistrarEmpleadoForm = z.infer<typeof registrarEmpleadoSchema>;

// Edición de empleado (RF-02): mismos campos que el alta, salvo el mail,
// que no se edita.
export const editarEmpleadoSchema = registrarEmpleadoSchema.omit({
  email: true,
});

export type EditarEmpleadoForm = z.infer<typeof editarEmpleadoSchema>;
