/** Tipos de documento que acepta el sistema (enum TipoDocumento del backend). */
export const TIPOS_DOCUMENTO = {
  DNI: { label: 'DNI' },
  PASAPORTE: { label: 'Pasaporte' },
} as const

export type TipoDocumento = keyof typeof TIPOS_DOCUMENTO

export const TIPOS_DOCUMENTO_VALUES = Object.keys(TIPOS_DOCUMENTO) as [
  TipoDocumento,
  ...TipoDocumento[],
]
