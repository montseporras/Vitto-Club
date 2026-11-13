import { DomainError } from './errors/domain.error.js';
import { buildNotificationDateRange, normalizeDocumentFilter } from './notification-filters.js';

describe('normalizeDocumentFilter (US-14, contrato S5 §3.8.4)', () => {
  it('quita puntos, espacios y guiones y pasa a mayúsculas', () => {
    expect(normalizeDocumentFilter('38.456.123')).toBe('38456123');
    expect(normalizeDocumentFilter(' aab-123 456 ')).toBe('AAB123456');
  });

  it('sin valor, o si queda vacío, no filtra', () => {
    expect(normalizeDocumentFilter(undefined)).toBeUndefined();
    expect(normalizeDocumentFilter('...')).toBeUndefined();
    expect(normalizeDocumentFilter('  ')).toBeUndefined();
  });
});

describe('buildNotificationDateRange', () => {
  it('toDate es inclusivo: el límite es el comienzo del día siguiente, en hora de Argentina', () => {
    const range = buildNotificationDateRange('2026-11-10', '2026-11-10');

    expect(range.createdFrom).toEqual(new Date('2026-11-10T03:00:00.000Z'));
    expect(range.createdBefore).toEqual(new Date('2026-11-11T03:00:00.000Z'));
  });

  it('sin fechas no hay rango', () => {
    expect(buildNotificationDateRange()).toEqual({});
  });

  it('un rango invertido responde con el mensaje de siempre, como DomainError de notifications', () => {
    expect.assertions(3);
    try {
      buildNotificationDateRange('2026-11-11', '2026-11-10');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).message).toBe('fromDate no puede ser posterior a toDate');
      expect((error as DomainError).field).toBe('fromDate');
    }
  });

  it('una fecha que no existe se rechaza', () => {
    expect(() => buildNotificationDateRange('2026-02-30')).toThrow(DomainError);
  });
});
