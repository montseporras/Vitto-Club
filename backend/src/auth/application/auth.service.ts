import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedAccount } from '../domain/authenticated-account.js';
import { Session } from '../domain/session.js';
import { AccessTokenIssuer } from '../domain/port/access-token-issuer.js';
import {
  CredentialsVerifier,
  VerifiedAccount,
} from '../domain/port/credentials-verifier.js';
import { RefreshTokenGenerator } from '../domain/port/refresh-token-generator.js';
import { SessionPolicies } from '../domain/port/session-policies.js';
import { SessionRepository } from '../domain/port/session.repository.js';

// Códigos fijos de error: el front decide con esto, no con el texto del mensaje.
export const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';
export const INVALID_SESSION = 'INVALID_SESSION';

export type AuthenticatedUser = AuthenticatedAccount & {
  email: string;
  // Solo si accounts los conoce (hoy, empleados). Nunca van dentro del access token.
  firstName?: string;
  lastName?: string;
};

// Lo que devuelven el login y la renovación: exactamente lo mismo, para que el front
// pueda reconstruir su estado al recargar la página.
export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  // Hasta cuándo puede vivir la sesión como máximo: la capa HTTP la usa para la cookie
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUser;
};

// Un solo mensaje para cualquier fallo de login: no se revela si el email existe, si la
// contraseña está mal o si la cuenta está dada de baja.
function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    error: 'Unauthorized',
    message: 'Los datos de acceso son incorrectos',
    code: INVALID_CREDENTIALS,
  });
}

// Tampoco se dice por qué una sesión no sirve (vencida, revocada, cuenta dada de baja)
function invalidSession(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    error: 'Unauthorized',
    message: 'La sesión no es válida',
    code: INVALID_SESSION,
  });
}

@Injectable()
export class AuthService {
  constructor(
    private readonly credentials: CredentialsVerifier,
    private readonly sessions: SessionRepository,
    private readonly accessTokens: AccessTokenIssuer,
    private readonly refreshTokens: RefreshTokenGenerator,
    private readonly policies: SessionPolicies,
  ) {}

  // --- INICIAR SESIÓN (SCRUM-158 y SCRUM-159): mismo flujo para todos los roles ---
  async login(email: string, password: string): Promise<AuthResult> {
    // 1. accounts decide si las credenciales son válidas
    const verified = await this.credentials.verify(email, password);
    if (!verified) {
      throw invalidCredentials();
    }

    // 2. Los plazos dependen del rol
    const policy = this.policies.forRole(verified.account.role);

    // 3. Nueva sesión: en la base queda solo el hash del refresh token
    const refresh = this.refreshTokens.generate();
    const session = await this.sessions.save(
      Session.start({
        accountId: verified.account.accountId,
        tokenHash: refresh.hash,
        now: new Date(),
        inactivityMs: policy.inactivityMs,
        absoluteMs: policy.absoluteMs,
      }),
    );

    return await this.toResult(verified, refresh.token, session);
  }

  // --- RENOVAR: cambia el refresh token y entrega un access token nuevo ---
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw invalidSession();
    }

    // 1. La sesión se busca por el hash del token recibido
    const previousHash = this.refreshTokens.hash(refreshToken);
    const session = await this.sessions.findByTokenHash(previousHash);
    const now = new Date();
    if (!session || !session.isUsable(now)) {
      throw invalidSession();
    }

    // 2. La cuenta tiene que seguir existiendo y activa. De acá sale el rol actual.
    const verified = await this.credentials.findActiveById(
      session.getAccountId(),
    );
    if (!verified) {
      throw invalidSession();
    }

    // 3. Rotar: token nuevo y vencimiento por inactividad corrido
    const policy = this.policies.forRole(verified.account.role);
    const next = this.refreshTokens.generate();
    session.rotate(next.hash, now, policy.inactivityMs);

    // 4. Se guarda solo si nadie la renovó antes con el mismo token (dos pestañas)
    const rotated = await this.sessions.saveRotation(session, previousHash);
    if (!rotated) {
      throw invalidSession();
    }

    return await this.toResult(verified, next.token, session);
  }

  // --- CERRAR SESIÓN (SCRUM-36): nunca falla ---
  // Sin token, con un token desconocido o con la sesión ya cerrada, termina igual.
  async logout(refreshToken: string | undefined): Promise<number | undefined> {
    if (!refreshToken) return undefined;

    const session = await this.sessions.findByTokenHash(
      this.refreshTokens.hash(refreshToken),
    );
    if (!session || session.getRevokedAt() !== null) return undefined;

    session.revoke(new Date());
    await this.sessions.saveRevocation(session);
    return session.getAccountId();
  }

  // --- Baja de una cuenta: se cierran todas sus sesiones (evento account.deactivated) ---
  async revokeAllSessionsOfAccount(accountId: number): Promise<void> {
    await this.sessions.revokeAllForAccount(accountId, new Date());
  }

  private async toResult(
    verified: VerifiedAccount,
    refreshToken: string,
    session: Session,
  ): Promise<AuthResult> {
    return {
      accessToken: await this.accessTokens.issue(verified.account),
      refreshToken,
      refreshTokenExpiresAt: session.getAbsoluteExpiresAt(),
      user: {
        ...verified.account,
        email: verified.email,
        ...(verified.firstName !== undefined
          ? { firstName: verified.firstName }
          : {}),
        ...(verified.lastName !== undefined
          ? { lastName: verified.lastName }
          : {}),
      },
    };
  }
}
