import { Injectable } from '@nestjs/common';
import type { Session as PrismaSessionRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Session } from '../domain/session.js';
import { SessionRepository } from '../domain/port/session.repository.js';

function toDomain(record: PrismaSessionRecord): Session {
  return Session.reconstruct({
    id: record.id,
    accountId: record.accountId,
    tokenHash: record.tokenHash,
    expiresAt: record.expiresAt,
    absoluteExpiresAt: record.absoluteExpiresAt,
    revokedAt: record.revokedAt,
    createdAt: record.createdAt,
  });
}

function requiredId(session: Session): number {
  const id = session.getId();
  if (id === null) {
    throw new Error('Session id is required: the session has not been saved yet');
  }
  return id;
}

// Usa `client` de PrismaTransactionRunner y no PrismaService: así participa de la
// transacción del caso de uso cuando hay una, y escribe directo cuando no.
@Injectable()
export class SessionPrismaRepository implements SessionRepository {
  constructor(private readonly tx: PrismaTransactionRunner) {}

  async save(session: Session): Promise<Session> {
    const created = await this.tx.client.session.create({
      data: {
        accountId: session.getAccountId(),
        tokenHash: session.getTokenHash(),
        expiresAt: session.getExpiresAt(),
        absoluteExpiresAt: session.getAbsoluteExpiresAt(),
        revokedAt: session.getRevokedAt(),
        createdAt: session.getCreatedAt(),
      },
    });
    return toDomain(created);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const record = await this.tx.client.session.findUnique({ where: { tokenHash } });
    return record ? toDomain(record) : null;
  }

  // El WHERE incluye el token anterior: si otro pedido ya renovó esta sesión, no coincide
  // ninguna fila y se devuelve false. La base garantiza que solo uno de los dos gane.
  async saveRotation(session: Session, previousTokenHash: string): Promise<boolean> {
    const result = await this.tx.client.session.updateMany({
      where: { id: requiredId(session), tokenHash: previousTokenHash, revokedAt: null },
      data: { tokenHash: session.getTokenHash(), expiresAt: session.getExpiresAt() },
    });
    return result.count === 1;
  }

  // Solo escribe si todavía no estaba revocada: conserva la primera fecha
  async saveRevocation(session: Session): Promise<void> {
    await this.tx.client.session.updateMany({
      where: { id: requiredId(session), revokedAt: null },
      data: { revokedAt: session.getRevokedAt() },
    });
  }

  async revokeAllForAccount(accountId: number, now: Date): Promise<void> {
    await this.tx.client.session.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
