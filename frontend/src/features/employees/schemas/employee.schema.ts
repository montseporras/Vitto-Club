// Validación del alta de empleado con Zod (RF-01).
// Reglas alineadas con el backend (docs/employees-api.md): nombre/apellido/mail/rol
// obligatorios, teléfono opcional. Los largos máximos siguen al schema de Prisma.
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '@/shared/lib/password';

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

// Usuario del empleado (SCRUM-21). El usuario es el mail, que ya está validado
// en el alta; acá solo se valida la contraseña, por si la editan a mano.
export const createAccountSchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
    .regex(PASSWORD_RULES.uppercase, 'Tiene que tener al menos una mayúscula')
    .regex(PASSWORD_RULES.digit, 'Tiene que tener al menos un número')
    .regex(
      PASSWORD_RULES.special,
      'Tiene que tener al menos un carácter especial',
    ),
});

export type CreateAccountFormValues = z.infer<typeof createAccountSchema>;
