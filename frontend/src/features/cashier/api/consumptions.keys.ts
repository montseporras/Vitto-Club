// Claves de caché de los consumos y los puntos de un cliente.
export const consumptionsKeys = {
  customerConsumptions: (customerId: number) =>
    ['customers', customerId, 'consumos'] as const,
  customerPoints: (customerId: number) =>
    ['customers', customerId, 'puntos'] as const,
}
