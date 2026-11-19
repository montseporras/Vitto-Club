import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseFilters } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import {
  missionCreatedEntry,
  missionDeletedEntry,
  missionUpdatedEntry,
} from '../../audit/domain/audit-entries.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { currentArgentinaMonth, MissionsService } from '../application/missions.service.js';
import { CompletedQueryDto } from './dto/completed-query.dto.js';
import { CreateMissionDto } from './dto/create-mission.dto.js';
import { ListMissionsQueryDto } from './dto/list-missions-query.dto.js';
import { CompletedCustomerMissionResponseDto, MissionResponseDto } from './dto/mission-response.dto.js';
import { UpdateMissionDto } from './dto/update-mission.dto.js';
import { MissionsExceptionFilter } from './filters/missions-exception.filter.js';

// §3.1 y matriz de §4: /misiones y todas sus rutas son solo del Administrador (CA-28.8, CA-29.7)
@Controller('misiones')
@Roles('ADMIN')
@UseFilters(MissionsExceptionFilter)
export class MissionsController {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly auditService: AuditService,
  ) {}

  // GET /api/misiones -> CA-28.1
  @Get()
  async list(@Query() query: ListMissionsQueryDto) {
    const now = new Date();
    const result = await this.missionsService.list(
      { q: query.q, phase: query.phase, order: query.order, page: query.page, limit: query.limit },
      now,
    );
    const currentMonth = currentArgentinaMonth(now);
    return {
      items: result.items.map(({ mission, completedCount }) =>
        MissionResponseDto.fromDomain(mission, completedCount, currentMonth),
      ),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }

  // POST /api/misiones -> CA-28.2 a CA-28.7. El alta y la auditoría MISSION_CREATED van en la
  // misma transacción.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMissionDto, @CurrentUser() user: CurrentUserData) {
    const now = new Date();
    const mission = await this.auditService.capture(
      () =>
        this.missionsService.create(
          {
            name: dto.name,
            description: dto.description,
            objectiveType: dto.objectiveType,
            target: dto.target,
            daysOfWeek: dto.daysOfWeek,
            timeFrom: dto.timeFrom,
            timeTo: dto.timeTo,
            rewardPoints: dto.rewardPoints,
            startMonth: dto.startMonth,
            endMonth: dto.endMonth,
          },
          now,
        ),
      (created) =>
        missionCreatedEntry(actorOf(user), {
          name: created.name,
          objectiveType: created.objectiveType,
          target: created.target,
          daysOfWeek: created.daysOfWeek,
          timeFrom: created.timeFrom,
          timeTo: created.timeTo,
          rewardPoints: created.rewardPoints,
          startMonth: created.startMonth,
          endMonth: created.endMonth,
        }),
    );
    // Recién creada: nadie la completó todavía
    return MissionResponseDto.fromDomain(mission, 0, currentArgentinaMonth(now));
  }

  // GET /api/misiones/:id/completadas -> CA-29.0 (§3.1.7). Solo lectura, no se audita.
  @Get(':id/completadas')
  async completed(@Param('id', ParseIntPipe) id: number, @Query() query: CompletedQueryDto) {
    const completed = await this.missionsService.completed(id, query.period);
    return completed.map((item) => CompletedCustomerMissionResponseDto.fromDomain(item));
  }

  // GET /api/misiones/:id -> CA-29.0 y CA-29.6 (§3.1.6). 404 si no existe o está dada de baja.
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const now = new Date();
    const { mission, completedCount } = await this.missionsService.getById(id, now);
    return MissionResponseDto.fromDomain(mission, completedCount, currentArgentinaMonth(now));
  }

  // PATCH /api/misiones/:id -> CA-29.1 a CA-29.3, CA-29.5 y CA-29.6 (§3.1.4). El cambio y
  // MISSION_UPDATED van en la misma transacción; sin cambios no se audita.
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMissionDto, @CurrentUser() user: CurrentUserData) {
    const now = new Date();
    const result = await this.auditService.capture(
      () =>
        this.missionsService.update(
          id,
          {
            name: dto.name,
            description: dto.description,
            objectiveType: dto.objectiveType,
            target: dto.target,
            daysOfWeek: dto.daysOfWeek,
            timeFrom: dto.timeFrom,
            timeTo: dto.timeTo,
            rewardPoints: dto.rewardPoints,
            startMonth: dto.startMonth,
            endMonth: dto.endMonth,
          },
          now,
        ),
      ({ plan }) =>
        plan.changed ? missionUpdatedEntry(actorOf(user), plan.auditBefore, plan.auditAfter, plan.appliesFrom) : null,
    );
    return {
      mission: MissionResponseDto.fromDomain(result.mission, result.completedCount, currentArgentinaMonth(now)),
      appliesFrom: result.plan.appliesFrom,
    };
  }

  // PATCH /api/misiones/:id/eliminar -> CA-29.4 a CA-29.6 (§3.1.5). Sin body. En una sola transacción:
  // las En progreso del mes vencen, las Completadas con recompensa se reclaman solas (cada una con su
  // MISSION_REWARD_CLAIMED), la misión pasa a DELETED y se audita MISSION_DELETED.
  @Patch(':id/eliminar')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserData) {
    const result = await this.auditService.capture(
      () => this.missionsService.delete(id),
      (deleted) => missionDeletedEntry(actorOf(user), deleted.mission.name, deleted.expired, deleted.claimed),
    );
    return { expired: result.expired, claimed: result.claimed };
  }
}
