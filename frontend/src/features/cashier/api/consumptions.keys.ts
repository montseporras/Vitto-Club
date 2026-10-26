// Claves de caché de los consumos de un cliente. Empiezan como las del resto de la pantalla
// (['customers', id, 'consumptions'], igual que US-21 y la ficha): así, registrar un consumo
// también refresca el panel de las últimas 24 hs. El saldo usa cashierKeys.points.
export const consumptionsKeys = {
  customerConsumptions: (customerId: number) =>
    ['customers', customerId, 'consumptions', { last24h: true }] as const,
}
