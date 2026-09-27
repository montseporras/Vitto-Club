/** Tipos de documento que acepta el sistema (enum DocumentType del backend). */
export const DOCUMENT_TYPES = {
  DNI: { label: 'DNI' },
  PASSPORT: { label: 'Pasaporte' },
} as const

export type DocumentType = keyof typeof DOCUMENT_TYPES

export const DOCUMENT_TYPE_VALUES = Object.keys(DOCUMENT_TYPES) as [
  DocumentType,
  ...DocumentType[],
]
