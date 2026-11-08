import type { DocumentType } from '../../../customers/domain/customer.js';
import type { Redemption, RedemptionOrigin, RedemptionStatus } from '../../domain/redemption.js';
import type { RedemptionCustomer } from '../../domain/port/redemption.repository.js';

// Tipo Redemption del contrato S4 §3.6.2. Definido en US-43 a pedido de Melisa; lo reutilizan
// US-41, US-42 y US-45 (ver src/redemptions/documentation-updates-us43.md). Dos vistas:
// - empleado (Administrador y Cajero): todos los campos menos canCancel;
// - Cliente: sin customer, origin, confirmedBy, resolvedBy ni balanceBefore/balanceAfter, y con
//   canCancel (§3.6.2 "Lo ve el Cliente", CA-45.2). El Cliente nunca ve qué empleado lo resolvió.

export type RedemptionRewardDto = { id: number; name: string; points: number };

export type RedemptionCustomerDto = {
  id: number;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
};

export type RedemptionResolvedByDto = {
  actorType: 'EMPLOYEE' | 'SYSTEM';
  accountId: number | null;
  name: string;
};

export type EmployeeRedemptionDto = {
  id: number;
  code: string;
  createdAt: string;
  expiresAt: string;
  status: RedemptionStatus;
  reward: RedemptionRewardDto;
  customer: RedemptionCustomerDto;
  origin: RedemptionOrigin;
  confirmedBy: { accountId: number; name: string } | null;
  resolvedAt: string | null;
  resolvedBy: RedemptionResolvedByDto | null;
  rejectionReason: string | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
};

export type CustomerRedemptionDto = {
  id: number;
  code: string;
  createdAt: string;
  expiresAt: string;
  status: RedemptionStatus;
  reward: RedemptionRewardDto;
  resolvedAt: string | null;
  rejectionReason: string | null;
  canCancel: boolean;
};

// Snapshot de la recompensa al confirmar (nombre y puntos)
const rewardOf = (redemption: Redemption): RedemptionRewardDto => ({
  id: redemption.getRewardId(),
  name: redemption.getRewardName(),
  points: redemption.getPoints(),
});

// null si nadie lo resolvió todavía o si lo canceló el Cliente; Sistema si no hay cuenta
function resolvedByOf(redemption: Redemption): RedemptionResolvedByDto | null {
  const name = redemption.getResolvedByName();
  if (name === null) return null;
  const accountId = redemption.getResolvedByAccountId();
  return { actorType: accountId === null ? 'SYSTEM' : 'EMPLOYEE', accountId, name };
}

function confirmedByOf(redemption: Redemption): { accountId: number; name: string } | null {
  const accountId = redemption.getConfirmedByAccountId();
  const name = redemption.getConfirmedByName();
  return accountId === null || name === null ? null : { accountId, name };
}

export function toEmployeeRedemptionDto(
  redemption: Redemption,
  customer: RedemptionCustomer,
): EmployeeRedemptionDto {
  return {
    id: redemption.getId(),
    code: redemption.getCode(),
    createdAt: redemption.getCreatedAt().toISOString(),
    expiresAt: redemption.getExpiresAt().toISOString(),
    status: redemption.getStatus(),
    reward: rewardOf(redemption),
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      documentType: customer.documentType,
      documentNumber: customer.documentNumber,
    },
    origin: redemption.getOrigin(),
    confirmedBy: confirmedByOf(redemption),
    resolvedAt: redemption.getResolvedAt()?.toISOString() ?? null,
    resolvedBy: resolvedByOf(redemption),
    rejectionReason: redemption.getRejectionReason(),
    balanceBefore: redemption.getBalanceBefore(),
    balanceAfter: redemption.getBalanceAfter(),
  };
}

// canCancel (§3.6.2): status = CONFIRMED y no venció
export function toCustomerRedemptionDto(redemption: Redemption, now: Date = new Date()): CustomerRedemptionDto {
  return {
    id: redemption.getId(),
    code: redemption.getCode(),
    createdAt: redemption.getCreatedAt().toISOString(),
    expiresAt: redemption.getExpiresAt().toISOString(),
    status: redemption.getStatus(),
    reward: rewardOf(redemption),
    resolvedAt: redemption.getResolvedAt()?.toISOString() ?? null,
    rejectionReason: redemption.getRejectionReason(),
    canCancel: redemption.getStatus() === 'CONFIRMED' && !redemption.isExpired(now),
  };
}
