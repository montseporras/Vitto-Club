import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { MissionRepository } from '../domain/port/mission.repository.js';

// BASE-5: implementación de Prisma de MissionRepository, sin operaciones todavía. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class MissionsPrismaRepository implements MissionRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  protected get prisma() {
    return this.transactionRunner.client;
  }
}
