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
import { actorOf } from '../../audit/domain/audit-entry.js';
import { configurationSavedEntries } from '../../audit/domain/audit-entries.js';
import { toLoyaltySnapshot } from './loyalty-audit-snapshot.js';

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
    @CurrentUser() user: CurrentUserData,
  ): Promise<LoyaltyProgramConfigurationResponseDto> {
    const { configuration } = await this.auditService.capture(
      async () => {
        const before = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        const saved = await this.loyaltyService.updateConfiguration({
          baseAmount: dto.baseAmount,
          pointsAwarded: dto.pointsAwarded,
          pointsExpirationMonths: dto.pointsExpirationMonths,
          bonusType: dto.bonusType,
          bonusValue: dto.bonusValue,
          silverMinPoints: dto.silverMinPoints,
          goldMinPoints: dto.goldMinPoints,
        });
        return { before, configuration: saved };
      },
      ({ before, configuration: saved }) =>
        configurationSavedEntries(actorOf(user), before, toLoyaltySnapshot(saved)),
    );
    return LoyaltyProgramConfigurationResponseDto.fromDomain(configuration);
  }
}
