// Niveles de fidelización (contrato §2.2, enum Level). Son fijos: no se crean,
// no se borran ni se renombran. La etiqueta es la que se muestra en pantalla.
export const LEVELS = {
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
} as const

export type Level = keyof typeof LEVELS
