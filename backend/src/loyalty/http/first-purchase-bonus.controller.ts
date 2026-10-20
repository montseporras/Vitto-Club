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
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import { firstPurchaseBonusUpdatedEntry } from '../../audit/domain/audit-entries.js';
import { toLoyaltySnapshot } from './loyalty-audit-snapshot.js';

@Controller('loyalty/configuration/first-purchase-bonus')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class FirstPurchaseBonusController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async getCurrent(): Promise<FirstPurchaseBonusResponseDto> {
    const bonus = await this.loyaltyService.getCurrentFirstPurchaseBonus();
    return FirstPurchaseBonusResponseDto.fromDomain(bonus);
  }

  @Put()
  async set(
    @Body() dto: SetFirstPurchaseBonusDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<FirstPurchaseBonusResponseDto> {
    const { bonus } = await this.auditService.capture(
      async () => {
        const before = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        const saved = await this.loyaltyService.setFirstPurchaseBonus({
          bonusType: dto.bonusType,
          bonusValue: dto.bonusValue,
        });
        const after = toLoyaltySnapshot(await this.loyaltyService.getActiveConfiguration());
        return { before, after, bonus: saved };
      },
      ({ before, after }) => firstPurchaseBonusUpdatedEntry(actorOf(user), before, after),
    );
    return FirstPurchaseBonusResponseDto.fromDomain(bonus);
  }
}
