import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../shared/security/public.decorator.js';
import { ROLES_KEY } from '../../../shared/security/roles.decorator.js';
import type { CurrentUserData, UserRole } from '../../../shared/security/current-user-data.js';

export const FORBIDDEN = 'FORBIDDEN';

// AUTORIZACIÓN: comprueba si el rol del usuario puede usar el endpoint. Corre después de
// JwtAuthGuard. Un endpoint sin @Roles() ni @Public() queda cerrado para todos: si alguien
// se olvida de declararlo, falla cerrado y no abierto.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const allowed = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, targets);
    const user = context.switchToHttp().getRequest<{ user?: CurrentUserData }>().user;

    if (!allowed || !user || !allowed.includes(user.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You do not have permission to perform this operation',
        code: FORBIDDEN,
      });
    }

    return true;
  }
}
