import { Session } from './session.js';
import { DomainError } from './errors/domain.error.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Plazos reales de los empleados: 30 minutos de inactividad, 12 horas como máximo
const INACTIVITY = 30 * MINUTE;
const ABSOLUTE = 12 * HOUR;

const T0 = new Date('2026-10-05T12:00:00.000Z');
const after = (ms: number) => new Date(T0.getTime() + ms);

const startSession = () =>
  Session.start({
    accountId: 1,
    tokenHash: 'hash-1',
    now: T0,
    inactivityMs: INACTIVITY,
    absoluteMs: ABSOLUTE,
  });

// Una sesión que lleva mucho tiempo abierta y se viene renovando
const longRunningSession = (expiresAt: Date) =>
  Session.reconstruct({
    id: 10,
    accountId: 1,
    tokenHash: 'hash-1',
    expiresAt,
    absoluteExpiresAt: after(ABSOLUTE),
    revokedAt: null,
    createdAt: T0,
  });

describe('Session', () => {
  describe('start', () => {
    it('una sesión recién iniciada está vigente', () => {
      const session = startSession();

      expect(session.isUsable(T0)).toBe(true);
      expect(session.getExpiresAt()).toEqual(after(INACTIVITY));
      expect(session.getAbsoluteExpiresAt()).toEqual(after(ABSOLUTE));
      expect(session.getRevokedAt()).toBeNull();
      expect(session.getId()).toBeNull();
    });

    it('el vencimiento por inactividad nunca supera el tope máximo', () => {
      const session = Session.start({
        accountId: 1,
        tokenHash: 'hash-1',
        now: T0,
        inactivityMs: 2 * HOUR,
        absoluteMs: 1 * HOUR,
      });

      expect(session.getExpiresAt()).toEqual(after(1 * HOUR));
    });

    it('rechaza datos inválidos', () => {
      const base = { accountId: 1, tokenHash: 'hash-1', now: T0, inactivityMs: INACTIVITY, absoluteMs: ABSOLUTE };

      expect(() => Session.start({ ...base, accountId: 0 })).toThrow(DomainError);
      expect(() => Session.start({ ...base, tokenHash: '' })).toThrow(DomainError);
      expect(() => Session.start({ ...base, inactivityMs: 0 })).toThrow(DomainError);
      expect(() => Session.start({ ...base, absoluteMs: -1 })).toThrow(DomainError);
    });
  });

  describe('isUsable', () => {
    it('vence por inactividad justo al llegar a expiresAt', () => {
      const session = startSession();

      expect(session.isUsable(after(INACTIVITY - 1))).toBe(true);
      expect(session.isUsable(after(INACTIVITY))).toBe(false);
    });

    it('vence al llegar al tope máximo aunque expiresAt sea posterior', () => {
      const session = longRunningSession(after(ABSOLUTE + 10 * MINUTE));

      expect(session.isUsable(after(ABSOLUTE - 1))).toBe(true);
      expect(session.isUsable(after(ABSOLUTE))).toBe(false);
    });

    it('una sesión revocada no está vigente', () => {
      const session = startSession();
      session.revoke(after(5 * MINUTE));

      expect(session.isUsable(after(6 * MINUTE))).toBe(false);
    });
  });

  describe('rotate', () => {
    it('cambia el token y corre el vencimiento por inactividad', () => {
      const session = startSession();

      session.rotate('hash-2', after(20 * MINUTE), INACTIVITY);

      expect(session.getTokenHash()).toBe('hash-2');
      expect(session.getExpiresAt()).toEqual(after(50 * MINUTE));
      // Sin la renovación habría vencido a los 30 minutos
      expect(session.isUsable(after(45 * MINUTE))).toBe(true);
    });

    it('cerca del tope, el vencimiento no pasa de absoluteExpiresAt', () => {
      const session = longRunningSession(after(11 * HOUR + 50 * MINUTE));

      session.rotate('hash-2', after(11 * HOUR + 45 * MINUTE), INACTIVITY);

      expect(session.getExpiresAt()).toEqual(after(ABSOLUTE));
      expect(session.isUsable(after(ABSOLUTE))).toBe(false);
    });

    it('no cambia el tope máximo', () => {
      const session = startSession();

      session.rotate('hash-2', after(20 * MINUTE), INACTIVITY);

      expect(session.getAbsoluteExpiresAt()).toEqual(after(ABSOLUTE));
    });

    it('rechaza renovar una sesión vencida, sin modificarla', () => {
      const session = startSession();

      expect(() => session.rotate('hash-2', after(INACTIVITY), INACTIVITY)).toThrow(DomainError);
      expect(session.getTokenHash()).toBe('hash-1');
    });

    it('rechaza renovar una sesión revocada', () => {
      const session = startSession();
      session.revoke(after(5 * MINUTE));

      expect(() => session.rotate('hash-2', after(6 * MINUTE), INACTIVITY)).toThrow(DomainError);
    });
  });

  describe('revoke', () => {
    it('revocar dos veces no es un error y conserva la primera fecha', () => {
      const session = startSession();

      session.revoke(after(5 * MINUTE));
      session.revoke(after(9 * MINUTE));

      expect(session.getRevokedAt()).toEqual(after(5 * MINUTE));
    });
  });
});
