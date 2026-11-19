import { Controller, ForbiddenException, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Query, UseFilters } from '@nestjs/common';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { MissionsClaimService } from '../application/missions-claim.service.js';
import { MissionsQueryService } from '../application/missions-query.service.js';
import { CustomerMissionsQueryDto } from './dto/customer-missions-query.dto.js';
import { CustomerMissionResponseDto } from './dto/customer-mission-response.dto.js';
import { MissionsExceptionFilter } from './filters/missions-exception.filter.js';

// Contrato S5 §3.3 y matriz de §4: /customers/me/misiones… es solo del Cliente (CA-31.7). Va en su
// propio controller con el prefijo completo, como customers/me/canjes: no choca con las rutas
// /customers/:id… US-33 suma GET /customers/me/misiones.
@Controller('customers/me/misiones')
@Roles('CUSTOMER')
@UseFilters(MissionsExceptionFilter)
export class CustomerMissionsController {
  constructor(
    private readonly claims: MissionsClaimService,
    private readonly query: MissionsQueryService,
  ) {}

  // GET /api/customers/me/misiones -> CA-33.1 a CA-33.3 (§3.3.2). En el mes actual asigna las en curso
  // que el cliente todavía no tenía. El cliente sale del token.
  @Get()
  async listMine(@Query() query: CustomerMissionsQueryDto, @CurrentUser() user: CurrentUserData) {
    const items = await this.query.listMine(this.customerIdOf(user), query.period);
    return items.map((item) => CustomerMissionResponseDto.forCustomer(item));
  }

  // PATCH /api/customers/me/misiones/:id/reclamar -> CA-31.1 a CA-31.6 (§3.3.3). Sin body. `:id` es
  // la asignación (customer_missions.id). El cliente sale del token.
  @Patch(':id/reclamar')
  @HttpCode(HttpStatus.OK)
  async claim(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    const result = await this.claims.reclamarDelCliente(id, this.customerIdOf(user));
    return {
      customerMission: CustomerMissionResponseDto.forCustomer(result.customerMission),
      balanceAfter: result.balanceAfter,
    };
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
