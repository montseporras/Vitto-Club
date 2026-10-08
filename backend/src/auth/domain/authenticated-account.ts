import type { AuthRole } from './auth-role.js';

// Quién es el usuario autenticado. Es lo que viaja en el access token y lo que reciben los
// demás módulos (por ejemplo auditoría) a través de @CurrentUser().
// Una cuenta de empleado trae employeeId; una de cliente, customerId. Nunca los dos.
export type AuthenticatedAccount = {
  accountId: number;
  role: AuthRole;
  employeeId?: number;
  customerId?: number;
};
