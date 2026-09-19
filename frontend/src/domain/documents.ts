/** Tipos de documento que acepta el sistema (enum TipoDocumento del backend). */
export const DOCUMENT_TYPES = {
  DNI: { label: 'DNI' },
  PASAPORTE: { label: 'Pasaporte' },
} as const

export type DocumentType = keyof typeof DOCUMENT_TYPES

export const DOCUMENT_TYPE_VALUES = Object.keys(DOCUMENT_TYPES) as [
  DocumentType,
  ...DocumentType[],
]
