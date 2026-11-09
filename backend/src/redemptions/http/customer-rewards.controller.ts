import { Controller, ForbiddenException, Get, Query, UseFilters } from '@nestjs/common';
import { PointsService } from '../../points/application/points.service.js';
import { RewardsService } from '../../rewards/application/rewards.service.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { CatalogQueryDto } from './dto/catalog-query.dto.js';
import { RedemptionsExceptionFilter } from './filters/redemptions-exception.filter.js';

// US-39 (§3.5.1 y matriz de §4): el catálogo del Cliente. Va en redemptions (decisión de Jazmín)
// porque necesita las recompensas y el saldo, y redemptions es el módulo que ya puede usar
// RewardsService y PointsService (§8.4): rewards no importa points. Prefijo completo, como
// CustomerRedemptionsController: no choca con /customers/:id.
@Controller('customers/me/recompensas')
@Roles('CUSTOMER')
@UseFilters(RedemptionsExceptionFilter)
export class CustomerRewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly pointsService: PointsService,
  ) {}

  // GET /api/customers/me/recompensas -> CA-39.1, CA-39.2 y CA-39.7. Sin paginado. balance es el
  // mismo saldo de GET /customers/me/puntos (PointsService.resumen), para que la pantalla decida si
  // puede canjear (S4-2).
  @Get()
  async catalog(@Query() query: CatalogQueryDto, @CurrentUser() user: CurrentUserData) {
    const customerId = this.customerIdOf(user);
    const [items, summary] = await Promise.all([
      this.rewardsService.catalog(query.filter),
      this.pointsService.resumen(customerId),
    ]);
    return { balance: summary.balance, items };
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
