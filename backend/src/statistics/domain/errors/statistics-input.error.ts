// Un parámetro inválido de las estadísticas (mes o secciones). El filtro lo responde como 400 con el
// mensaje del contrato (S5 §3.9).
export class StatisticsInputError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = 'StatisticsInputError';
  }
}
