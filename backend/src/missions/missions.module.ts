import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { PointsModule } from '../points/points.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { MissionsClaimService } from './application/missions-claim.service.js';
import { MissionsProgressService } from './application/missions-progress.service.js';
import { MissionsService } from './application/missions.service.js';
import { CustomerMissionRepository } from './domain/port/customer-mission.repository.js';
import { MissionRepository } from './domain/port/mission.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { CustomerMissionsController } from './http/customer-missions.controller.js';
import { MissionsController } from './http/missions.controller.js';
import { CustomerMissionsPrismaRepository } from './infrastructure/customer-missions.repository.js';
import { MissionsPrismaRepository } from './infrastructure/missions.repository.js';

// BASE-5 (contrato S5 §8.4): módulo `missions` (misiones, asignación, avance, reclamo y proceso de
// fin de mes). Cada historia agrega sus operaciones (US-28 a US-33).
// US-28: GET y POST /misiones. La auditoría (MISSION_CREATED) usa AuditModule, que no importa
// ningún módulo de negocio, así que no se arma un ciclo.
// US-30: MissionsProgressService (asignación y avance) se exporta para consumptions, que lo llama
// dentro de la transacción de POST /consumos y de la anulación.
// US-31: el reclamo (MissionsClaimService) acredita con PointsService (missions ──> points; points no
// importa missions). Lo usan el Cliente, la baja de la misión (US-29) y el fin de mes (US-32).
// Dependencias, sin ciclos: `consumptions` va a importar `missions` para el avance (US-30), nunca al
// revés: `missions` recibe { customerId, consumptionId, amount, createdAt }. `missions` usa `points`
// para acreditar (PointsService.acreditarBonificacion); `points` no importa `missions`.
@Module({
  imports: [AuditModule, PointsModule],
  controllers: [MissionsController, CustomerMissionsController],
  providers: [
    MissionsService,
    MissionsProgressService,
    MissionsClaimService,
    { provide: MissionRepository, useClass: MissionsPrismaRepository },
    { provide: CustomerMissionRepository, useClass: CustomerMissionsPrismaRepository },
    { provide: TransactionRunner, useExisting: PrismaTransactionRunner },
  ],
  exports: [MissionsProgressService],
})
export class MissionsModule {}
