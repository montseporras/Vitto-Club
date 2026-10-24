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
import { levelsUpdatedEntry } from '../../audit/domain/audit-entries.js';
import { toLoyaltySnapshot } from './loyalty-audit-snapshot.js';
import { LevelsResponseDto } from './dto/levels-response.dto.js';
import { SetLevelsDto } from './dto/set-levels.dto.js';

// US-27 (§3.7): umbrales de Plata y Oro. Bronce arranca siempre en 0.
@Controller('loyalty/configuration/levels')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class LevelsController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly auditService: AuditService,
  ) {}

  // GET /api/loyalty/configuration/levels -> CA-27.1
  @Get()
  async getCurrent(): Promise<LevelsResponseDto> {
    const configuration = await this.loyaltyService.getActiveConfiguration();
    return LevelsResponseDto.fromDomain(configuration);
  }

  // PUT /api/loyalty/configuration/levels -> CA-27.2: versión nueva y LEVELS_UPDATED, en la
  // misma transacción
  @Put()
  async set(
    @Body() dto: SetLevelsDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<LevelsResponseDto> {
    const { configuration } = await this.auditService.capture(
      async () => {
        const before = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        const saved = await this.loyaltyService.setLevels({
          silverMinPoints: dto.silverMinPoints,
          goldMinPoints: dto.goldMinPoints,
        });
        return { before, configuration: saved };
      },
      ({ before, configuration: saved }) =>
        levelsUpdatedEntry(actorOf(user), before, toLoyaltySnapshot(saved)),
    );
    return LevelsResponseDto.fromDomain(configuration);
  }
}
