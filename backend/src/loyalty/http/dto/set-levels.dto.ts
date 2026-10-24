import { Validate } from 'class-validator';
import { LevelThresholdValidator } from '../validators/level-threshold.validator.js';

// PUT /loyalty/configuration/levels (§3.7.2): los dos umbrales son obligatorios
export class SetLevelsDto {
  @Validate(LevelThresholdValidator, ['silver'])
  silverMinPoints!: number;

  @Validate(LevelThresholdValidator, ['gold'])
  goldMinPoints!: number;
}
