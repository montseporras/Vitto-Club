import { IsOptional, Validate } from 'class-validator';
import { LevelBenefitValidator } from '../validators/level-benefit.validator.js';
import { LevelThresholdValidator } from '../validators/level-threshold.validator.js';

// PUT /loyalty/configuration/levels (§3.7.2): los dos umbrales son obligatorios. Los beneficios
// (S5 §3.10) son opcionales: sin el campo se conserva el vigente; vacío o null lo borra.
export class SetLevelsDto {
  @Validate(LevelThresholdValidator, ['silver'])
  silverMinPoints!: number;

  @Validate(LevelThresholdValidator, ['gold'])
  goldMinPoints!: number;

  @IsOptional()
  @Validate(LevelBenefitValidator)
  bronzeBenefit?: string | null;

  @IsOptional()
  @Validate(LevelBenefitValidator)
  silverBenefit?: string | null;

  @IsOptional()
  @Validate(LevelBenefitValidator)
  goldBenefit?: string | null;
}
