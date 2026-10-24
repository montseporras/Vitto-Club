import type { MovementPage } from '../../application/points-movements.service.js';
import type { PointsLotStatus, PointsMovementType, PointsMovementView } from '../../domain/points-movement.js';

type Lot = { id: number; accreditedAt: string; expiresAt: string; status: PointsLotStatus };

// Tipo PointsMovement de §3.6, tal como lo ven el Administrador y el Cajero
export type StaffPointsMovementDto = {
  id: number;
  createdAt: string;
  customer: PointsMovementView['customer'];
  type: PointsMovementType;
  points: number;
  balanceAfter: number;
  description: string;
  consumptionCode: string | null;
  reason: string | null;
  lot: Lot | null;
  performedBy: PointsMovementView['performedBy'];
};

// §3.10.2: el Cliente no recibe ni performedBy ni customer
export type CustomerPointsMovementDto = Omit<StaffPointsMovementDto, 'customer' | 'performedBy'>;

type Page<T> = { items: T[]; total: number; page: number; limit: number };

function toCustomerDto(view: PointsMovementView): CustomerPointsMovementDto {
  return {
    id: view.id,
    createdAt: view.createdAt.toISOString(),
    type: view.type,
    points: view.points,
    balanceAfter: view.balanceAfter,
    description: view.description,
    consumptionCode: view.consumptionCode,
    reason: view.reason,
    lot: view.lot
      ? {
          id: view.lot.id,
          accreditedAt: view.lot.accreditedAt.toISOString(),
          expiresAt: view.lot.expiresAt,
          status: view.lot.status,
        }
      : null,
  };
}

function toStaffDto(view: PointsMovementView): StaffPointsMovementDto {
  const { id, createdAt, ...rest } = toCustomerDto(view);
  return {
    id,
    createdAt,
    customer: {
      id: view.customer.id,
      firstName: view.customer.firstName,
      lastName: view.customer.lastName,
      documentType: view.customer.documentType,
      documentNumber: view.customer.documentNumber,
    },
    ...rest,
    performedBy: {
      actorType: view.performedBy.actorType,
      accountId: view.performedBy.accountId,
      name: view.performedBy.name,
    },
  };
}

export class PointsMovementResponseDto {
  static staffPage(result: MovementPage): Page<StaffPointsMovementDto> {
    return { items: result.items.map(toStaffDto), total: result.total, page: result.page, limit: result.limit };
  }

  static customerPage(result: MovementPage): Page<CustomerPointsMovementDto> {
    return { items: result.items.map(toCustomerDto), total: result.total, page: result.page, limit: result.limit };
  }
}
