import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Query, UseFilters } from '@nestjs/common';
import { RedemptionResolutionService } from '../application/redemption-resolution.service.js';
import { RedemptionUseService } from '../application/redemption-use.service.js';
import { RedemptionsQueryService } from '../application/redemptions-query.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { ListRedemptionsQueryDto } from './dto/list-redemptions-query.dto.js';
import { RejectRedemptionDto } from './dto/reject-redemption.dto.js';
import { toEmployeeRedemptionDto } from './dto/redemption-response.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// Contrato S4 §1 y §4: /canjes/:code, …/usar y …/rechazar son de Administrador y Cajero.
// US-43 agrega …/rechazar y US-45, GET /canjes (solo A). GET /canjes/:code (US-41) y …/usar (US-42)
// se suman acá.
@Controller('canjes')
@Roles('ADMIN', 'CASHIER')
@UseFilters(RedemptionsExceptionFilter)
export class RedemptionsController {
  constructor(
    private readonly resolution: RedemptionResolutionService,
    private readonly use: RedemptionUseService,
    private readonly query: RedemptionsQueryService,
  ) {}

  // PATCH /api/canjes/:code/usar (US-42, §3.9.1, CA-42.1 a CA-42.11). Sin body.
  @Patch(':code/usar')
  @HttpCode(HttpStatus.OK)
  async usar(@Param('code') code: string, @CurrentUser() user: CurrentUserData) {
    const { redemption, customer, balanceBefore, balanceAfter } = await this.use.use({
      code,
      actor: { accountId: user.accountId, employeeId: user.employeeId as number },
    });
    return { redemption: toEmployeeRedemptionDto(redemption, customer), balanceBefore, balanceAfter };
  }

  // GET /api/canjes — pantalla Canjes del Administrador (§3.12.3, CA-45.7). Solo el Administrador
  // (§4, CA-45.10): pisa el @Roles de la clase.
  @Get()
  @Roles('ADMIN')
  async list(@Query() query: ListRedemptionsQueryDto) {
    const result = await this.query.listAll({
      documentType: query.documentType,
      documentNumber: query.documentNumber,
      code: query.code,
      rewardName: query.rewardName,
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
      order: query.order,
      page: query.page,
      limit: query.limit,
    });
    return {
      items: result.items.map(({ redemption, customer }) => toEmployeeRedemptionDto(redemption, customer)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

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
