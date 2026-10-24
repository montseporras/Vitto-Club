import { Consumption, ConsumptionViewerRole } from '../../domain/consumption.js';

// §3.10.2: lo que ve el Cliente en su historial. No trae registeredBy, voidedBy, canVoid ni
// voidableUntil.
export type CustomerConsumptionResponse = Omit<
  ConsumptionResponseDto,
  'registeredBy' | 'voidedBy' | 'canVoid' | 'voidableUntil'
>;

// §3.3.3. Nunca incluye datos del cliente más allá de lo que lista el contrato (nada de
// email/teléfono): eso es responsabilidad de customers, no de esta respuesta.
export class ConsumptionResponseDto {
  id: number;
  code: string;
  createdAt: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
  };
  amount: number;
  points: number;
  bonusPoints: number;
  totalPoints: number;
  equivalence: { baseAmount: number; pointsAwarded: number; configurationVersion: number };
  notes: string | null;
  status: 'REGISTERED' | 'VOIDED';
  registeredBy: { accountId: number; name: string };
  voidedAt: string | null;
  voidedBy: { accountId: number; name: string } | null;
  voidReason: string | null;
  voidableUntil: string | null;
  canVoid: boolean;

  private constructor() {
    // Se completa entero en fromDomain(); el constructor queda privado para forzar ese
    // único punto de entrada (mismo criterio que AccountResponseDto.fromProfile).
  }

  static fromDomain(
    consumption: Consumption,
    customer: { id: number; firstName: string; lastName: string; documentType: string; documentNumber: string },
    viewer: { role: ConsumptionViewerRole; accountId: number },
  ): ConsumptionResponseDto {
    const dto = new ConsumptionResponseDto();
    const eligibility = consumption.getVoidEligibility(viewer);
    const voidedByAccountId = consumption.getVoidedByAccountId();
    const voidedByName = consumption.getVoidedByName();

    dto.id = consumption.getId() as number;
    dto.code = consumption.getCode() as string;
    dto.createdAt = consumption.getCreatedAt().toISOString();
    dto.customer = customer;
    dto.amount = consumption.getAmount();
    dto.points = consumption.getPoints();
    dto.bonusPoints = consumption.getBonusPoints();
    dto.totalPoints = consumption.getTotalPoints();
    dto.equivalence = {
      baseAmount: consumption.getBaseAmount(),
      pointsAwarded: consumption.getPointsAwarded(),
      configurationVersion: consumption.getConfigurationVersion(),
    };
    dto.notes = consumption.getNotes();
    dto.status = consumption.getStatus();
    dto.registeredBy = {
      accountId: consumption.getRegisteredByAccountId(),
      name: consumption.getRegisteredByName(),
    };
    dto.voidedAt = consumption.getVoidedAt()?.toISOString() ?? null;
    dto.voidedBy =
      voidedByAccountId !== null && voidedByName !== null
        ? { accountId: voidedByAccountId, name: voidedByName }
        : null;
    dto.voidReason = consumption.getVoidedReason();
    dto.voidableUntil = eligibility.voidableUntil?.toISOString() ?? null;
    dto.canVoid = eligibility.canVoid;

    return dto;
  }

  // US-23, GET /customers/me/consumos (CA-23.7): sin los datos de empleados
  static forCustomer(
    consumption: Consumption,
    customer: { id: number; firstName: string; lastName: string; documentType: string; documentNumber: string },
  ): CustomerConsumptionResponse {
    return {
      id: consumption.getId() as number,
      code: consumption.getCode() as string,
      createdAt: consumption.getCreatedAt().toISOString(),
      customer,
      amount: consumption.getAmount(),
      points: consumption.getPoints(),
      bonusPoints: consumption.getBonusPoints(),
      totalPoints: consumption.getTotalPoints(),
      equivalence: {
        baseAmount: consumption.getBaseAmount(),
        pointsAwarded: consumption.getPointsAwarded(),
        configurationVersion: consumption.getConfigurationVersion(),
      },
      notes: consumption.getNotes(),
      status: consumption.getStatus(),
      voidedAt: consumption.getVoidedAt()?.toISOString() ?? null,
      voidReason: consumption.getVoidedReason(),
    };
  }
}
