import type { DocumentType } from '@/domain/documents'

export type DocumentSearch = {
  documentType: DocumentType
  documentNumber: string
}

/** Claves de TanStack Query del mostrador. */
export const cashierKeys = {
  byDocumentAll: ['customers', 'by-document'] as const,
  byDocument: ({ documentType, documentNumber }: DocumentSearch) =>
    ['customers', 'by-document', documentType, documentNumber] as const,
  /** Todo lo de un cliente (puntos, movimientos, ficha): para invalidar de una vez. */
  customer: (customerId: number) => ['customers', customerId] as const,
  points: (customerId: number) => ['customers', customerId, 'points'] as const,
  consumptionPreview: (customerId: number, amount: number) =>
    ['consumptions', 'preview', customerId, amount] as const,
  movements: (customerId: number, limit: number) =>
    ['customers', customerId, 'movements', { limit }] as const,
}
