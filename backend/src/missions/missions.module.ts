import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { MissionsService } from './application/missions.service.js';
import { CustomerMissionRepository } from './domain/port/customer-mission.repository.js';
import { MissionRepository } from './domain/port/mission.repository.js';
import { MissionsController } from './http/missions.controller.js';
import { CustomerMissionsPrismaRepository } from './infrastructure/customer-missions.repository.js';
import { MissionsPrismaRepository } from './infrastructure/missions.repository.js';

// BASE-5 (contrato S5 §8.4): módulo `missions` (misiones, asignación, avance, reclamo y proceso de
// fin de mes). Cada historia agrega sus operaciones (US-28 a US-33).
// US-28: GET y POST /misiones. La auditoría (MISSION_CREATED) usa AuditModule, que no importa
// ningún módulo de negocio, así que no se arma un ciclo.
// Dependencias, sin ciclos: `consumptions` va a importar `missions` para el avance (US-30), nunca al
// revés: `missions` recibe { customerId, consumptionId, amount, createdAt }. `missions` usa `points`
// para acreditar (PointsService.acreditarBonificacion); `points` no importa `missions`.
@Module({
  imports: [AuditModule],
  controllers: [MissionsController],
  providers: [
    MissionsService,
    { provide: MissionRepository, useClass: MissionsPrismaRepository },
    { provide: CustomerMissionRepository, useClass: CustomerMissionsPrismaRepository },
  ],
})
export class MissionsModule {}
