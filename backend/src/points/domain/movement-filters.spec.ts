import { buildMovementDateRange, foldName, parseCustomerSearch } from './movement-filters.js';
import { DomainError } from './errors/domain.error.js';

describe('buildMovementDateRange()', () => {
  it('sin fechas no filtra', () => {
    expect(buildMovementDateRange()).toEqual({});
  });

  it('días completos en hora de Argentina, toDate inclusivo', () => {
    expect(buildMovementDateRange('2026-10-01', '2026-10-16')).toEqual({
      createdFrom: new Date('2026-10-01T03:00:00.000Z'),
      createdBefore: new Date('2026-10-17T03:00:00.000Z'),
    });
  });

  it('el mismo día en las dos fechas es válido', () => {
    expect(buildMovementDateRange('2026-10-16', '2026-10-16')).toEqual({
      createdFrom: new Date('2026-10-16T03:00:00.000Z'),
      createdBefore: new Date('2026-10-17T03:00:00.000Z'),
    });
  });

  it('rango invertido → DomainError en fromDate', () => {
    expect(() => buildMovementDateRange('2026-10-17', '2026-10-16')).toThrow(
      new DomainError('fromDate no puede ser posterior a toDate', 'fromDate'),
    );
  });

  it.each(['2026-13-45', '2026-02-30', '16/10/2026', '2026-1-5'])('fecha inválida %s → DomainError', (value) => {
    expect(() => buildMovementDateRange(value)).toThrow('fromDate no es una fecha válida (YYYY-MM-DD)');
    expect(() => buildMovementDateRange(undefined, value)).toThrow('toDate no es una fecha válida (YYYY-MM-DD)');
  });
});

describe('foldName()', () => {
  it('saca mayúsculas y tildes, pero conserva la ñ', () => {
    expect(foldName('PÉREZ')).toBe('perez');
    expect(foldName('José Müller')).toBe('jose muller');
    expect(foldName('Muñoz')).toBe('muñoz');
  });
});

describe('parseCustomerSearch() — regla de q (§3.3.1)', () => {
  it('vacío → sin filtro', () => {
    expect(parseCustomerSearch('   ')).toBeUndefined();
  });

  it('3 dígitos o más → documento, sin puntos ni espacios', () => {
    expect(parseCustomerSearch('38.456.123')).toEqual({ kind: 'document', documentNumber: '38456123' });
    expect(parseCustomerSearch('384')).toEqual({ kind: 'document', documentNumber: '384' });
    expect(parseCustomerSearch('aa123456')).toEqual({ kind: 'document', documentNumber: 'AA123456' });
  });

  it('menos de 3 dígitos → nombre, por palabra, sin tildes ni mayúsculas', () => {
    expect(parseCustomerSearch('  Juan  PÉREZ ')).toEqual({ kind: 'name', terms: ['juan', 'perez'] });
    expect(parseCustomerSearch('ab12')).toEqual({ kind: 'name', terms: ['ab12'] });
  });
});
