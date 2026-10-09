import {
  Body,
  Controller,
  Get,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from '../application/loyalty.service.js';
import { LoyaltyProgramConfigurationResponseDto } from './dto/loyalty-program-configuration-response.dto.js';
import { UpdateLoyaltyConfigurationDto } from './dto/update-loyalty-configuration.dto.js';
import { LoyaltyExceptionFilter } from './filters/loyalty-exception.filter.js';
import { AdminRoleGuard } from './guards/admin-role.guard.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { AuditCategory } from '../../audit/domain/audit.repository.js';

@Controller('loyalty/configuration')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class LoyaltyProgramConfigurationController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly auditService: AuditService,
  ) {}

  @Get('current')
  async getCurrent(): Promise<LoyaltyProgramConfigurationResponseDto> {
    const configuration = await this.loyaltyService.getActiveConfiguration();
    return LoyaltyProgramConfigurationResponseDto.fromDomain(configuration);
  }

  @Put()
  async update(
    @Body() dto: UpdateLoyaltyConfigurationDto,
    @CurrentUser() actor: CurrentUserData,
  ): Promise<LoyaltyProgramConfigurationResponseDto> {
    const configuration = await this.auditService.capture(
      () =>
        this.loyaltyService.updateConfiguration({
          baseAmount: dto.baseAmount,
          pointsAwarded: dto.pointsAwarded,
          pointsExpirationMonths: dto.pointsExpirationMonths,
          bonusType: dto.bonusType,
          bonusValue: dto.bonusValue,
        }),
      () => ({
        actorAccountId: actor.accountId,
        category: AuditCategory.CONFIGURATION,
        action: 'Modificación de configuración de puntos',
        details: {
          newValues: {
            baseAmount: dto.baseAmount,
            pointsAwarded: dto.pointsAwarded,
            pointsExpirationMonths: dto.pointsExpirationMonths,
            bonusType: dto.bonusType,
            bonusValue: dto.bonusValue,
          },
        },
      }),
    );
    return LoyaltyProgramConfigurationResponseDto.fromDomain(configuration);
  }
}
