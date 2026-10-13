import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: {
    role?: string;
  };
};

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Authentication is required');
    }
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('Administrator role is required');
    }
    return true;
  }
}
