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
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import { firstConsumptionBonusUpdatedEntry } from '../../audit/domain/audit-entries.js';
import { toLoyaltySnapshot } from './loyalty-audit-snapshot.js';

@Controller('loyalty/configuration/first-consumption-bonus')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class FirstConsumptionBonusController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async getCurrent(): Promise<FirstConsumptionBonusResponseDto> {
    const bonus = await this.loyaltyService.getCurrentFirstConsumptionBonus();
    return FirstConsumptionBonusResponseDto.fromDomain(bonus);
  }

  @Put()
  async set(
    @Body() dto: SetFirstConsumptionBonusDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<FirstConsumptionBonusResponseDto> {
    const { bonus } = await this.auditService.capture(
      async () => {
        const before = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        const saved = await this.loyaltyService.setFirstConsumptionBonus({
          bonusType: dto.bonusType,
          bonusValue: dto.bonusValue,
        });
        const after = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        return { before, after, bonus: saved };
      },
      ({ before, after }) => firstConsumptionBonusUpdatedEntry(actorOf(user), before, after),
    );
    return FirstConsumptionBonusResponseDto.fromDomain(bonus);
  }
}
