import { Injectable } from '@nestjs/common';
import type { Account as PrismaAccountRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { AccountCredentialsRepository } from '../domain/port/account-credentials.repository.js';
import type { AccountCredentials } from '../domain/port/account-credentials.repository.js';

function toCredentials(record: PrismaAccountRecord): AccountCredentials {
  return {
    accountId: record.id,
    email: record.email,
    passwordHash: record.passwordHash,
    role: record.role,
    customerId: record.customerId,
  };
}

// Usa .client de PrismaTransactionRunner: participa de la transacción del caso de uso.
@Injectable()
export class AccountCredentialsPrismaRepository implements AccountCredentialsRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async findActiveById(accountId: number): Promise<AccountCredentials | null> {
    const record = await this.prisma.account.findFirst({ where: { id: accountId, isActive: true } });
    return record ? toCredentials(record) : null;
  }

  async findActiveByCustomerId(customerId: number): Promise<AccountCredentials | null> {
    const record = await this.prisma.account.findFirst({ where: { customerId, isActive: true } });
    return record ? toCredentials(record) : null;
  }

  async updatePassword(accountId: number, passwordHash: string): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { passwordHash, mustChangePassword: false },
    });
  }

  async existsActiveByEmail(email: string, excludeAccountId: number): Promise<boolean> {
    const match = await this.prisma.account.findFirst({
      where: { email, isActive: true, id: { not: excludeAccountId } },
      select: { id: true },
    });
    return match !== null;
  }
}
