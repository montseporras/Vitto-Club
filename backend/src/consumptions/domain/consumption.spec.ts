import { Consumption } from './consumption.js';
import { DomainError } from './errors/domain.error.js';

describe('Consumption', () => {
  const validData = {
    customerId: 101,
    amount: 50000,
    points: 500,
    bonusPoints: 0,
    configurationVersion: 4,
    baseAmount: 1000,
    pointsAwarded: 10,
    registeredByAccountId: 12,
    registeredByName: 'Ana Pereyra',
  };

  describe('create()', () => {
    it('nace REGISTERED, sin id y sin datos de anulación', () => {
      const consumption = Consumption.create(validData);

      expect(consumption.getId()).toBeNull();
      expect(consumption.getCode()).toBeNull();
      expect(consumption.getStatus()).toBe('REGISTERED');
      expect(consumption.isRegistered()).toBe(true);
      expect(consumption.isVoided()).toBe(false);
      expect(consumption.getVoidedAt()).toBeNull();
      expect(consumption.getVoidedByAccountId()).toBeNull();
      expect(consumption.getVoidedByName()).toBeNull();
      expect(consumption.getVoidedReason()).toBeNull();
    });

    it('calcula totalPoints como points + bonusPoints', () => {
      const consumption = Consumption.create({ ...validData, points: 500, bonusPoints: 75 });
      expect(consumption.getTotalPoints()).toBe(575);
    });

    it('guarda el snapshot de la equivalencia (RF-014)', () => {
      const consumption = Consumption.create(validData);
      expect(consumption.getConfigurationVersion()).toBe(4);
      expect(consumption.getBaseAmount()).toBe(1000);
      expect(consumption.getPointsAwarded()).toBe(10);
    });

    it('observaciones vacías o solo espacios se guardan como null (decisión #6)', () => {
      expect(Consumption.create({ ...validData, notes: undefined }).getNotes()).toBeNull();
      expect(Consumption.create({ ...validData, notes: '' }).getNotes()).toBeNull();
      expect(Consumption.create({ ...validData, notes: '   ' }).getNotes()).toBeNull();
    });

    it('recorta espacios de observaciones no vacías', () => {
      expect(Consumption.create({ ...validData, notes: '  Mesa 4  ' }).getNotes()).toBe('Mesa 4');
    });

    it('rechaza observaciones de más de 255 caracteres', () => {
      expect(() => Consumption.create({ ...validData, notes: 'x'.repeat(256) })).toThrow(
        DomainError,
      );
    });

    it.each([0, -1, -50000])('rechaza amount <= 0 (%p)', (amount) => {
      expect(() => Consumption.create({ ...validData, amount })).toThrow(DomainError);
    });

    it('rechaza amount con más de 2 decimales', () => {
      expect(() => Consumption.create({ ...validData, amount: 50000.123 })).toThrow(DomainError);
    });

    it('rechaza amount mayor al tope de la columna', () => {
      expect(() => Consumption.create({ ...validData, amount: 10_000_000_000 })).toThrow(
        DomainError,
      );
    });

    it('acepta amount en el tope exacto', () => {
      expect(() =>
        Consumption.create({ ...validData, amount: 9_999_999_999.99 }),
      ).not.toThrow();
    });

    it.each([-1, 1.5])('rechaza points negativo o no entero (%p)', (points) => {
      expect(() => Consumption.create({ ...validData, points })).toThrow(DomainError);
    });

    it('acepta points y bonusPoints en 0', () => {
      expect(() =>
        Consumption.create({ ...validData, points: 0, bonusPoints: 0 }),
      ).not.toThrow();
    });

    it('rechaza customerId no positivo', () => {
      expect(() => Consumption.create({ ...validData, customerId: 0 })).toThrow(DomainError);
    });

    it('rechaza registeredByName vacío', () => {
      expect(() => Consumption.create({ ...validData, registeredByName: '   ' })).toThrow(
        DomainError,
      );
    });
  });

  describe('reconstruct()', () => {
    it('reconstruye un consumo REGISTERED persistido', () => {
      const consumption = Consumption.reconstruct({
        ...validData,
        id: 141,
        status: 'REGISTERED',
        createdAt: new Date('2026-10-16T18:40:00.000Z'),
      });

      expect(consumption.getId()).toBe(141);
      expect(consumption.getCode()).toBe('C-000141');
      expect(consumption.getCreatedAt()).toEqual(new Date('2026-10-16T18:40:00.000Z'));
    });

    it('reconstruye un consumo VOIDED con sus datos de anulación', () => {
      const consumption = Consumption.reconstruct({
        ...validData,
        id: 131,
        status: 'VOIDED',
        createdAt: new Date('2026-10-16T18:40:00.000Z'),
        voidedAt: new Date('2026-10-16T20:00:00.000Z'),
        voidedByAccountId: 7,
        voidedByName: 'Bruno Pérez',
        voidedReason: 'monto cargado incorrectamente',
      });

      expect(consumption.isVoided()).toBe(true);
      expect(consumption.getVoidedByAccountId()).toBe(7);
      expect(consumption.getVoidedByName()).toBe('Bruno Pérez');
      expect(consumption.getVoidedReason()).toBe('monto cargado incorrectamente');
    });

    it('no revalida (confía en lo que ya está persistido)', () => {
      expect(() =>
        Consumption.reconstruct({
          ...validData,
          amount: -1,
          id: 1,
          status: 'REGISTERED',
          createdAt: new Date(),
        }),
      ).not.toThrow();
    });
  });

  describe('código (deriveCode / parseCode)', () => {
    it('deriva "C-" + id con ceros a la izquierda hasta 6 dígitos', () => {
      expect(Consumption.deriveCode(141)).toBe('C-000141');
      expect(Consumption.deriveCode(1)).toBe('C-000001');
      expect(Consumption.deriveCode(123456)).toBe('C-123456');
    });

    it('parsea un código válido a su id', () => {
      expect(Consumption.parseCode('C-000141')).toBe(141);
    });

    it.each(['131', 'C-131', 'C-0000131', 'c-000131', 'C-00013A', ''])(
      'devuelve null para un código con formato inválido (%p)',
      (code) => {
        expect(Consumption.parseCode(code)).toBeNull();
      },
    );
  });

  describe('void() (US-22)', () => {
    const register = () => Consumption.reconstruct({
      ...validData,
      id: 141,
      status: 'REGISTERED',
      createdAt: new Date('2026-10-16T18:40:00.000Z'),
    });

    it('pasa a VOIDED y guarda voidedAt/By/Reason', () => {
      const consumption = register();

      consumption.void({ voidedByAccountId: 7, voidedByName: 'Bruno Pérez', reason: 'motivo válido' });

      expect(consumption.isVoided()).toBe(true);
      expect(consumption.getVoidedByAccountId()).toBe(7);
      expect(consumption.getVoidedByName()).toBe('Bruno Pérez');
      expect(consumption.getVoidedReason()).toBe('motivo válido');
      expect(consumption.getVoidedAt()).toBeInstanceOf(Date);
    });

    it('rechaza anular un consumo ya anulado (estado final, decisión #11)', () => {
      const consumption = register();
      consumption.void({ voidedByAccountId: 7, voidedByName: 'Bruno Pérez', reason: 'motivo válido' });

      expect(() =>
        consumption.void({ voidedByAccountId: 7, voidedByName: 'Bruno Pérez', reason: 'otro motivo' }),
      ).toThrow(DomainError);
    });

    it('recorta el motivo y rechaza menos de 5 caracteres (CA-22.8)', () => {
      const consumption = register();
      expect(() =>
        consumption.void({ voidedByAccountId: 7, voidedByName: 'Bruno Pérez', reason: '  ab  ' }),
      ).toThrow(DomainError);
    });

    it('acepta un motivo de exactamente 5 caracteres tras recortar espacios', () => {
      const consumption = register();
      consumption.void({ voidedByAccountId: 7, voidedByName: 'Bruno Pérez', reason: '  abcde  ' });
      expect(consumption.getVoidedReason()).toBe('abcde');
    });
  });

  describe('getVoidEligibility() (§3.2.1)', () => {
    const createdAt = new Date('2026-10-16T18:40:00.000Z');
    const registered = () =>
      Consumption.reconstruct({ ...validData, id: 141, status: 'REGISTERED', createdAt });
    const voided = () => {
      const c = registered();
      c.void({ voidedByAccountId: 12, voidedByName: 'Ana Pereyra', reason: 'motivo válido' });
      return c;
    };

    it('Administrador: canVoid si REGISTERED, sin límite de tiempo', () => {
      const result = registered().getVoidEligibility({ role: 'ADMIN', accountId: 999 });
      expect(result).toEqual({ canVoid: true, voidableUntil: null });
    });

    it('Administrador: no puede anular uno ya anulado', () => {
      const result = voided().getVoidEligibility({ role: 'ADMIN', accountId: 999 });
      expect(result.canVoid).toBe(false);
    });

    it('Cajero propio, dentro de las 24 hs: canVoid true con voidableUntil', () => {
      const now = new Date(createdAt.getTime() + 60 * 60 * 1000); // +1h
      const result = registered().getVoidEligibility({ role: 'CASHIER', accountId: 12 }, now);
      expect(result.canVoid).toBe(true);
      expect(result.voidableUntil).toEqual(new Date(createdAt.getTime() + 24 * 60 * 60 * 1000));
    });

    it('Cajero propio, después de las 24 hs: canVoid false', () => {
      const now = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000 + 1);
      const result = registered().getVoidEligibility({ role: 'CASHIER', accountId: 12 }, now);
      expect(result.canVoid).toBe(false);
      expect(result.voidableUntil).not.toBeNull();
    });

    it('Cajero ajeno: canVoid false y voidableUntil null', () => {
      const result = registered().getVoidEligibility({ role: 'CASHIER', accountId: 999 });
      expect(result).toEqual({ canVoid: false, voidableUntil: null });
    });
  });
});
