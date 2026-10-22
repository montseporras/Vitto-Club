// Estados de un consumo (contrato §2.2). El valor coincide con el enum de la API;
// la etiqueta es la que se muestra en pantalla.
export const CONSUMPTION_STATUSES = {
  REGISTERED: 'Registrado',
  VOIDED: 'Anulado',
} as const

export type ConsumptionStatus = keyof typeof CONSUMPTION_STATUSES
