import { Injectable } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { PointsService, PointsSummary } from '../../points/application/points.service.js';

// US-46 / US-19 (§3.4.1 y §3.10.1): puntos, nivel y vencimientos de un cliente.
// Primero confirma que el cliente existe (404 si no); el cálculo es de PointsService (BASE).
// Un cliente inactivo también se consulta: los inactivos son de solo lectura (§8.2).
@Injectable()
export class CustomerPointsService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly pointsService: PointsService,
  ) {}

  async getSummary(customerId: number): Promise<PointsSummary> {
    await this.customersService.findById(customerId);
    return await this.pointsService.resumen(customerId);
  }
}
