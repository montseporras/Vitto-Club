import {
  FirstConsumptionBonus,
  FirstConsumptionBonusType,
} from '../../domain/first-consumption-bonus.js';

export class FirstConsumptionBonusResponseDto {
  bonusType: FirstConsumptionBonusType;
  bonusValue: number;
  updatedAt: Date;

  private constructor(bonus: FirstConsumptionBonus) {
    this.bonusType = bonus.getBonusType();
    this.bonusValue = bonus.getBonusValue();
    this.updatedAt = bonus.getUpdatedAt();
  }

  static fromDomain(bonus: FirstConsumptionBonus): FirstConsumptionBonusResponseDto {
    return new FirstConsumptionBonusResponseDto(bonus);
  }
}
