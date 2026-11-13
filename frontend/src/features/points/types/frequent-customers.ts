// Este archivo define la forma de los datos del mínimo de un cliente frecuente.
// Lo usan el formulario, las llamadas a la API y el mock (contrato S5 §3.9.6).

// Cuerpo de PUT /loyalty/configuration/frequent-customers.
export interface UpdateFrequentCustomersDto {
  minConsumptions: number;
}

// Respuesta de GET /loyalty/configuration/frequent-customers.
export type FrequentCustomers = UpdateFrequentCustomersDto;
