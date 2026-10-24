import { PointsEquivalence } from '../points-equivalence.js';
import { PointsValidity } from '../points-validity.js';
import { FirstConsumptionBonus } from '../first-consumption-bonus.js';
import {
  LoyaltyProgramConfiguration,
  LoyaltyProgramConfigurationData,
  LoyaltyProgramConfigurationInput,
} from '../loyalty-program-configuration.js';
import type { LevelThresholds } from '../levels.js';

export abstract class LoyaltyConfigurationRepository {
  abstract savePointsEquivalence(
    configuration: PointsEquivalence,
  ): Promise<PointsEquivalence>;
  abstract findCurrentPointsEquivalence(): Promise<PointsEquivalence | null>;
  abstract savePointsValidity(
    validity: PointsValidity,
  ): Promise<PointsValidity>;
  abstract findCurrentPointsValidity(): Promise<PointsValidity>;
  abstract saveFirstConsumptionBonus(
    bonus: FirstConsumptionBonus,
  ): Promise<FirstConsumptionBonus>;
  abstract findCurrentFirstConsumptionBonus(): Promise<FirstConsumptionBonus | null>;
  // US-27: versión nueva con los umbrales de nivel, copiando el resto
  abstract saveLevels(
    thresholds: LevelThresholds,
  ): Promise<LoyaltyProgramConfiguration>;
  abstract getActiveConfig(): Promise<LoyaltyProgramConfiguration>;
  abstract saveNewConfigVersion(
    configuration: LoyaltyProgramConfigurationData,
  ): Promise<LoyaltyProgramConfiguration>;
  abstract updateFullConfig(
    configuration: LoyaltyProgramConfigurationInput,
  ): Promise<LoyaltyProgramConfiguration>;
}
