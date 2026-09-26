import type { DocumentType } from '@/domain/documents'

/** Cliente tal como lo devuelve la API (CustomerResponseDto). */
export type Client = {
  id: number
  firstName: string
  lastName: string
  documentType: DocumentType
  documentNumber: string
  email: string
  phone: string | null
  /** 'YYYY-MM-DD' */
  dateOfBirth: string | null
  active: boolean
  deactivatedAt: string | null
  createdAt: string
}

/** Body de POST /api/customers (RF-015). Igual a CreateCustomerDto del backend. */
export type CreateClientBody = {
  firstName: string
  lastName: string
  documentType: DocumentType
  documentNumber: string
  email: string
  phone?: string
  /** 'YYYY-MM-DD' */
  dateOfBirth?: string
}

/**
 * Body de PATCH /api/customers/:id. Viaja solo lo que cambió.
 * `phone` y `dateOfBirth` se borran enviando null.
 */
export type UpdateClientBody = Partial<
  Omit<CreateClientBody, 'phone' | 'dateOfBirth'>
> & {
  phone?: string | null
  dateOfBirth?: string | null
}
