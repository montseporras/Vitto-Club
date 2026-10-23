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
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import { pointsValidityUpdatedEntry } from '../../audit/domain/audit-entries.js';
import { toLoyaltySnapshot } from './loyalty-audit-snapshot.js';
import { PointsValidityResponseDto } from './dto/points-validity-response.dto.js';
import { SetPointsValidityDto } from './dto/set-points-validity.dto.js';
import { DEFAULT_POINTS_EXPIRATION_MONTHS } from '../domain/points-validity.js';

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
    @Body() dto: SetPointsValidityDto = new SetPointsValidityDto(),
    @CurrentUser() user: CurrentUserData,
  ): Promise<PointsValidityResponseDto> {
    const { validity } = await this.auditService.capture(
      async () => {
        const before = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        const saved = await this.loyaltyService.setPointsValidity({
          pointsExpirationMonths:
            dto?.pointsExpirationMonths ?? DEFAULT_POINTS_EXPIRATION_MONTHS,
        });
        const after = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        return { before, after, validity: saved };
      },
      ({ before, after }) => pointsValidityUpdatedEntry(actorOf(user), before, after),
    );
    return PointsValidityResponseDto.fromDomain(validity);
  }
}
