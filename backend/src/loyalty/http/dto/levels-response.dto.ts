import { BRONZE_MIN_POINTS } from '../../domain/levels.js';
import { LoyaltyProgramConfiguration } from '../../domain/loyalty-program-configuration.js';

type LevelRow = {
  level: 'BRONZE' | 'SILVER' | 'GOLD';
  minPoints: number;
  editable: boolean;
};

// §3.7.1 y S5 §3.10: la respuesta de GET y PUT /loyalty/configuration/levels
export class LevelsResponseDto {
  levels: LevelRow[];
  bronzeBenefit: string | null;
  silverBenefit: string | null;
  goldBenefit: string | null;
  configurationVersion: number;
  updatedAt: Date;

  private constructor(configuration: LoyaltyProgramConfiguration) {
    this.levels = [
      { level: 'BRONZE', minPoints: BRONZE_MIN_POINTS, editable: false },
      { level: 'SILVER', minPoints: configuration.getSilverMinPoints(), editable: true },
      { level: 'GOLD', minPoints: configuration.getGoldMinPoints(), editable: true },
    ];
    this.bronzeBenefit = configuration.getBronzeBenefit();
    this.silverBenefit = configuration.getSilverBenefit();
    this.goldBenefit = configuration.getGoldBenefit();
    this.configurationVersion = configuration.getVersion();
    this.updatedAt = configuration.getCreatedAt();
  }

  static fromDomain(configuration: LoyaltyProgramConfiguration): LevelsResponseDto {
    return new LevelsResponseDto(configuration);
  }
}
