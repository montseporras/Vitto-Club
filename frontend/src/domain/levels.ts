// Niveles de fidelización (enum Level del contrato, §2.2) con su nombre en pantalla. Lo comparten
// el Inicio del Cliente, la ficha del cliente y la configuración de niveles.
// Los umbrales no van acá: son configurables y los manda el backend.
export const LEVELS = {
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
} as const

export type Level = keyof typeof LEVELS
