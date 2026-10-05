import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionRevoker } from '../domain/port/session-revoker.js';

@Injectable()
export class PrismaSessionRevoker implements SessionRevoker {
  constructor(private readonly prisma: PrismaService) {}

  // Revoca todas las sesiones activas (revokedAt IS NULL) de la cuenta, marcando revokedAt.
  // No implementa el endpoint de refresh ni JWT: solo el efecto de la baja sobre Session,
  // usando el modelo ya existente tal cual está.
  async revokeAllForAccount(accountId: number): Promise<void> {
    await this.prisma.session.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
