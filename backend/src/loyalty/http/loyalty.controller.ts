import {
  Body,
  Controller,
  Get,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from '../application/loyalty.service.js';
import { PointsEquivalenceResponseDto } from './dto/points-equivalence-response.dto.js';
import { SetPointsEquivalenceDto } from './dto/set-points-equivalence.dto.js';
import { AdminRoleGuard } from './guards/admin-role.guard.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import { pointsEquivalenceUpdatedEntry } from '../../audit/domain/audit-entries.js';
import { toLoyaltySnapshot } from './loyalty-audit-snapshot.js';
import { LoyaltyExceptionFilter } from './filters/loyalty-exception.filter.js';

@Controller('loyalty/configuration/points-equivalence')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class LoyaltyController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async getCurrent(): Promise<PointsEquivalenceResponseDto> {
    const configuration =
      await this.loyaltyService.getCurrentPointsEquivalence();
    return PointsEquivalenceResponseDto.fromDomain(configuration);
  }

  @Put()
  async set(
    @Body() dto: SetPointsEquivalenceDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PointsEquivalenceResponseDto> {
    const { configuration } = await this.auditService.capture(
      async () => {
        const before = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        const saved = await this.loyaltyService.setPointsEquivalence({
          baseAmount: dto.baseAmount,
          pointsAwarded: dto.pointsAwarded,
        });
        const after = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        return { before, after, configuration: saved };
      },
      ({ before, after }) => pointsEquivalenceUpdatedEntry(actorOf(user), before, after),
    );
    return PointsEquivalenceResponseDto.fromDomain(configuration);
  }
}
