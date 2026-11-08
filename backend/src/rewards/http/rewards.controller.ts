import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../shared/security/roles.decorator.js';
import { RewardsService } from '../application/rewards.service.js';
import { toRewardResponse, type RewardResponse } from './dto/reward-response.dto.js';

// Recompensas (contrato S4 §3.2 y §3.5.2). US-40 agrega GET /recompensas/disponibles; el resto
// (listado del Administrador, detalle, crear, editar...) lo agregan US-34 a US-38.
// IMPORTANTE para quien agregue GET /recompensas/:id: tiene que declararse DESPUÉS de
// 'disponibles', si no Nest toma la palabra como un id y responde 400 (contrato S4 §4).
@Controller('recompensas')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  // GET /api/recompensas/disponibles -> US-40, §3.5.2. Administrador y Cajero (matriz §4): para el
  // bloque "Recompensas a las que puede acceder" del panel del cliente en Caja. Solo las
  // disponibles, por puntos ascendentes. El filtro por saldo lo hace la pantalla (decisión S4-2).
  @Get('disponibles')
  @Roles('ADMIN', 'CASHIER')
  async findAvailable(): Promise<RewardResponse[]> {
    const now = new Date();
    const rewards = await this.rewardsService.findAvailable(now);
    return rewards.map((reward) => toRewardResponse(reward, now));
  }
}
