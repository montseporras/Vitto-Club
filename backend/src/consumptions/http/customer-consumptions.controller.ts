import { Controller, Get, Param, ParseIntPipe, Query, UseFilters } from '@nestjs/common';
import { ConsumptionsService } from '../application/consumptions.service.js';
import { ListCustomerConsumptionsQueryDto } from './dto/list-customer-consumptions-query.dto.js';
import { ConsumptionResponseDto } from './dto/consumption-response.dto.js';
import { ConsumptionsExceptionFilter } from './filters/consumptions-exception.filter.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';

// §3.2.1: GET /customers/:id/consumos es de US-22 (no de US-23, que vive en /consumos).
// Controller propio porque la ruta cuelga de "customers", no de "consumos" — mismo
// criterio que cualquier otro endpoint anidado en este repo.
@Controller('customers')
@Roles('ADMIN', 'CASHIER')
@UseFilters(ConsumptionsExceptionFilter)
export class CustomerConsumptionsController {
  constructor(
    private readonly consumptionsService: ConsumptionsService,
    private readonly customersService: CustomersService,
  ) {}

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
