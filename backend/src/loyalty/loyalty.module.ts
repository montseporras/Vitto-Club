import { Module } from '@nestjs/common';
import { LoyaltyService } from './application/loyalty.service.js';
import { LoyaltyConfigurationRepository } from './domain/port/loyalty-configuration.repository.js';
import { LoyaltyPrismaRepository } from './infrastructure/loyalty-prisma.repository.js';
import { LoyaltyController } from './http/loyalty.controller.js';
import { AdminRoleGuard } from './http/guards/admin-role.guard.js';
import { PointsValidityController } from './http/points-validity.controller.js';
import { FirstPurchaseBonusController } from './http/first-purchase-bonus.controller.js';
import { FirstPurchaseBonusValueValidator } from './http/validators/first-purchase-bonus-value.validator.js';
import { LoyaltyProgramConfigurationController } from './http/loyalty-program-configuration.controller.js';

@Module({
  controllers: [
    LoyaltyController,
    PointsValidityController,
    FirstPurchaseBonusController,
    LoyaltyProgramConfigurationController,
  ],
  providers: [
    LoyaltyService,
    AdminRoleGuard,
    FirstPurchaseBonusValueValidator,
    {
      provide: LoyaltyConfigurationRepository,
      useClass: LoyaltyPrismaRepository,
    },
  ],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
