import { Controller, Get, Param, ParseIntPipe, UseFilters } from '@nestjs/common';
import { RedemptionsQueryService } from '../application/redemptions-query.service.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { toEmployeeRedemptionDto } from './dto/redemption-response.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// Contrato S4 §1 y §4: GET /customers/:id/canjes es de Administrador y Cajero (panel de Caja,
// "Canjes para usar ahora"). Se registra DESPUÉS que CustomerRedemptionsController
// (customers/me/canjes): si no, "me" se interpretaría como un id.
@Controller('customers')
@Roles('ADMIN', 'CASHIER')
@UseFilters(RedemptionsExceptionFilter)
export class CustomerRedemptionsStaffController {
  constructor(private readonly query: RedemptionsQueryService) {}

  // GET /api/customers/:id/canjes (§3.12.2, CA-42.9 y CA-45.6): solo Confirmados vigentes, el que
  // vence primero arriba. Sin paginado.
  @Get(':id/canjes')
  async listUsableNow(@Param('id', ParseIntPipe) id: number) {
    const { redemptions, customer } = await this.query.listUsableNow(id);
    if (!customer) return [];
    return redemptions.map((redemption) => toEmployeeRedemptionDto(redemption, customer));
  }
}
