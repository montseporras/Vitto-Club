// Validación del alta de empleado con Zod (RF-01).
// Reglas alineadas con el backend (docs/employees-api.md): nombre/apellido/mail/rol
// obligatorios, teléfono opcional. Los largos máximos siguen al schema de Prisma.
import { z } from 'zod';
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/shared/lib/password';

export const createEmployeeSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(80, 'Máximo 80 caracteres'),
  lastName: z
    .string()
    .trim()
    .min(1, 'El apellido es obligatorio')
    .max(80, 'Máximo 80 caracteres'),
  // Opcional. Si viene: puede empezar con +, y lleva entre 8 y 15 dígitos
  // (mismo criterio que el dominio del backend).
  phone: z
    .string()
    .trim()
    .max(30, 'Máximo 30 caracteres')
    .regex(
      /^(\+?[\d\s().-]+)?$/,
      'Solo números, espacios, +, -, puntos y paréntesis',
    )
    .refine((value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '').length;
      return digits >= 8 && digits <= 15;
    }, 'El teléfono tiene que tener entre 8 y 15 números')
    .optional(),
  email: z
    .string()
    .trim()
    .min(1, 'El mail es obligatorio')
    .email('Ingresá un mail válido')
    .max(150, 'Máximo 150 caracteres'),
  role: z.enum(['CASHIER', 'ADMIN'], {
    message: 'Seleccioná un rol',
  }),
});

export type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;

// Edición de empleado (RF-02): mismos campos que el alta, salvo el mail,
// que no se edita.
export const editEmployeeSchema = createEmployeeSchema.omit({
  email: true,
});

export type EditEmployeeFormValues = z.infer<typeof editEmployeeSchema>;

// Contraseña del usuario del empleado, al crearlo (SCRUM-21) o al cambiarla
// (EMP-PASS). El usuario es el mail, que ya está validado en el alta del
// empleado; acá solo se valida la contraseña, por si la editan a mano.
// Regla exacta del backend (contrato §3.11): no puede ser más estricta que
// esa regla (CA-EMP.4). El generador (12 caracteres, con mayúscula, número y
// especial) la cumple igual, así que sigue devolviendo contraseñas más
// fuertes que el mínimo exigido.
export const accountPasswordSchema = (email: string) =>
  z.object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, 'Tiene que tener entre 8 y 64 caracteres')
      .max(PASSWORD_MAX_LENGTH, 'Tiene que tener entre 8 y 64 caracteres')
      .refine(
        (password) => new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES,
        'La contraseña es demasiado larga',
      )
      .refine(
        (password) => password !== email,
        'La contraseña no puede ser igual al mail',
      ),
  });

export type AccountPasswordFormValues = z.infer<
  ReturnType<typeof accountPasswordSchema>
>;
