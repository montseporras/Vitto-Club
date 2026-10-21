import {
  Body,
  Controller,
  Get,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from '../application/loyalty.service.js';
import { FirstConsumptionBonusResponseDto } from './dto/first-consumption-bonus-response.dto.js';
import { SetFirstConsumptionBonusDto } from './dto/set-first-consumption-bonus.dto.js';
import { LoyaltyExceptionFilter } from './filters/loyalty-exception.filter.js';
import { AdminRoleGuard } from './guards/admin-role.guard.js';
import { Roles } from '../../shared/security/roles.decorator.js';

@Controller('loyalty/configuration/first-consumption-bonus')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class FirstConsumptionBonusController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  async getCurrent(): Promise<FirstConsumptionBonusResponseDto> {
    const bonus = await this.loyaltyService.getCurrentFirstConsumptionBonus();
    return FirstConsumptionBonusResponseDto.fromDomain(bonus);
  }

  @Put()
  async set(
    @Body() dto: SetFirstConsumptionBonusDto,
  ): Promise<FirstConsumptionBonusResponseDto> {
    const bonus = await this.loyaltyService.setFirstConsumptionBonus({
      bonusType: dto.bonusType,
      bonusValue: dto.bonusValue,
    });
    return FirstConsumptionBonusResponseDto.fromDomain(bonus);
  }
}
