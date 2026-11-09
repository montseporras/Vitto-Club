import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseFilters } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import { rewardCreatedEntry } from '../../audit/domain/audit-entries.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { RewardsService } from '../application/rewards.service.js';
import { CreateRewardDto } from './dto/create-reward.dto.js';
import { ListRewardsQueryDto } from './dto/list-rewards-query.dto.js';
import { RewardResponseDto } from './dto/reward-response.dto.js';
import { RewardsExceptionFilter } from './filters/rewards-exception.filter.js';

// §3.2 y matriz de §4: /recompensas es del Administrador (CA-34.8); /disponibles (US-40) es de
// Administrador y Cajero, y va declarada ANTES de cualquier /:id futuro.
@Controller('recompensas')
@Roles('ADMIN')
@UseFilters(RewardsExceptionFilter)
export class RewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly auditService: AuditService,
  ) {}

  // GET /api/recompensas/disponibles -> US-40, §3.5.2. Administrador y Cajero (matriz §4): para el
  // bloque "Recompensas a las que puede acceder" del panel del cliente en Caja.
  @Get('disponibles')
  @Roles('ADMIN', 'CASHIER')
  async findAvailable() {
    const now = new Date();
    const today = toArgentinaDateString(now);
    const rewards = await this.rewardsService.findAvailable(now);
    return rewards.map((reward) => RewardResponseDto.fromDomain(reward, 0, today));
  }

  // GET /api/recompensas -> CA-34.1
  @Get()
  async list(@Query() query: ListRewardsQueryDto) {
    const now = new Date();
    const result = await this.rewardsService.list(
      { q: query.q, status: query.status, page: query.page, limit: query.limit },
      now,
    );
    const today = toArgentinaDateString(now);
    return {
      items: result.items.map(({ reward, confirmedCount }) =>
        RewardResponseDto.fromDomain(reward, confirmedCount, today),
      ),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }

  // POST /api/recompensas -> CA-34.2 a CA-34.7. El alta y la auditoría REWARD_CREATED van en la
  // misma transacción.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRewardDto, @CurrentUser() user: CurrentUserData) {
    const now = new Date();
    const reward = await this.auditService.capture(
      () =>
        this.rewardsService.create(
          {
            name: dto.name,
            description: dto.description,
            points: dto.points,
            stock: dto.stock,
            expiresAt: dto.expiresAt,
          },
          now,
        ),
      (created) =>
        rewardCreatedEntry(actorOf(user), {
          name: created.getName(),
          points: created.getPoints(),
          stock: created.getStock(),
          expiresAt: created.getExpiresAt(),
        }),
    );
    // Recién creada: todavía no tiene canjes
    return RewardResponseDto.fromDomain(reward, 0, toArgentinaDateString(now));
  }
}
