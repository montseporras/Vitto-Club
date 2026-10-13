import { PointsEquivalence } from '../points-equivalence.js';
import { PointsValidity } from '../points-validity.js';
import { FirstPurchaseBonus } from '../first-purchase-bonus.js';
import {
  LoyaltyProgramConfiguration,
  LoyaltyProgramConfigurationData,
  LoyaltyProgramConfigurationInput,
} from '../loyalty-program-configuration.js';

export abstract class LoyaltyConfigurationRepository {
  abstract savePointsEquivalence(
    configuration: PointsEquivalence,
  ): Promise<PointsEquivalence>;
  abstract findCurrentPointsEquivalence(): Promise<PointsEquivalence | null>;
  abstract savePointsValidity(
    validity: PointsValidity,
  ): Promise<PointsValidity>;
  abstract findCurrentPointsValidity(): Promise<PointsValidity>;
  abstract saveFirstPurchaseBonus(
    bonus: FirstPurchaseBonus,
  ): Promise<FirstPurchaseBonus>;
  abstract findCurrentFirstPurchaseBonus(): Promise<FirstPurchaseBonus | null>;
  abstract getActiveConfig(): Promise<LoyaltyProgramConfiguration>;
  abstract saveNewConfigVersion(
    configuration: LoyaltyProgramConfigurationData,
  ): Promise<LoyaltyProgramConfiguration>;
  abstract updateFullConfig(
    configuration: LoyaltyProgramConfigurationInput,
  ): Promise<LoyaltyProgramConfiguration>;
}
