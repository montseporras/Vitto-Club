import {
  Body,
  Controller,
  Get,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from '../application/loyalty.service.js';
import { FirstPurchaseBonusResponseDto } from './dto/first-purchase-bonus-response.dto.js';
import { SetFirstPurchaseBonusDto } from './dto/set-first-purchase-bonus.dto.js';
import { LoyaltyExceptionFilter } from './filters/loyalty-exception.filter.js';
import { AdminRoleGuard } from './guards/admin-role.guard.js';
import { Roles } from '../../shared/security/roles.decorator.js';

@Controller('loyalty/configuration/first-purchase-bonus')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class FirstPurchaseBonusController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  async getCurrent(): Promise<FirstPurchaseBonusResponseDto> {
    const bonus = await this.loyaltyService.getCurrentFirstPurchaseBonus();
    return FirstPurchaseBonusResponseDto.fromDomain(bonus);
  }

  @Put()
  async set(
    @Body() dto: SetFirstPurchaseBonusDto,
  ): Promise<FirstPurchaseBonusResponseDto> {
    const bonus = await this.loyaltyService.setFirstPurchaseBonus({
      bonusType: dto.bonusType,
      bonusValue: dto.bonusValue,
    });
    return FirstPurchaseBonusResponseDto.fromDomain(bonus);
  }
}
