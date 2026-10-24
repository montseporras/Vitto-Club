import { Injectable, NotFoundException } from '@nestjs/common';
import { buildMovementDateRange, parseCustomerSearch } from '../domain/movement-filters.js';
import { toMovementView, PointsMovementType, PointsMovementView } from '../domain/points-movement.js';
import { MovementListFilters, PointsMovementsRepository } from '../domain/port/points-movements.repository.js';

const LAST_24H_MS = 24 * 60 * 60 * 1000;

export type MovementPage = {
  items: PointsMovementView[];
  total: number;
  page: number;
  limit: number;
};

type Pagination = { page: number; limit: number };

export type ListByCustomerInput = Pagination & {
  customerId: number;
  viewerRole: 'ADMIN' | 'CASHIER';
  last24h?: boolean;
  type?: PointsMovementType;
};

export type ListMineInput = Pagination & {
  customerId: number;
  type?: PointsMovementType;
};

export type ListAllInput = Pagination & {
  q?: string;
  customerId?: number;
  fromDate?: string;
  toDate?: string;
  type?: PointsMovementType;
};

// US-26: consulta de movimientos de puntos (§3.6.1, §3.6.2 y §3.10.2). Solo lectura: no abre
// transacción ni audita (las consultas no se auditan).
@Injectable()
export class PointsMovementsService {
  constructor(private readonly movementsRepository: PointsMovementsRepository) {}

  // §3.6.1, CA-26.1: el Cajero siempre ve solo las últimas 24 h, aunque mande last24h=false.
  // El Administrador, por defecto, ve todo.
  async listByCustomer(input: ListByCustomerInput): Promise<MovementPage> {
    if (!(await this.movementsRepository.customerExists(input.customerId))) {
      throw new NotFoundException(`No existe el cliente ${input.customerId}.`);
    }
    const last24h = input.viewerRole === 'CASHIER' ? true : (input.last24h ?? false);

    return await this.list(input, {
      customerId: input.customerId,
      type: input.type,
      ...(last24h ? { createdFrom: new Date(Date.now() - LAST_24H_MS) } : {}),
    });
  }

  // §3.10.2: el cliente sale del token; mismos filtros que /customers/:id sin last24h
  async listMine(input: ListMineInput): Promise<MovementPage> {
    return await this.list(input, { customerId: input.customerId, type: input.type });
  }

  // §3.6.2: sección del Administrador
  async listAll(input: ListAllInput): Promise<MovementPage> {
    const range = buildMovementDateRange(input.fromDate, input.toDate);
    const search = input.q !== undefined ? parseCustomerSearch(input.q) : undefined;

    return await this.list(input, {
      customerId: input.customerId,
      search,
      type: input.type,
      ...range,
    });
  }

  private async list(
    pagination: Pagination,
    filters: Omit<MovementListFilters, 'page' | 'limit'>,
  ): Promise<MovementPage> {
    const { items, total } = await this.movementsRepository.list({
      ...filters,
      page: pagination.page,
      limit: pagination.limit,
    });
    return {
      items: items.map(toMovementView),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }
}
