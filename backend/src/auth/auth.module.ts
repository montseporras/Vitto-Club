import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccountsModule } from '../accounts/accounts.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { AuthService } from './application/auth.service.js';
import { AccessTokenIssuer } from './domain/port/access-token-issuer.js';
import { CredentialsVerifier } from './domain/port/credentials-verifier.js';
import { RefreshTokenGenerator } from './domain/port/refresh-token-generator.js';
import { SessionPolicies } from './domain/port/session-policies.js';
import { SessionRepository } from './domain/port/session.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { AuthController } from './http/auth.controller.js';
import { JwtAuthGuard } from './http/guards/jwt-auth.guard.js';
import { RolesGuard } from './http/guards/roles.guard.js';
import { AccountDeactivatedListener } from './infrastructure/account-deactivated.listener.js';
import { AccountsCredentialsVerifier } from './infrastructure/accounts-credentials-verifier.js';
import { AuthConfig } from './infrastructure/auth.config.js';
import { CryptoRefreshTokenGenerator } from './infrastructure/crypto-refresh-token-generator.js';
import { JwtAccessTokenIssuer } from './infrastructure/jwt-access-token-issuer.js';
import { SessionPrismaRepository } from './infrastructure/sessions.repository.js';
import { AuditModule } from '../audit/audit.module.js';

// auth depende de accounts (para preguntar "¿estas credenciales son válidas?") y nunca al
// revés: accounts no importa nada de auth.
@Module({
  imports: [
    AccountsModule,
    AuditModule,
    // El secreto, el algoritmo y la duración del access token se fijan acá, una sola vez.
    // Se declara HS256 al firmar y al verificar para no aceptar tokens con otro algoritmo.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = new AuthConfig(configService);
        return {
          secret: config.jwtSecret,
          signOptions: { expiresIn: config.accessTokenTtlSeconds, algorithm: 'HS256' as const },
          verifyOptions: { algorithms: ['HS256' as const] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthConfig,
    // Vincular cada puerto con su implementación
    { provide: SessionPolicies, useExisting: AuthConfig },
    { provide: SessionRepository, useClass: SessionPrismaRepository },
    { provide: AccessTokenIssuer, useClass: JwtAccessTokenIssuer },
    { provide: RefreshTokenGenerator, useClass: CryptoRefreshTokenGenerator },
    { provide: TransactionRunner, useExisting: PrismaTransactionRunner },
    { provide: CredentialsVerifier, useClass: AccountsCredentialsVerifier },
    AuthService,
    AccountDeactivatedListener,
    // Guards para TODA la aplicación, en este orden: primero quién sos (JwtAuthGuard), después
    // si podés hacerlo (RolesGuard). Un endpoint sin @Public() ni @Roles() queda cerrado para
    // todos. Las marcas las declaran los controllers de cada módulo (src/shared/security).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
