import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { NotificationRepository } from '../domain/port/notification.repository.js';

// BASE-5: implementación de Prisma de NotificationRepository, sin operaciones todavía. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class NotificationsPrismaRepository implements NotificationRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  protected get prisma() {
    return this.transactionRunner.client;
  }
}
