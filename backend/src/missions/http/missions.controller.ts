import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseFilters } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { actorOf } from '../../audit/domain/audit-entry.js';
import { missionCreatedEntry } from '../../audit/domain/audit-entries.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { currentArgentinaMonth, MissionsService } from '../application/missions.service.js';
import { CreateMissionDto } from './dto/create-mission.dto.js';
import { ListMissionsQueryDto } from './dto/list-missions-query.dto.js';
import { MissionResponseDto } from './dto/mission-response.dto.js';
import { MissionsExceptionFilter } from './filters/missions-exception.filter.js';

// §3.1 y matriz de §4: /misiones es solo del Administrador (CA-28.8). US-29 agrega /:id,
// …/completadas y …/eliminar a este controller.
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
}
