import { Validate } from 'class-validator';
import { FrequentMinConsumptionsValidator } from '../validators/frequent-min-consumptions.validator.js';

// PUT /loyalty/configuration/frequent-customers (§3.9.6): entero de 1 a 100
export class SetFrequentCustomersDto {
  @Validate(FrequentMinConsumptionsValidator)
  minConsumptions!: number;
}
