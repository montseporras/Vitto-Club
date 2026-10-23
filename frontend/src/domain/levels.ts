// Niveles del programa de fidelización (contrato §2.2, enum Level).
// Son fijos: el valor coincide con la API y la etiqueta es la que se muestra en pantalla.
export const LEVELS = {
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
} as const

export type Level = keyof typeof LEVELS
