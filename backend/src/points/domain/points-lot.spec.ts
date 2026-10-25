import { PointsLot } from './points-lot.js';
import { DomainError } from './errors/domain.error.js';

describe('PointsLot', () => {
  const validData = {
    customerId: 101,
    consumptionId: 141,
    initialPoints: 500,
    accreditedAt: new Date('2026-10-16T18:40:00.000Z'),
    expiresAt: new Date('2027-10-16T18:40:00.000Z'),
  };

  describe('create()', () => {
    it('nace ACTIVE con remaining = initial', () => {
      const lot = PointsLot.create(validData);

      expect(lot.getId()).toBeNull();
      expect(lot.getStatus()).toBe('ACTIVE');
      expect(lot.isActive()).toBe(true);
      expect(lot.getInitialPoints()).toBe(500);
      expect(lot.getRemainingPoints()).toBe(500);
      expect(lot.getExpiredAt()).toBeNull();
    });

    it('admite consumptionId null (ajuste ADD, US-24)', () => {
      const lot = PointsLot.create({ ...validData, consumptionId: null });
      expect(lot.getConsumptionId()).toBeNull();
    });

    it('rechaza initialPoints <= 0', () => {
      expect(() => PointsLot.create({ ...validData, initialPoints: 0 })).toThrow(DomainError);
      expect(() => PointsLot.create({ ...validData, initialPoints: -1 })).toThrow(DomainError);
    });

    it('rechaza customerId no positivo', () => {
      expect(() => PointsLot.create({ ...validData, customerId: 0 })).toThrow(DomainError);
    });
  });

  describe('reconstruct()', () => {
    it('reconstruye un lote persistido tal cual', () => {
      const lot = PointsLot.reconstruct({
        ...validData,
        id: 7,
        remainingPoints: 200,
        status: 'ACTIVE',
      });

      expect(lot.getId()).toBe(7);
      expect(lot.getRemainingPoints()).toBe(200);
    });
  });

  describe('consume()', () => {
    it('descuenta y queda ACTIVE si no llega a 0', () => {
      const lot = PointsLot.create(validData);
      lot.consume(200);

      expect(lot.getRemainingPoints()).toBe(300);
      expect(lot.getStatus()).toBe('ACTIVE');
    });

    it('pasa a CONSUMED cuando remaining llega a 0', () => {
      const lot = PointsLot.create(validData);
      lot.consume(500);

      expect(lot.getRemainingPoints()).toBe(0);
      expect(lot.getStatus()).toBe('CONSUMED');
    });

    it('rechaza consumir más de lo que queda disponible', () => {
      const lot = PointsLot.create(validData);
      expect(() => lot.consume(501)).toThrow(DomainError);
    });

    it('rechaza un monto negativo', () => {
      const lot = PointsLot.create(validData);
      expect(() => lot.consume(-1)).toThrow(DomainError);
    });

    it('acepta consumir 0 (no cambia nada)', () => {
      const lot = PointsLot.create(validData);
      lot.consume(0);
      expect(lot.getRemainingPoints()).toBe(500);
      expect(lot.getStatus()).toBe('ACTIVE');
    });
  });

  describe('voidOrigin() (CA-BASE.4, US-22)', () => {
    it('descuenta lo disponible y fuerza VOIDED aunque no llegue a 0', () => {
      const lot = PointsLot.create(validData);
      lot.consume(300); // ya se gastó parte en otro lado -> quedan 200 disponibles

      lot.voidOrigin(200); // se anula el consumo que originó este lote

      expect(lot.getRemainingPoints()).toBe(0);
      expect(lot.getStatus()).toBe('VOIDED');
    });

    it('invalida el lote entero aunque todavía tenga todo el saldo disponible', () => {
      const lot = PointsLot.create(validData);

      lot.voidOrigin(500);

      expect(lot.getRemainingPoints()).toBe(0);
      expect(lot.getStatus()).toBe('VOIDED');
    });
  });
  describe('expire() (US-25)', () => {
    const now = new Date('2027-10-17T03:05:00.000Z');
    const persisted = (remainingPoints: number, status: 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'VOIDED' = 'ACTIVE') =>
      PointsLot.reconstruct({ ...validData, id: 7, remainingPoints, status });

    it('vence entero con saldo parcial: devuelve lo que quedaba, remaining 0, EXPIRED y expiredAt', () => {
      const lot = persisted(200);

      expect(lot.expire(now)).toBe(200);
      expect(lot.getRemainingPoints()).toBe(0);
      expect(lot.getStatus()).toBe('EXPIRED');
      expect(lot.getExpiredAt()).toEqual(now);
      expect(lot.getInitialPoints()).toBe(500);
    });

    it('vence entero con el saldo completo', () => {
      expect(persisted(500).expire(now)).toBe(500);
    });

    it('vence justo en su fecha (expiresAt <= ahora)', () => {
      expect(persisted(500).expire(validData.expiresAt)).toBe(500);
    });

    it('no vence antes de su fecha', () => {
      expect(() => persisted(500).expire(new Date('2027-10-16T18:39:59.999Z'))).toThrow(DomainError);
    });

    it('un lote que no está ACTIVE no vence (idempotencia: EXPIRED no se vuelve a procesar)', () => {
      expect(() => persisted(0, 'EXPIRED').expire(now)).toThrow(DomainError);
      expect(() => persisted(0, 'CONSUMED').expire(now)).toThrow(DomainError);
      expect(() => persisted(100, 'VOIDED').expire(now)).toThrow(DomainError);
    });

    it('un lote sin saldo no vence (no genera movimiento)', () => {
      expect(() => persisted(0).expire(now)).toThrow(DomainError);
    });
  });
});
