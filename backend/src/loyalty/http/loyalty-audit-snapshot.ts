import type { LoyaltyConfigSnapshot } from '../../audit/domain/audit-entries.js';
import type { LoyaltyProgramConfiguration } from '../domain/loyalty-program-configuration.js';

// Foto de la configuración vigente para la auditoría: datos primitivos, sin la entidad.
export function toLoyaltySnapshot(configuration: LoyaltyProgramConfiguration): LoyaltyConfigSnapshot {
  return {
    baseAmount: configuration.getBaseAmount(),
    pointsAwarded: configuration.getPointsAwarded(),
    pointsExpirationMonths: configuration.getPointsExpirationMonths(),
    bonusType: configuration.getBonusType(),
    bonusValue: configuration.getBonusValue(),
    silverMinPoints: configuration.getSilverMinPoints(),
    goldMinPoints: configuration.getGoldMinPoints(),
  };
}
