import { Controller, ForbiddenException, HttpCode, HttpStatus, Param, Patch, UseFilters } from '@nestjs/common';
import { RedemptionResolutionService } from '../application/redemption-resolution.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { toCustomerRedemptionDto } from './dto/redemption-response.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// Contrato S4 §1 y §4: /customers/me/canjes y …/cancelar son solo del Cliente. Va en su propio
// controller con el prefijo completo (customers/me/canjes): no choca con las rutas
// /customers/:id… de CustomersController. US-45 suma acá GET /customers/me/canjes.
@Controller('customers/me/canjes')
@Roles('CUSTOMER')
@UseFilters(RedemptionsExceptionFilter)
export class CustomerRedemptionsController {
  constructor(private readonly resolution: RedemptionResolutionService) {}

  // PATCH /api/customers/me/canjes/:code/cancelar (§3.10.3, CA-43.4 a CA-43.6). Sin body.
  @Patch(':code/cancelar')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('code') code: string, @CurrentUser() user: CurrentUserData) {
    // Un token de Cliente siempre trae customerId; si no lo trae, se rechaza igual que el RolesGuard
    if (user.customerId === undefined) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to perform this operation',
        code: 'FORBIDDEN',
      });
    }
    const now = new Date();
    const redemption = await this.resolution.cancel({ code, customerId: user.customerId }, now);
    return { redemption: toCustomerRedemptionDto(redemption, now) };
  }
}
