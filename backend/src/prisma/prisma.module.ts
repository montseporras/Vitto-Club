import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { PrismaTransactionRunner } from './prisma-transaction-runner.js';

@Global()
@Module({
  providers: [PrismaService, PrismaTransactionRunner],
  exports: [PrismaService, PrismaTransactionRunner],
})
export class PrismaModule {}
