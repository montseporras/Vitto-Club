import { Body, Controller, HttpCode, HttpStatus, Param, Patch, UseFilters } from '@nestjs/common';
import { RedemptionResolutionService } from '../application/redemption-resolution.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { RejectRedemptionDto } from './dto/reject-redemption.dto.js';
import { toEmployeeRedemptionDto } from './dto/redemption-response.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// Contrato S4 §1 y §4: /canjes/:code, …/usar y …/rechazar son de Administrador y Cajero.
// US-43 agrega …/rechazar; GET /canjes/:code (US-41), …/usar (US-42) y GET /canjes (US-45, solo A)
// se suman acá.
@Controller('canjes')
@Roles('ADMIN', 'CASHIER')
@UseFilters(RedemptionsExceptionFilter)
export class RedemptionsController {
  constructor(private readonly resolution: RedemptionResolutionService) {}

  // PATCH /api/canjes/:code/rechazar (§3.10.1, CA-43.1 a CA-43.3)
  @Patch(':code/rechazar')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('code') code: string,
    @Body() dto: RejectRedemptionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const { redemption, customer } = await this.resolution.reject({
      code,
      reason: dto.reason,
      actor: { accountId: user.accountId, employeeId: user.employeeId as number },
    });
    return { redemption: toEmployeeRedemptionDto(redemption, customer) };
  }
}
