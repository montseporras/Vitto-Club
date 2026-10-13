import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { PrismaService } from './prisma.service.js';

// Transacción ambiente: lo que se ejecuta dentro de run() comparte una sola transacción, aunque
// pase por repositorios de módulos distintos, sin recibir el cliente por parámetro.
// Es el único lugar (junto con app.module.ts) que conoce @nestjs-cls/transactional:
// - application/ la usa a través de un puerto de su propio módulo (abstract class con run()).
// - infrastructure/ inyecta esta clase y usa `client` en lugar de PrismaService.
@Injectable()
export class PrismaTransactionRunner {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<PrismaService>>,
  ) {}

  // Si fn termina se hace commit; si tira, rollback. Anidado se suma a la transacción en curso.
  run<T>(fn: () => Promise<T>): Promise<T> {
    return this.txHost.withTransaction(fn);
  }

  // El cliente de la transacción en curso, o el cliente normal si no hay ninguna.
  get client() {
    return this.txHost.tx;
  }
}
