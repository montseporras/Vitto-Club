import { Controller, ForbiddenException, Get, Param, ParseIntPipe, Query, UseFilters } from '@nestjs/common';
import { PointsMovementsService } from '../application/points-movements.service.js';
import { ListCustomerMovementsQueryDto, ListMyMovementsQueryDto } from './dto/list-movements-query.dto.js';
import { PointsMovementResponseDto } from './dto/points-movement-response.dto.js';
import { PointsExceptionFilter } from './filters/points-exception.filter.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';

// US-26: movimientos de un cliente. La ruta cuelga de "customers" (como /customers/:id/consumos
// de US-22), pero el dueño es points.
@Controller('customers')
@UseFilters(PointsExceptionFilter)
export class CustomerPointsMovementsController {
  constructor(private readonly movementsService: PointsMovementsService) {}

  // GET /api/customers/me/movimientos -> CA-26.6, CA-26.7 (§3.10.2): solo el Cliente.
  // Tiene que ir ANTES que ':id/movimientos', si no "me" se interpretaría como un id.
  @Get('me/movimientos')
  @Roles('CUSTOMER')
  async listMine(@Query() query: ListMyMovementsQueryDto, @CurrentUser() user: CurrentUserData) {
    // Un token de Cliente siempre trae customerId; si no lo trae, se rechaza igual que el RolesGuard
    if (user.customerId === undefined) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to perform this operation',
        code: 'FORBIDDEN',
      });
    }
    const result = await this.movementsService.listMine({
      customerId: user.customerId,
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
    return PointsMovementResponseDto.customerPage(result);
  }

  // GET /api/customers/:id/movimientos -> CA-26.1 a CA-26.3 (§3.6.1)
  @Get(':id/movimientos')
  @Roles('ADMIN', 'CASHIER')
  async listByCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListCustomerMovementsQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const result = await this.movementsService.listByCustomer({
      customerId: id,
      viewerRole: user.role as 'ADMIN' | 'CASHIER',
      last24h: query.last24h === undefined ? undefined : query.last24h === 'true',
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
    return PointsMovementResponseDto.staffPage(result);
  }
}
