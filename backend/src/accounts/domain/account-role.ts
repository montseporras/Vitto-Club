// Tipo de rol propio de accounts. No se importa EmployeeRole desde employees/domain: ahora
// que la integración Employee -> Account es por eventos (ver shared/events/domain-events.ts,
// cuyos payloads ya usan este mismo literal), accounts no necesita ni debe depender del
// dominio interno de employees para esto. Se mapea 1:1 contra el enum AccountRole de Prisma
// en infrastructure/ (que además admite CUSTOMER, fuera del alcance de este dominio).
export const ACCOUNT_ROLES = ['ADMIN', 'CASHIER'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];
