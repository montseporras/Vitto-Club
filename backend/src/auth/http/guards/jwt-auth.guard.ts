import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../shared/security/public.decorator.js';
import type { CurrentUserData } from '../../../shared/security/current-user-data.js';
import { AccessTokenIssuer } from '../../domain/port/access-token-issuer.js';

export const UNAUTHENTICATED = 'UNAUTHENTICATED';

// El access token viaja en el encabezado: "Authorization: Bearer <token>"
function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

// AUTENTICACIÓN: comprueba quién hace el pedido. Si el endpoint no es público, exige un
// access token válido y deja al usuario en el pedido para @CurrentUser() y RolesGuard.
// No consulta la base: alcanza con verificar la firma del token.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenIssuer,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: CurrentUserData }>();

    const token = bearerToken(request.headers.authorization);
    const account = token ? await this.accessTokens.verify(token) : null;
    if (!account) {
      // Sin token, vencido o inválido: misma respuesta. El front renueva y reintenta.
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
        code: UNAUTHENTICATED,
      });
    }

    request.user = account;
    return true;
  }
}
