import { Module } from '@nestjs/common';
import { LoyaltyService } from './application/loyalty.service.js';
import { LoyaltyConfigurationRepository } from './domain/port/loyalty-configuration.repository.js';
import { LoyaltyPrismaRepository } from './infrastructure/loyalty-prisma.repository.js';
import { LoyaltyController } from './http/loyalty.controller.js';
import { AdminRoleGuard } from './http/guards/admin-role.guard.js';
import { PointsValidityController } from './http/points-validity.controller.js';
import { FirstConsumptionBonusController } from './http/first-consumption-bonus.controller.js';
import { FirstConsumptionBonusValueValidator } from './http/validators/first-consumption-bonus-value.validator.js';
import { LoyaltyProgramConfigurationController } from './http/loyalty-program-configuration.controller.js';

@Module({
  controllers: [
    LoyaltyController,
    PointsValidityController,
    FirstConsumptionBonusController,
    LoyaltyProgramConfigurationController,
  ],
  providers: [
    LoyaltyService,
    AdminRoleGuard,
    FirstConsumptionBonusValueValidator,
    {
      provide: LoyaltyConfigurationRepository,
      useClass: LoyaltyPrismaRepository,
    },
  ],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
