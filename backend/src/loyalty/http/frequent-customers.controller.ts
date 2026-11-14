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
import { frequentCustomersUpdatedEntry } from '../../audit/domain/audit-entries.js';
import { FrequentCustomersResponseDto } from './dto/frequent-customers-response.dto.js';
import { SetFrequentCustomersDto } from './dto/set-frequent-customers.dto.js';

// US-51 (§3.9.6): mínimo de consumos de un cliente frecuente (S5-22)
@Controller('loyalty/configuration/frequent-customers')
// RolesGuard (global) cierra todo endpoint sin @Roles: solo el Administrador configura el programa
@Roles('ADMIN')
@UseGuards(AdminRoleGuard)
@UseFilters(LoyaltyExceptionFilter)
export class FrequentCustomersController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly auditService: AuditService,
  ) {}

  // GET /api/loyalty/configuration/frequent-customers -> { minConsumptions }
  @Get()
  async getCurrent(): Promise<FrequentCustomersResponseDto> {
    const configuration = await this.loyaltyService.getActiveConfiguration();
    return FrequentCustomersResponseDto.fromDomain(configuration);
  }

  // PUT /api/loyalty/configuration/frequent-customers -> CA-51.2: versión nueva y
  // FREQUENT_CUSTOMERS_UPDATED, en la misma transacción
  @Put()
  async set(
    @Body() dto: SetFrequentCustomersDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<FrequentCustomersResponseDto> {
    const { configuration } = await this.auditService.capture(
      async () => {
        const before = (await this.loyaltyService.getActiveConfiguration()).getFrequentMinConsumptions();
        const saved = await this.loyaltyService.setFrequentMinConsumptions(dto.minConsumptions);
        return { before, configuration: saved };
      },
      ({ before, configuration: saved }) =>
        frequentCustomersUpdatedEntry(actorOf(user), before, saved.getFrequentMinConsumptions()),
    );
    return FrequentCustomersResponseDto.fromDomain(configuration);
  }
}
