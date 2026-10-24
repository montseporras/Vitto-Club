import { Controller, ForbiddenException, Get, Param, ParseIntPipe, Query, UseFilters } from '@nestjs/common';
import { ConsumptionsService } from '../application/consumptions.service.js';
import { ListCustomerConsumptionsQueryDto } from './dto/list-customer-consumptions-query.dto.js';
import { ListMyConsumptionsQueryDto } from './dto/list-my-consumptions-query.dto.js';
import { ConsumptionResponseDto } from './dto/consumption-response.dto.js';
import { ConsumptionsExceptionFilter } from './filters/consumptions-exception.filter.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';

// §3.2.1: GET /customers/:id/consumos es de US-22 (no de US-23, que vive en /consumos).
// Controller propio porque la ruta cuelga de "customers", no de "consumos" — mismo
// criterio que cualquier otro endpoint anidado en este repo. GET /customers/me/consumos es de
// US-23 y vive acá por la misma razón.
@Controller('customers')
@Roles('ADMIN', 'CASHIER')
@UseFilters(ConsumptionsExceptionFilter)
export class CustomerConsumptionsController {
  constructor(
    private readonly consumptionsService: ConsumptionsService,
    private readonly customersService: CustomersService,
  ) {}

  // GET /api/customers/me/consumos -> CA-23.7, CA-23.8 (§3.10.2): solo el Cliente, pisa el
  // @Roles de la clase. Tiene que ir ANTES que ':id/consumos', si no "me" se interpretaría
  // como un id.
  @Get('me/consumos')
  @Roles('CUSTOMER')
  async listMine(@Query() query: ListMyConsumptionsQueryDto, @CurrentUser() user: CurrentUserData) {
    // Un token de Cliente siempre trae customerId; si no lo trae, se rechaza igual que el RolesGuard
    if (user.customerId === undefined) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to perform this operation',
        code: 'FORBIDDEN',
      });
    }

    const result = await this.consumptionsService.listMine({
      customerId: user.customerId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    const customer = await this.customersService.findById(user.customerId);
    const customerSnapshot = {
      id: customer.getId() as number,
      firstName: customer.getFirstName(),
      lastName: customer.getLastName(),
      documentType: customer.getDocumentType(),
      documentNumber: customer.getDocumentNumber(),
    };

    return {
      items: result.items.map((consumption) => ConsumptionResponseDto.forCustomer(consumption, customerSnapshot)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  // GET /api/customers/:id/consumos -> CA-22.1/22.2/22.3[B]
  @Get(':id/consumos')
  async listByCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListCustomerConsumptionsQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const viewer = { role: user.role as 'ADMIN' | 'CASHIER', accountId: user.accountId };

    const result = await this.consumptionsService.listByCustomer({
      customerId: id,
      viewer,
      status: query.status,
      last24h: query.last24h === undefined ? undefined : query.last24h === 'true',
      page: query.page,
      limit: query.limit,
    });

    const customer = await this.customersService.findById(id);
    const customerSnapshot = {
      id: customer.getId() as number,
      firstName: customer.getFirstName(),
      lastName: customer.getLastName(),
      documentType: customer.getDocumentType(),
      documentNumber: customer.getDocumentNumber(),
    };

    return {
      items: result.items.map((consumption) =>
        ConsumptionResponseDto.fromDomain(consumption, customerSnapshot, viewer),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
