import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { AccessTokenIssuer } from './domain/port/access-token-issuer.js';
import { RefreshTokenGenerator } from './domain/port/refresh-token-generator.js';
import { SessionPolicies } from './domain/port/session-policies.js';
import { SessionRepository } from './domain/port/session.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { AuthConfig } from './infrastructure/auth.config.js';
import { CryptoRefreshTokenGenerator } from './infrastructure/crypto-refresh-token-generator.js';
import { JwtAccessTokenIssuer } from './infrastructure/jwt-access-token-issuer.js';
import { SessionPrismaRepository } from './infrastructure/sessions.repository.js';

@Module({
  imports: [
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
  providers: [
    AuthConfig,
    // Vincular cada puerto con su implementación
    { provide: SessionPolicies, useExisting: AuthConfig },
    { provide: SessionRepository, useClass: SessionPrismaRepository },
    { provide: AccessTokenIssuer, useClass: JwtAccessTokenIssuer },
    { provide: RefreshTokenGenerator, useClass: CryptoRefreshTokenGenerator },
    { provide: TransactionRunner, useExisting: PrismaTransactionRunner },
    // Falta CredentialsVerifier: se vincula cuando se integre con accounts.
  ],
})
export class AuthModule {}
