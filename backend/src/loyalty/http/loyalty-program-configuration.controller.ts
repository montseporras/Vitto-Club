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

@Controller('loyalty/configuration')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class LoyaltyProgramConfigurationController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('current')
  async getCurrent(): Promise<LoyaltyProgramConfigurationResponseDto> {
    const configuration = await this.loyaltyService.getActiveConfiguration();
    return LoyaltyProgramConfigurationResponseDto.fromDomain(configuration);
  }

  @Put()
  async update(
    @Body() dto: UpdateLoyaltyConfigurationDto,
  ): Promise<LoyaltyProgramConfigurationResponseDto> {
    const configuration = await this.loyaltyService.updateConfiguration({
      baseAmount: dto.baseAmount,
      pointsAwarded: dto.pointsAwarded,
      pointsExpirationMonths: dto.pointsExpirationMonths,
      bonusType: dto.bonusType,
      bonusValue: dto.bonusValue,
    });
    return LoyaltyProgramConfigurationResponseDto.fromDomain(configuration);
  }
}
