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
    it('descuenta lo disponible y fuerza CONSUMED aunque no llegue a 0', () => {
      const lot = PointsLot.create(validData);
      lot.consume(300); // ya se gastó parte en otro lado -> quedan 200 disponibles

      lot.voidOrigin(200); // se anula el consumo que originó este lote

      expect(lot.getRemainingPoints()).toBe(0);
      expect(lot.getStatus()).toBe('CONSUMED');
    });

    it('invalida el lote entero aunque todavía tenga todo el saldo disponible', () => {
      const lot = PointsLot.create(validData);

      lot.voidOrigin(500);

      expect(lot.getRemainingPoints()).toBe(0);
      expect(lot.getStatus()).toBe('CONSUMED');
    });
  });
});
