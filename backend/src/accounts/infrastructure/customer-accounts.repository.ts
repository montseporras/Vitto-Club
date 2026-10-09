import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { CustomerAccountRepository } from '../domain/port/customer-account.repository.js';
import type { AccountByEmail } from '../domain/port/customer-account.repository.js';

@Injectable()
export class CustomerAccountPrismaRepository implements CustomerAccountRepository {
  // Usa .client de PrismaTransactionRunner (no PrismaService): así participa de la
  // transacción del registro, la misma en la que customers crea el cliente.
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async findByEmail(email: string): Promise<AccountByEmail | null> {
    const record = await this.prisma.account.findFirst({
      where: { email },
      orderBy: [{ isActive: 'desc' }, { id: 'desc' }],
    });
    if (!record) return null;

    return {
      accountId: record.id,
      customerId: record.customerId,
      employeeId: record.employeeId,
      active: record.isActive,
    };
  }

  async create(data: { customerId: number; email: string; passwordHash: string }): Promise<{ accountId: number }> {
    const created = await this.prisma.account.create({
      data: {
        customerId: data.customerId,
        email: data.email,
        passwordHash: data.passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true },
    });
    return { accountId: created.id };
  }

  async deactivate(accountId: number): Promise<void> {
    await this.prisma.account.updateMany({
      where: { id: accountId, customerId: { not: null } },
      data: { isActive: false },
    });
  }
}
