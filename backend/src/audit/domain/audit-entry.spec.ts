import { AUDIT_ACTIONS_BY_MODULE, actorOf, assertValidAuditEntry, type AuditEntryInput } from './audit-entry.js';
import { InvalidAuditEntryError } from './errors/invalid-audit-entry.error.js';

const validEntry = (overrides: Partial<AuditEntryInput> = {}): AuditEntryInput => ({
  actor: { type: 'EMPLOYEE', accountId: 1 },
  module: 'EMPLOYEES',
  action: 'EMPLOYEE_CREATED',
  description: 'Registró al empleado Jorge Molina',
  details: [],
  ...overrides,
});

describe('actorOf()', () => {
  it('el Administrador y el Cajero figuran como empleado con su accountId', () => {
    expect(actorOf({ accountId: 9, role: 'CASHIER', employeeId: 3 })).toEqual({
      type: 'EMPLOYEE',
      accountId: 9,
    });
    expect(actorOf({ accountId: 1, role: 'ADMIN', employeeId: 1 })).toEqual({
      type: 'EMPLOYEE',
      accountId: 1,
    });
  });

  it('un cliente nunca puede ser el actor (CA-57.4)', () => {
    expect(() => actorOf({ accountId: 5, role: 'CUSTOMER', customerId: 5 })).toThrow(
      InvalidAuditEntryError,
    );
  });
});

describe('assertValidAuditEntry()', () => {
  it('acepta una entrada completa, también del Sistema', () => {
    expect(() => assertValidAuditEntry(validEntry())).not.toThrow();
    expect(() => assertValidAuditEntry(validEntry({ actor: { type: 'SYSTEM' } }))).not.toThrow();
  });

  it.each([
    ['sin actor', { actor: undefined }],
    ['sin módulo', { module: undefined }],
    ['sin acción', { action: undefined }],
    ['sin descripción', { description: '' }],
    ['con descripción en blanco', { description: '   ' }],
    ['con descripción de más de 300 caracteres', { description: 'a'.repeat(301) }],
    ['con actor empleado sin accountId', { actor: { type: 'EMPLOYEE' } }],
  ])('rechaza una entrada %s (CA-57.9)', (_name, overrides) => {
    expect(() => assertValidAuditEntry(validEntry(overrides as unknown as Partial<AuditEntryInput>))).toThrow(
      InvalidAuditEntryError,
    );
  });

  it('rechaza una acción que no pertenece al módulo', () => {
    expect(() => assertValidAuditEntry(validEntry({ module: 'CUSTOMERS' }))).toThrow(
      InvalidAuditEntryError,
    );
  });

  it('rechaza detalles que no son pares label/value', () => {
    expect(() =>
      assertValidAuditEntry(validEntry({ details: [{ label: 'Mail' } as never] })),
    ).toThrow(InvalidAuditEntryError);
  });

  it('rechaza un código de operación de más de 20 caracteres', () => {
    expect(() => assertValidAuditEntry(validEntry({ operationCode: 'C'.repeat(21) }))).toThrow(
      InvalidAuditEntryError,
    );
  });
});

describe('AUDIT_ACTIONS_BY_MODULE', () => {
  it('tiene los 8 módulos y los 37 códigos del contrato (§3.9.2)', () => {
    expect(Object.keys(AUDIT_ACTIONS_BY_MODULE)).toHaveLength(8);
    const total = Object.values(AUDIT_ACTIONS_BY_MODULE).reduce((sum, actions) => sum + actions.length, 0);
    expect(total).toBe(37);
  });

  it('Empleados incluye la reactivación de la cuenta de usuario', () => {
    expect(AUDIT_ACTIONS_BY_MODULE.EMPLOYEES).toContain('USER_ACCOUNT_REACTIVATED');
  });
});
