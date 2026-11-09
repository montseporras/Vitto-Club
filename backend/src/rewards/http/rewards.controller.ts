import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseFilters } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import {
  rewardActivatedEntry,
  rewardCreatedEntry,
  rewardDeactivatedEntry,
  rewardDeletedEntry,
} from '../../audit/domain/audit-entries.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { RewardsService } from '../application/rewards.service.js';
import { CreateRewardDto } from './dto/create-reward.dto.js';
import { ListRewardsQueryDto } from './dto/list-rewards-query.dto.js';
import { UpdateRewardDto } from './dto/update-reward.dto.js';
import { RewardResponseDto, type AvailableRewardResponse } from './dto/reward-response.dto.js';
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
  async findAvailable(): Promise<AvailableRewardResponse[]> {
    const now = new Date();
    const today = toArgentinaDateString(now);
    const rewards = await this.rewardsService.findAvailable(now);
    return rewards.map((reward) => RewardResponseDto.availableFromDomain(reward, today));
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

  // GET /api/recompensas/:id -> CA-35.10. 404 si no existe o está dada de baja.
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const now = new Date();
    const { reward, confirmedCount } = await this.rewardsService.getById(id, now);
    return RewardResponseDto.fromDomain(reward, confirmedCount, toArgentinaDateString(now));
  }

  // PATCH /api/recompensas/:id -> CA-35.1 a CA-35.8 y CA-35.10. La transacción y la auditoría las
  // maneja el servicio: REWARD_UPDATED tiene que quedar antes de que US-37 audite REWARD_ENABLED o
  // REWARD_DISABLED.
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRewardDto, @CurrentUser() user: CurrentUserData) {
    const now = new Date();
    const result = await this.rewardsService.update(
      id,
      {
        name: dto.name,
        description: dto.description,
        points: dto.points,
        stock: dto.stock,
        expiresAt: dto.expiresAt,
      },
      actorOf(user),
      now,
    );
    return {
      reward: RewardResponseDto.fromDomain(result.reward, result.confirmedCount, toArgentinaDateString(now)),
      availabilityChange: result.availabilityChange,
    };
  }

  // PATCH /api/recompensas/:id/activar -> CA-36.4 a CA-36.6. Sin body. El cambio y REWARD_ACTIVATED
  // van en la misma transacción.
  @Patch(':id/activar')
  async activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    const now = new Date();
    const result = await this.auditService.capture(
      () => this.rewardsService.activate(id, now),
      (activated) => rewardActivatedEntry(actorOf(user), activated.reward.getName(), activated.reward.getStatus()),
    );
    return { reward: RewardResponseDto.fromDomain(result.reward, result.confirmedCount, toArgentinaDateString(now)) };
  }

  // PATCH /api/recompensas/:id/desactivar -> CA-36.1 a CA-36.3 y CA-36.6. Sin body. En una sola
  // transacción: el cambio, el rechazo de los canjes confirmados con sus REDEMPTION_REJECTED (Sistema,
  // los escribe redemptions al escuchar reward.deactivated) y, al final, REWARD_DEACTIVATED.
  @Patch(':id/desactivar')
  async deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    const now = new Date();
    const result = await this.auditService.capture(
      () => this.rewardsService.deactivate(id, now),
      (deactivated) =>
        rewardDeactivatedEntry(
          actorOf(user),
          deactivated.reward.getName(),
          deactivated.previousStatus,
          deactivated.rejectedRedemptions,
        ),
    );
    return {
      reward: RewardResponseDto.fromDomain(result.reward, result.confirmedCount, toArgentinaDateString(now)),
      rejectedRedemptions: result.rejectedRedemptions,
    };
  }

  // PATCH /api/recompensas/:id/eliminar -> CA-38.1 a CA-38.3 y CA-38.7. Sin body. Igual que
  // desactivar: en una sola transacción, la baja, el rechazo de los canjes confirmados con sus
  // REDEMPTION_REJECTED (Sistema, los escribe redemptions al escuchar reward.deleted) y, al final,
  // REWARD_DELETED. La respuesta es solo { rejectedRedemptions } (§3.2.7).
  @Patch(':id/eliminar')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    const result = await this.auditService.capture(
      () => this.rewardsService.delete(id),
      (deleted) =>
        rewardDeletedEntry(actorOf(user), deleted.reward.getName(), deleted.previousStatus, deleted.rejectedRedemptions),
    );
    return { rejectedRedemptions: result.rejectedRedemptions };
  }
}
