import { Module } from '@nestjs/common';
import { CustomerMissionRepository } from './domain/port/customer-mission.repository.js';
import { MissionRepository } from './domain/port/mission.repository.js';
import { CustomerMissionsPrismaRepository } from './infrastructure/customer-missions.repository.js';
import { MissionsPrismaRepository } from './infrastructure/missions.repository.js';

// BASE-5 (contrato S5 §8.4): esqueleto del módulo `missions` (misiones, asignación, avance, reclamo y
// proceso de fin de mes). Solo tiene los repositorios, sin operaciones: los endpoints, el avance y el
// reclamo los agrega cada historia (US-28 a US-33).
// Dependencias, sin ciclos: `consumptions` va a importar `missions` para el avance (US-30), nunca al
// revés: `missions` recibe { customerId, consumptionId, amount, createdAt }. `missions` usa `points`
// para acreditar (PointsService.acreditarBonificacion); `points` no importa `missions`.
@Module({
  providers: [
    { provide: MissionRepository, useClass: MissionsPrismaRepository },
    { provide: CustomerMissionRepository, useClass: CustomerMissionsPrismaRepository },
  ],
})
export class MissionsModule {}
