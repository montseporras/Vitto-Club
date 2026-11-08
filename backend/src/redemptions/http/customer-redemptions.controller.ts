import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseFilters,
} from '@nestjs/common';
import { CustomersService } from '../../customers/application/customers.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { RedemptionsService } from '../application/redemptions.service.js';
import { ConfirmRedemptionDto } from './dto/confirm-redemption.dto.js';
import { RedemptionResponse } from './dto/redemption-response.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// US-40, §3.7.1. Las rutas cuelgan de "customers": POST /customers/me/canjes es del Cliente y
// POST /customers/:id/canjes de Administrador y Cajero (matriz §4).
@Controller('customers')
@Roles('ADMIN', 'CASHIER')
@UseFilters(RedemptionsExceptionFilter)
export class CustomerRedemptionsController {
  constructor(
    private readonly redemptionsService: RedemptionsService,
    private readonly customersService: CustomersService,
  ) {}

  // POST /api/customers/me/canjes -> CA-40.1, CA-40.5, CA-40.10. Solo el Cliente (pisa el @Roles
  // de la clase); el cliente sale del token, nunca del body. Tiene que ir ANTES que
  // ':id/canjes', si no "me" se interpretaría como un id.
  @Post('me/canjes')
  @Roles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  async confirmMine(@Body() dto: ConfirmRedemptionDto, @CurrentUser() user: CurrentUserData) {
    // Un token de Cliente siempre trae customerId; si no lo trae, se rechaza igual que el RolesGuard
    if (user.customerId === undefined) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to perform this operation',
        code: 'FORBIDDEN',
      });
    }

    const redemption = await this.redemptionsService.confirm({
      customerId: user.customerId,
      rewardId: dto.rewardId,
      confirmedBy: null,
    });

    // §3.6.2: el Cliente ve su vista reducida, con canCancel
    return { redemption: RedemptionResponse.forCustomer(redemption) };
  }

  // POST /api/customers/:id/canjes -> CA-40.1, CA-40.5, CA-40.10. Administrador y Cajero, en
  // nombre del cliente de la ruta; `confirmedBy` es el empleado del token.
  @Post(':id/canjes')
  @HttpCode(HttpStatus.CREATED)
  async confirmForCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmRedemptionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const redemption = await this.redemptionsService.confirm({
      customerId: id,
      rewardId: dto.rewardId,
      confirmedBy: { accountId: user.accountId, employeeId: user.employeeId as number },
    });

    const customer = await this.customersService.findById(id);
    return {
      redemption: RedemptionResponse.forStaff(redemption, {
        id: customer.getId() as number,
        firstName: customer.getFirstName(),
        lastName: customer.getLastName(),
        documentType: customer.getDocumentType(),
        documentNumber: customer.getDocumentNumber(),
      }),
    };
  }
}
