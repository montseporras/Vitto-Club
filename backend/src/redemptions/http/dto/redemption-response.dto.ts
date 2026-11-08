import { Redemption } from '../../domain/redemption.js';

type RedemptionCommon = {
  id: number;
  code: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  // Snapshot del nombre y de los puntos al confirmar (§3.6.2)
  reward: { id: number; name: string; points: number };
  resolvedAt: string | null;
  rejectionReason: string | null;
};

// §3.6.2, columna "Lo ve el Cliente": sin customer, origin, confirmedBy, resolvedBy ni saldos.
// `canCancel` solo viaja en lo que ve el Cliente. El Cliente nunca ve qué empleado resolvió su canje.
export type CustomerRedemptionResponse = RedemptionCommon & { canCancel: boolean };

// §3.6.2 completo: lo que ven el Administrador y el Cajero (no lleva `canCancel`)
export type StaffRedemptionResponse = RedemptionCommon & {
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
  };
  origin: string;
  confirmedBy: { accountId: number; name: string } | null;
  resolvedBy: { actorType: 'EMPLOYEE' | 'SYSTEM'; accountId: number | null; name: string } | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
};

const SYSTEM_NAME = 'Sistema';

function commonOf(redemption: Redemption): RedemptionCommon {
  return {
    id: redemption.getId(),
    code: redemption.getCode(),
    createdAt: redemption.getCreatedAt().toISOString(),
    expiresAt: redemption.getExpiresAt().toISOString(),
    status: redemption.getStatus(),
    reward: {
      id: redemption.getRewardId(),
      name: redemption.getRewardName(),
      points: redemption.getPoints(),
    },
    resolvedAt: redemption.getResolvedAt()?.toISOString() ?? null,
    rejectionReason: redemption.getRejectionReason(),
  };
}

// Empleado o "Sistema". null si todavía no se resolvió o lo canceló el Cliente (§3.6.2)
function resolvedByOf(redemption: Redemption): StaffRedemptionResponse['resolvedBy'] {
  const name = redemption.getResolvedByName();
  if (name === null) return null;
  const accountId = redemption.getResolvedByAccountId();
  return accountId === null && name === SYSTEM_NAME
    ? { actorType: 'SYSTEM', accountId: null, name }
    : { actorType: 'EMPLOYEE', accountId, name };
}

export const RedemptionResponse = {
  // `now` se pasa para poder probar el borde del vencimiento
  forCustomer(redemption: Redemption, now: Date = new Date()): CustomerRedemptionResponse {
    return {
      ...commonOf(redemption),
      canCancel: redemption.getStatus() === 'CONFIRMED' && redemption.getExpiresAt().getTime() > now.getTime(),
    };
  },

  forStaff(
    redemption: Redemption,
    customer: StaffRedemptionResponse['customer'],
  ): StaffRedemptionResponse {
    const confirmedByAccountId = redemption.getConfirmedByAccountId();
    const confirmedByName = redemption.getConfirmedByName();
    return {
      ...commonOf(redemption),
      customer,
      origin: redemption.getOrigin(),
      confirmedBy:
        confirmedByAccountId !== null && confirmedByName !== null
          ? { accountId: confirmedByAccountId, name: confirmedByName }
          : null,
      resolvedBy: resolvedByOf(redemption),
      balanceBefore: redemption.getBalanceBefore(),
      balanceAfter: redemption.getBalanceAfter(),
    };
  },
};
