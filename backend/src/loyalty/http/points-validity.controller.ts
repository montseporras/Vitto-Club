import {
  Body,
  Controller,
  Get,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from '../application/loyalty.service.js';
import { LoyaltyExceptionFilter } from './filters/loyalty-exception.filter.js';
import { AdminRoleGuard } from './guards/admin-role.guard.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { PointsValidityResponseDto } from './dto/points-validity-response.dto.js';
import { SetPointsValidityDto } from './dto/set-points-validity.dto.js';
import { DEFAULT_POINTS_EXPIRATION_MONTHS } from '../domain/points-validity.js';

@Controller('loyalty/configuration/points-validity')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class PointsValidityController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  async getCurrent(): Promise<PointsValidityResponseDto> {
    const validity = await this.loyaltyService.getCurrentPointsValidity();
    return PointsValidityResponseDto.fromDomain(validity);
  }

  @Put()
  async set(
    @Body() dto: SetPointsValidityDto = new SetPointsValidityDto(),
  ): Promise<PointsValidityResponseDto> {
    const validity = await this.loyaltyService.setPointsValidity({
      pointsExpirationMonths:
        dto?.pointsExpirationMonths ?? DEFAULT_POINTS_EXPIRATION_MONTHS,
    });
    return PointsValidityResponseDto.fromDomain(validity);
  }
}
