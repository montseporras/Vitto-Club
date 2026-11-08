import { Controller, HttpCode, HttpStatus, Param, Patch, UseFilters } from '@nestjs/common';
import { CustomersService } from '../../customers/application/customers.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { RedemptionsService } from '../application/redemptions.service.js';
import { RedemptionResponse } from './dto/redemption-response.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// US-42, §3.9.1. Cajero y Administrador; el Cliente nunca llega acá (CA-42.11: 403, sin @Roles
// para él en esta clase).
@Controller('canjes')
@Roles('ADMIN', 'CASHIER')
@UseFilters(RedemptionsExceptionFilter)
export class RedemptionsController {
  constructor(
    private readonly redemptionsService: RedemptionsService,
    private readonly customersService: CustomersService,
  ) {}

  // PATCH /api/canjes/:code/usar -> CA-42.1 a CA-42.5, CA-42.7 a CA-42.11. Sin body.
  @Patch(':code/usar')
  @HttpCode(HttpStatus.OK)
  async usar(@Param('code') code: string, @CurrentUser() user: CurrentUserData) {
    const result = await this.redemptionsService.usar({
      code,
      actor: { accountId: user.accountId, employeeId: user.employeeId as number },
    });

    const customer = await this.customersService.findById(result.redemption.getCustomerId());
    return {
      redemption: RedemptionResponse.forStaff(result.redemption, {
        id: customer.getId() as number,
        firstName: customer.getFirstName(),
        lastName: customer.getLastName(),
        documentType: customer.getDocumentType(),
        documentNumber: customer.getDocumentNumber(),
      }),
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
    };
  }
}
