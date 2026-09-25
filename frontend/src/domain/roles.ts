// Roles de sistema del dominio Vitto Club.
// El valor coincide con el enum del backend (Prisma `EmployeeRole` + Cliente);
// la etiqueta es la que se muestra en pantalla.
export const ROLES = {
  CLIENTE: 'Cliente',
  CASHIER: 'Cajero',
  ADMIN: 'Administrador',
} as const;

export type Rol = keyof typeof ROLES;

// Un empleado sólo puede ser Cajero o Administrador (RF-01).
// El primer Administrador se crea por semilla; el resto los da de alta un Admin.
export const ROLES_EMPLEADO = {
  CASHIER: ROLES.CASHIER,
  ADMIN: ROLES.ADMIN,
} as const;

export type RolEmpleado = keyof typeof ROLES_EMPLEADO;
