import { SetMetadata } from '@nestjs/common';
import type { UserRole } from './current-user-data.js';

export const ROLES_KEY = 'roles';

// Declara qué roles pueden usar un endpoint (o un controller entero).
// Un endpoint sin @Roles() ni @Public() queda cerrado para todos.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
