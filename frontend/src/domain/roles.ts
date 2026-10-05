// Roles de sistema del dominio Vitto Club.
// El valor coincide con el enum del backend (Prisma `EmployeeRole` + Cliente);
// la etiqueta es la que se muestra en pantalla.
export const ROLES = {
  CUSTOMER: 'Cliente',
  CASHIER: 'Cajero',
  ADMIN: 'Administrador',
} as const;

export type Role = keyof typeof ROLES;

// Un empleado sólo puede ser Cajero o Administrador (RF-01).
// El primer Administrador se crea por semilla; el resto los da de alta un Admin.
export const EMPLOYEE_ROLES = {
  CASHIER: ROLES.CASHIER,
  ADMIN: ROLES.ADMIN,
} as const;

export type EmployeeRole = keyof typeof EMPLOYEE_ROLES;
