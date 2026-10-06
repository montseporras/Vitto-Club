import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
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
import { AuthConfig } from './infrastructure/auth.config.js';
import { CryptoRefreshTokenGenerator } from './infrastructure/crypto-refresh-token-generator.js';
import { JwtAccessTokenIssuer } from './infrastructure/jwt-access-token-issuer.js';
import { SessionPrismaRepository } from './infrastructure/sessions.repository.js';
import { UnavailableCredentialsVerifier } from './infrastructure/unavailable-credentials-verifier.js';

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
  controllers: [AuthController],
  providers: [
    AuthConfig,
    // Vincular cada puerto con su implementación
    { provide: SessionPolicies, useExisting: AuthConfig },
    { provide: SessionRepository, useClass: SessionPrismaRepository },
    { provide: AccessTokenIssuer, useClass: JwtAccessTokenIssuer },
    { provide: RefreshTokenGenerator, useClass: CryptoRefreshTokenGenerator },
    { provide: TransactionRunner, useExisting: PrismaTransactionRunner },
    // PROVISORIO: rechaza todo. Se cambia por el adaptador hacia accounts en la integración.
    { provide: CredentialsVerifier, useClass: UnavailableCredentialsVerifier },
    AuthService,
    AccountDeactivatedListener,
    // Todavía no se registran para toda la aplicación (APP_GUARD): eso es parte de la
    // integración, junto con los roles de cada endpoint.
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
