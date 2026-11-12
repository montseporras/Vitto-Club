import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { NotificationConfigRepository } from '../domain/port/notification-config.repository.js';

// BASE-5: implementación de Prisma de NotificationConfigRepository, sin operaciones todavía. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class NotificationConfigPrismaRepository implements NotificationConfigRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  protected get prisma() {
    return this.transactionRunner.client;
  }
}
