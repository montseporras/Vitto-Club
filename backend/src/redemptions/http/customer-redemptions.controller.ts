import { Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Query, UseFilters } from '@nestjs/common';
import { RedemptionResolutionService } from '../application/redemption-resolution.service.js';
import { RedemptionsQueryService } from '../application/redemptions-query.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { ListMyRedemptionsQueryDto } from './dto/list-my-redemptions-query.dto.js';
import { toCustomerRedemptionDto } from './dto/redemption-response.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// Contrato S4 §1 y §4: /customers/me/canjes y …/cancelar son solo del Cliente. Va en su propio
// controller con el prefijo completo (customers/me/canjes): no choca con las rutas
// /customers/:id… de CustomersController. Se registra ANTES que CustomerRedemptionsStaffController
// (customers/:id/canjes): si no, "me" se interpretaría como un id (§4).
@Controller('customers/me/canjes')
@Roles('CUSTOMER')
@UseFilters(RedemptionsExceptionFilter)
export class CustomerRedemptionsController {
  constructor(
    private readonly resolution: RedemptionResolutionService,
    private readonly query: RedemptionsQueryService,
  ) {}

  // GET /api/customers/me/canjes — Mis canjes (§3.12.1, CA-45.1 y CA-45.2). Sin datos de empleados.
  @Get()
  async listMine(@Query() query: ListMyRedemptionsQueryDto, @CurrentUser() user: CurrentUserData) {
    const customerId = this.customerIdOf(user);
    const now = new Date();
    const result = await this.query.listMine(
      {
        customerId,
        status: query.status,
        fromDate: query.fromDate,
        toDate: query.toDate,
        order: query.order,
        page: query.page,
        limit: query.limit,
      },
      now,
    );
    return {
      items: result.items.map((redemption) => toCustomerRedemptionDto(redemption, now)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  // PATCH /api/customers/me/canjes/:code/cancelar (§3.10.3, CA-43.4 a CA-43.6). Sin body.
  @Patch(':code/cancelar')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('code') code: string, @CurrentUser() user: CurrentUserData) {
    const customerId = this.customerIdOf(user);
    const now = new Date();
    const redemption = await this.resolution.cancel({ code, customerId }, now);
    return { redemption: toCustomerRedemptionDto(redemption, now) };
  }

  // Un token de Cliente siempre trae customerId; si no lo trae, se rechaza igual que el RolesGuard
  private customerIdOf(user: CurrentUserData): number {
    if (user.customerId === undefined) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to perform this operation',
        code: 'FORBIDDEN',
      });
    }
    return user.customerId;
  }
}
