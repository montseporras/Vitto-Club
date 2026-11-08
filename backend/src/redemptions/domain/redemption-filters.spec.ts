import { DomainError } from './errors/domain.error.js';
import {
  buildRedemptionDateRange,
  foldRewardNameFilter,
  normalizeCodeFilter,
  normalizeDocumentFilter,
  statusesOfGroup,
} from './redemption-filters.js';

describe('Filtros de canjes (US-45)', () => {
  describe('statusesOfGroup (§2.6)', () => {
    it('sin valor = todos', () => {
      expect(statusesOfGroup(undefined)).toBeUndefined();
    });

    it('Confirmados', () => {
      expect(statusesOfGroup('CONFIRMED')).toEqual(['CONFIRMED']);
    });

    it('Finalizados = Utilizado, Cancelado, Rechazado y Vencido', () => {
      expect(statusesOfGroup('FINISHED')).toEqual(['USED', 'CANCELLED', 'REJECTED', 'EXPIRED']);
    });
  });

  describe('normalizeCodeFilter (parcial)', () => {
    it.each([
      ['k7mp', 'K7MP'],
      [' k7-mp 2x ', 'K7MP2X'],
      ['k7mp0', 'K7MP0'],
    ])('%p → %p (sin validar el alfabeto)', (raw, expected) => {
      expect(normalizeCodeFilter(raw)).toBe(expected);
    });

    it.each([undefined, '', ' - '])('%p → sin filtro', (raw) => {
      expect(normalizeCodeFilter(raw)).toBeUndefined();
    });
  });

  describe('normalizeDocumentFilter (parcial)', () => {
    it.each([
      ['38.456', '38456'],
      [' 38 456-123 ', '38456123'],
      ['aab123', 'AAB123'],
    ])('%p → %p', (raw, expected) => {
      expect(normalizeDocumentFilter(raw)).toBe(expected);
    });

    it.each([undefined, '', '...', ' - . '])('%p → sin filtro (no es 400)', (raw) => {
      expect(normalizeDocumentFilter(raw)).toBeUndefined();
    });
  });

  describe('foldRewardNameFilter', () => {
    it('minúsculas y sin tildes; la ñ se conserva', () => {
      expect(foldRewardNameFilter('  CAFÉ ')).toBe('cafe');
      expect(foldRewardNameFilter('Ñoquis')).toBe('ñoquis');
    });

    it.each([undefined, '', '   '])('%p → sin filtro', (raw) => {
      expect(foldRewardNameFilter(raw)).toBeUndefined();
    });
  });

  describe('buildRedemptionDateRange (hora de Argentina, inclusivo)', () => {
    it('un día concreto: fromDate = toDate cubre ese día entero', () => {
      expect(buildRedemptionDateRange('2026-11-07', '2026-11-07')).toEqual({
        createdFrom: new Date('2026-11-07T03:00:00.000Z'),
        createdBefore: new Date('2026-11-08T03:00:00.000Z'),
      });
    });

    it('sin fechas: sin rango', () => {
      expect(buildRedemptionDateRange()).toEqual({});
    });

    it('rango invertido → DomainError de redemptions (400)', () => {
      expect(() => buildRedemptionDateRange('2026-11-08', '2026-11-07')).toThrow(DomainError);
      expect(() => buildRedemptionDateRange('2026-11-08', '2026-11-07')).toThrow(
        'fromDate no puede ser posterior a toDate',
      );
    });

    it('fecha inválida → DomainError de redemptions (400)', () => {
      expect(() => buildRedemptionDateRange('2026-02-30')).toThrow(DomainError);
      expect(() => buildRedemptionDateRange('07/11/2026')).toThrow('fromDate no es una fecha válida (YYYY-MM-DD)');
    });
  });
});
