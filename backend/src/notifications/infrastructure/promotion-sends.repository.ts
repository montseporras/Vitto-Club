import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { PromotionSendRepository } from '../domain/port/promotion-send.repository.js';

// BASE-5: implementación de Prisma de PromotionSendRepository, sin operaciones todavía. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class PromotionSendsPrismaRepository implements PromotionSendRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  protected get prisma() {
    return this.transactionRunner.client;
  }
}
