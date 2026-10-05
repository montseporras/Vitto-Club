import { z } from 'zod'
import { DOCUMENT_TYPE_VALUES } from '@/domain/documents'

// Solo se exige el número: el formato lo valida el backend al buscar (404 si no existe).
export const findCustomerSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPE_VALUES),
  documentNumber: z
    .string()
    .transform((v) => v.replace(/[.\s-]/g, '').toUpperCase())
    .pipe(z.string().min(1, 'Ingresá el número de documento')),
})

export type FindCustomerFormInput = z.input<typeof findCustomerSchema>
export type FindCustomerFormOutput = z.output<typeof findCustomerSchema>
