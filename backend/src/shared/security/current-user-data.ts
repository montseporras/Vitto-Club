// Roles del sistema, tal como los ven los controllers de cualquier módulo
export const USER_ROLES = ['ADMIN', 'CASHIER', 'CUSTOMER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Quién hace el pedido. Lo deja el guard de autenticación y se lee con @CurrentUser().
// Una cuenta de empleado trae employeeId; una de cliente, customerId.
export type CurrentUserData = {
  accountId: number;
  role: UserRole;
  employeeId?: number;
  customerId?: number;
};
