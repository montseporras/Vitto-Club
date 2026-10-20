import {
  FirstPurchaseBonus,
  FirstPurchaseBonusType,
} from '../../domain/first-purchase-bonus.js';

export class FirstPurchaseBonusResponseDto {
  bonusType: FirstPurchaseBonusType;
  bonusValue: number;
  updatedAt: Date;

  private constructor(bonus: FirstPurchaseBonus) {
    this.bonusType = bonus.getBonusType();
    this.bonusValue = bonus.getBonusValue();
    this.updatedAt = bonus.getUpdatedAt();
  }

  static fromDomain(bonus: FirstPurchaseBonus): FirstPurchaseBonusResponseDto {
    return new FirstPurchaseBonusResponseDto(bonus);
  }
}
