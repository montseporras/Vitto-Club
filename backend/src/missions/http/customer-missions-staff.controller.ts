import { Controller, Get, Param, ParseIntPipe, Query, UseFilters } from '@nestjs/common';
import { Roles } from '../../shared/security/roles.decorator.js';
import { MissionsQueryService } from '../application/missions-query.service.js';
import { CustomerMissionsQueryDto } from './dto/customer-missions-query.dto.js';
import { CustomerMissionResponseDto } from './dto/customer-mission-response.dto.js';
import { MissionsExceptionFilter } from './filters/missions-exception.filter.js';

// Contrato S5 §3.3.4 y matriz de §4: GET /customers/:id/misiones es de Administrador y Cajero (RF-017).
// El Cliente recibe 403 (CA-33.6). Se registra DESPUÉS que CustomerMissionsController
// (customers/me/misiones): si no, "me" se interpretaría como un id (§4).
@Controller('customers')
@Roles('ADMIN', 'CASHIER')
@UseFilters(MissionsExceptionFilter)
export class CustomerMissionsStaffController {
  constructor(private readonly query: MissionsQueryService) {}

  // GET /api/customers/:id/misiones -> CA-33.2, CA-33.3, CA-33.5 y CA-33.6. Solo lee: no asigna.
  @Get(':id/misiones')
  async list(@Param('id', ParseIntPipe) id: number, @Query() query: CustomerMissionsQueryDto) {
    const items = await this.query.listForCustomer(id, query.period);
    return items.map((item) => CustomerMissionResponseDto.forStaff(item));
  }
}
