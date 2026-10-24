import { Consumption, ConsumptionStatus } from '../consumption.js';
import type { CustomerSearch } from '../../../points/domain/movement-filters.js';

export type FindByCustomerIdFilters = {
  // Ya resuelto por el service según el rol (Cajero: siempre true). No es el booleano
  // crudo del query param.
  last24h: boolean;
  status?: ConsumptionStatus;
  page: number;
  limit: number;
};

export type FindByCustomerIdResult = {
  items: Consumption[];
  total: number;
};

// §3.3.1: filtros del listado del Administrador. Las fechas ya vienen convertidas a un rango
// UTC [createdFrom, createdBefore) y q, a una búsqueda por documento o por nombre.
export type FindAllFilters = {
  customerId?: number;
  search?: CustomerSearch;
  status?: ConsumptionStatus;
  registeredByAccountId?: number;
  createdFrom?: Date;
  createdBefore?: Date;
  page: number;
  limit: number;
};

// Datos del cliente que lleva cada consumo de la respuesta (§3.3.3, campo customer)
export type ConsumptionCustomer = {
  id: number;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
};

export type ConsumptionTotals = {
  // Incluye los anulados
  count: number;
  // Solo los REGISTERED
  amountTotal: number;
  pointsTotal: number;
};

export type FindAllResult = {
  items: { consumption: Consumption; customer: ConsumptionCustomer }[];
  total: number;
  totals: ConsumptionTotals;
};

export abstract class ConsumptionRepository {
  // US-21: alta. El consumo ya nace REGISTERED (Consumption.create()).
  abstract save(consumption: Consumption): Promise<Consumption>;

  // US-22/US-23: :code es "C-000141"; se resuelve a id adentro del repositorio
  // (Consumption.parseCode). null si el formato es inválido o no existe.
  abstract findByCode(code: string): Promise<Consumption | null>;

  // CA-21.4: isFirstConsumption = el cliente no tiene ningún consumo REGISTERED. Los
  // anulados no cuentan (decisión #2).
  abstract existsRegisteredByCustomerId(customerId: number): Promise<boolean>;

  // US-22: persiste el estado de anulación (status, voidedAt/By/Reason) después de
  // Consumption.void(). Nunca borra el registro.
  abstract updateVoidStatus(consumption: Consumption): Promise<void>;

  // §3.2.1: GET /customers/:id/consumos. Orden: createdAt descendente.
  abstract findByCustomerId(
    customerId: number,
    filters: FindByCustomerIdFilters,
  ): Promise<FindByCustomerIdResult>;

  // US-23, §3.3.1: GET /consumos. Orden: createdAt descendente. Incluye los consumos de
  // clientes dados de baja (decisión de Jazmín, igual que los movimientos de US-26).
  abstract findAll(filters: FindAllFilters): Promise<FindAllResult>;
}
