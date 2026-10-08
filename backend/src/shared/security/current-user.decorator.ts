import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUserData } from './current-user-data.js';

// Entrega al controller el usuario autenticado que dejó el guard en el pedido.
// Solo tiene valor en endpoints que no son @Public().
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentUserData => {
  return context.switchToHttp().getRequest<{ user: CurrentUserData }>().user;
});
