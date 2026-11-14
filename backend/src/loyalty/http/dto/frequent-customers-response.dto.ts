import { LoyaltyProgramConfiguration } from '../../domain/loyalty-program-configuration.js';

// §3.9.6: la respuesta de GET y PUT /loyalty/configuration/frequent-customers
export class FrequentCustomersResponseDto {
  minConsumptions: number;

  private constructor(configuration: LoyaltyProgramConfiguration) {
    this.minConsumptions = configuration.getFrequentMinConsumptions();
  }

  static fromDomain(configuration: LoyaltyProgramConfiguration): FrequentCustomersResponseDto {
    return new FrequentCustomersResponseDto(configuration);
  }
}
