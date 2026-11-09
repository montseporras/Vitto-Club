import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseFilters } from '@nestjs/common';
import { RedemptionConfirmationService } from '../application/redemption-confirmation.service.js';
import { RedemptionsQueryService } from '../application/redemptions-query.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { ConfirmRedemptionDto } from './dto/confirm-redemption.dto.js';
import { toEmployeeRedemptionDto } from './dto/redemption-response.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// Contrato S4 §1 y §4: GET y POST /customers/:id/canjes son de Administrador y Cajero (panel de
// Caja, "Canjes para usar ahora" y confirmar en nombre del cliente). Se registra DESPUÉS que
// CustomerRedemptionsController (customers/me/canjes): si no, "me" se interpretaría como un id.
@Controller('customers')
@Roles('ADMIN', 'CASHIER')
@UseFilters(RedemptionsExceptionFilter)
export class CustomerRedemptionsStaffController {
  constructor(
    private readonly confirmation: RedemptionConfirmationService,
    private readonly query: RedemptionsQueryService,
  ) {}

  // GET /api/customers/:id/canjes (§3.12.2, CA-42.9 y CA-45.6): solo Confirmados vigentes, el que
  // vence primero arriba. Sin paginado.
  @Get(':id/canjes')
  async listUsableNow(@Param('id', ParseIntPipe) id: number) {
    const { redemptions, customer } = await this.query.listUsableNow(id);
    if (!customer) return [];
    return redemptions.map((redemption) => toEmployeeRedemptionDto(redemption, customer));
  }

  // POST /api/customers/:id/canjes (US-40, §3.7.1, CA-40.1, CA-40.5, CA-40.10). En nombre del
  // cliente de la ruta; confirmedBy es el empleado del token.
  @Post(':id/canjes')
  @HttpCode(HttpStatus.CREATED)
  async confirmForCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmRedemptionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const { redemption, customer } = await this.confirmation.confirm({
      customerId: id,
      rewardId: dto.rewardId,
      confirmedBy: { accountId: user.accountId, employeeId: user.employeeId as number },
    });
    return { redemption: toEmployeeRedemptionDto(redemption, customer) };
  }
}
