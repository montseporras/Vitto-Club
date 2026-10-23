import { buildAuditFilters, type AuditFilterInput } from './audit-filters.js';
import { InvalidAuditFilterError } from './errors/invalid-audit-filter.error.js';

const input = (overrides: Partial<AuditFilterInput> = {}): AuditFilterInput => ({
  page: 1,
  limit: 20,
  ...overrides,
});

describe('buildAuditFilters()', () => {
  it('sin filtros devuelve solo la paginación', () => {
    expect(buildAuditFilters(input())).toEqual({ page: 1, limit: 20 });
  });

  describe('actor', () => {
    it('SYSTEM filtra por el Sistema', () => {
      expect(buildAuditFilters(input({ actor: 'SYSTEM' })).actor).toEqual({ type: 'SYSTEM' });
    });

    it('un entero filtra por esa cuenta de empleado', () => {
      expect(buildAuditFilters(input({ actor: '9' })).actor).toEqual({ type: 'EMPLOYEE', accountId: 9 });
    });

    it.each(['abc', '-3', '1.5', ''])('rechaza "%s" con 400', (actor) => {
      expect(() => buildAuditFilters(input({ actor }))).toThrow(InvalidAuditFilterError);
    });
  });

  describe('module y action', () => {
    it('acepta una acción que pertenece al módulo', () => {
      const filters = buildAuditFilters(input({ module: 'CUSTOMERS', action: 'CUSTOMER_CREATED' }));

      expect(filters).toMatchObject({ module: 'CUSTOMERS', action: 'CUSTOMER_CREATED' });
    });

    it('action sin module responde 400 (CA-58.5)', () => {
      expect(() => buildAuditFilters(input({ action: 'CUSTOMER_CREATED' }))).toThrow(
        InvalidAuditFilterError,
      );
    });

    it('action de otro módulo responde 400 (CA-58.5)', () => {
      expect(() =>
        buildAuditFilters(input({ module: 'EMPLOYEES', action: 'CUSTOMER_CREATED' })),
      ).toThrow(InvalidAuditFilterError);
    });

    it('Empleados incluye la reactivación de la cuenta de usuario', () => {
      expect(() =>
        buildAuditFilters(input({ module: 'EMPLOYEES', action: 'USER_ACCOUNT_REACTIVATED' })),
      ).not.toThrow();
    });
  });

  describe('documento', () => {
    it('normaliza el número (sin puntos, espacios ni guiones, en mayúsculas)', () => {
      const filters = buildAuditFilters(input({ documentNumber: ' 30.111-222 ' }));

      expect(filters.documentNumber).toBe('30111222');
    });

    it('con número y sin tipo asume DNI', () => {
      expect(buildAuditFilters(input({ documentNumber: '3011' })).documentType).toBe('DNI');
    });

    it('respeta el tipo si viene con el número', () => {
      const filters = buildAuditFilters(input({ documentType: 'PASSPORT', documentNumber: 'ab-123' }));

      expect(filters).toMatchObject({ documentType: 'PASSPORT', documentNumber: 'AB123' });
    });

    it('con tipo y sin número filtra solo por tipo', () => {
      const filters = buildAuditFilters(input({ documentType: 'PASSPORT' }));

      expect(filters).toMatchObject({ documentType: 'PASSPORT' });
      expect(filters.documentNumber).toBeUndefined();
    });

    it('un número que queda vacío al normalizar responde 400', () => {
      expect(() => buildAuditFilters(input({ documentNumber: '. - .' }))).toThrow(
        InvalidAuditFilterError,
      );
    });
  });

  describe('fechas (hora de Argentina)', () => {
    it('fromDate y toDate son días completos e inclusivos', () => {
      const filters = buildAuditFilters(input({ fromDate: '2026-10-13', toDate: '2026-10-14' }));

      expect(filters.createdFrom?.toISOString()).toBe('2026-10-13T03:00:00.000Z');
      // toDate inclusivo: el límite es el comienzo del día siguiente
      expect(filters.createdBefore?.toISOString()).toBe('2026-10-15T03:00:00.000Z');
    });

    it('un solo día (hoy a hoy) cubre 24 horas', () => {
      const filters = buildAuditFilters(input({ fromDate: '2026-10-13', toDate: '2026-10-13' }));

      expect(filters.createdBefore!.getTime() - filters.createdFrom!.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it('date es un día exacto', () => {
      const filters = buildAuditFilters(input({ date: '2026-10-13' }));

      expect(filters.createdFrom?.toISOString()).toBe('2026-10-13T03:00:00.000Z');
      expect(filters.createdBefore?.toISOString()).toBe('2026-10-14T03:00:00.000Z');
    });

    it('solo fromDate o solo toDate dejan el otro extremo abierto', () => {
      expect(buildAuditFilters(input({ fromDate: '2026-10-13' })).createdBefore).toBeUndefined();
      expect(buildAuditFilters(input({ toDate: '2026-10-13' })).createdFrom).toBeUndefined();
    });

    it('fromDate posterior a toDate responde 400 (CA-58.8)', () => {
      expect(() => buildAuditFilters(input({ fromDate: '2026-10-14', toDate: '2026-10-13' }))).toThrow(
        InvalidAuditFilterError,
      );
    });

    it('date junto con un rango responde 400 (CA-58.8)', () => {
      expect(() => buildAuditFilters(input({ date: '2026-10-13', fromDate: '2026-10-01' }))).toThrow(
        InvalidAuditFilterError,
      );
      expect(() => buildAuditFilters(input({ date: '2026-10-13', toDate: '2026-10-20' }))).toThrow(
        InvalidAuditFilterError,
      );
    });

    it.each(['2026-13-45', '2026-02-30', '2026-00-10'])('rechaza la fecha inexistente %s', (value) => {
      expect(() => buildAuditFilters(input({ fromDate: value }))).toThrow(InvalidAuditFilterError);
      expect(() => buildAuditFilters(input({ date: value }))).toThrow(InvalidAuditFilterError);
    });
  });

  it('operationCode y paginación pasan tal cual', () => {
    const filters = buildAuditFilters(input({ operationCode: 'c-000131', page: 3, limit: 10 }));

    expect(filters).toMatchObject({ operationCode: 'c-000131', page: 3, limit: 10 });
  });
});
