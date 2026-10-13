// Rol tal como lo ve auth. Es su propia definición: no se importa el de accounts ni el de
// employees (ningún módulo importa el domain de otro).
export const AUTH_ROLES = ['ADMIN', 'CASHIER', 'CUSTOMER'] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];
