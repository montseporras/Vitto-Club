import { Controller, ForbiddenException, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, UseFilters } from '@nestjs/common';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { MissionsClaimService } from '../application/missions-claim.service.js';
import { CustomerMissionResponseDto } from './dto/customer-mission-response.dto.js';
import { MissionsExceptionFilter } from './filters/missions-exception.filter.js';

// Contrato S5 §3.3 y matriz de §4: /customers/me/misiones… es solo del Cliente (CA-31.7). Va en su
// propio controller con el prefijo completo, como customers/me/canjes: no choca con las rutas
// /customers/:id… US-33 agrega GET /customers/me/misiones acá.
@Controller('customers/me/misiones')
@Roles('CUSTOMER')
@UseFilters(MissionsExceptionFilter)
export class CustomerMissionsController {
  constructor(private readonly claims: MissionsClaimService) {}

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
