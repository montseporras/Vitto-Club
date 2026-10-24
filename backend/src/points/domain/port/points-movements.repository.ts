import type { PointsMovementRecord, PointsMovementType } from '../points-movement.js';
import type { CustomerSearch } from '../movement-filters.js';

// Filtros ya resueltos por el service (last24h según el rol, fechas en UTC)
export type MovementListFilters = {
  customerId?: number;
  search?: CustomerSearch;
  type?: PointsMovementType;
  createdFrom?: Date;
  createdBefore?: Date;
  page: number;
  limit: number;
};

export type MovementListResult = {
  items: PointsMovementRecord[];
  total: number;
};

// Lectura de movimientos (US-26). Solo consulta: los movimientos son solo inserción.
export abstract class PointsMovementsRepository {
  abstract customerExists(customerId: number): Promise<boolean>;

  // Orden §3.6: createdAt descendente y, a igual fecha, id descendente
  abstract list(filters: MovementListFilters): Promise<MovementListResult>;
}
