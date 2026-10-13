import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard.js';

describe('AdminRoleGuard', () => {
  const guard = new AdminRoleGuard();

  function contextFor(user?: { role?: string }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  it('rejects requests without an authenticated principal', () => {
    expect(() => guard.canActivate(contextFor())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects authenticated non-administrators', () => {
    expect(() => guard.canActivate(contextFor({ role: 'CASHIER' }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows an authenticated administrator', () => {
    expect(guard.canActivate(contextFor({ role: 'ADMIN' }))).toBe(true);
  });
});
