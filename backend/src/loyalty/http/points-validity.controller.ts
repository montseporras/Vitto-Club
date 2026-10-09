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
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { AuditCategory } from '../../audit/domain/audit.repository.js';

@Controller('loyalty/configuration/points-validity')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class PointsValidityController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async getCurrent(): Promise<PointsValidityResponseDto> {
    const validity = await this.loyaltyService.getCurrentPointsValidity();
    return PointsValidityResponseDto.fromDomain(validity);
  }

  @Put()
  async set(
    @CurrentUser() actor: CurrentUserData,
    @Body() dto: SetPointsValidityDto = new SetPointsValidityDto(),
  ): Promise<PointsValidityResponseDto> {
    const pointsExpirationMonths =
      dto?.pointsExpirationMonths ?? DEFAULT_POINTS_EXPIRATION_MONTHS;
    const validity = await this.auditService.capture(
      () => this.loyaltyService.setPointsValidity({ pointsExpirationMonths }),
      () => ({
        actorAccountId: actor.accountId,
        category: AuditCategory.CONFIGURATION,
        action: 'Modificación de vigencia de puntos',
        details: { newValues: { pointsExpirationMonths } },
      }),
    );
    return PointsValidityResponseDto.fromDomain(validity);
  }
}
