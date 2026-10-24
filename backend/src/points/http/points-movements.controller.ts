import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { PointsMovementsService } from '../application/points-movements.service.js';
import { ListPointsMovementsQueryDto } from './dto/list-movements-query.dto.js';
import { PointsMovementResponseDto } from './dto/points-movement-response.dto.js';
import { PointsExceptionFilter } from './filters/points-exception.filter.js';
import { Roles } from '../../shared/security/roles.decorator.js';

// US-26, sección "Movimientos de puntos" del Administrador (§3.6.2). El Cajero recibe 403.
@Controller('movimientos-de-puntos')
@Roles('ADMIN')
@UseFilters(PointsExceptionFilter)
export class PointsMovementsController {
  constructor(private readonly movementsService: PointsMovementsService) {}

  // GET /api/movimientos-de-puntos -> CA-26.4
  @Get()
  async list(@Query() query: ListPointsMovementsQueryDto) {
    const result = await this.movementsService.listAll({
      q: query.q,
      customerId: query.customerId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
    return PointsMovementResponseDto.staffPage(result);
  }
}
