import { DomainError } from './errors/domain.error.js';
import { parseScheduledAt, validatePromotionVariables } from './promotions.js';

const now = new Date('2026-11-12T15:00:00.000Z');

const errorOf = (action: () => unknown): DomainError => {
  try {
    action();
  } catch (error) {
    return error as DomainError;
  }
  throw new Error('Se esperaba un DomainError y no hubo ninguno');
};

describe('parseScheduledAt (US-15, contrato S5 §3.7.3)', () => {
  it('sin valor o nulo: se envía ahora', () => {
    expect(parseScheduledAt(null, now)).toBeNull();
    expect(parseScheduledAt(undefined, now)).toBeNull();
  });

  it('una fecha futura con zona se acepta, en UTC o con offset', () => {
    expect(parseScheduledAt('2026-11-20T21:30:00.000Z', now)).toEqual(new Date('2026-11-20T21:30:00.000Z'));
    expect(parseScheduledAt('2026-11-20T18:30:00-03:00', now)).toEqual(new Date('2026-11-20T21:30:00.000Z'));
    expect(parseScheduledAt('2026-11-20T21:30Z', now)).toEqual(new Date('2026-11-20T21:30:00.000Z'));
  });

  it('una fecha pasada o igual a ahora: "La fecha y hora tienen que ser posteriores a ahora."', () => {
    for (const raw of ['2026-11-12T14:59:59.000Z', '2026-11-12T15:00:00.000Z', '2020-01-01T00:00:00.000Z']) {
      const error = errorOf(() => parseScheduledAt(raw, now));

      expect(error.message).toBe('La fecha y hora tienen que ser posteriores a ahora.');
      expect(error.field).toBe('scheduledAt');
    }
  });

  it('un segundo después de ahora ya es futuro', () => {
    expect(parseScheduledAt('2026-11-12T15:00:01.000Z', now)).toEqual(new Date('2026-11-12T15:00:01.000Z'));
  });

  it.each([
    'mañana',
    '',
    '20/11/2026',
    '2026-11-20',
    '2026-11-20 21:30:00',
    '2026-11-20T21:30:00',
    '2026-13-45T10:00:00Z',
    '2026-02-30T10:00:00Z',
    '1700000000000',
  ])('"%s" no es una fecha y hora válida: "La fecha y hora no son válidas."', (raw) => {
    const error = errorOf(() => parseScheduledAt(raw, now));

    expect(error.message).toBe('La fecha y hora no son válidas.');
    expect(error.field).toBe('scheduledAt');
  });
});

describe('validatePromotionVariables (US-15, contrato S5 §3.7.3)', () => {
  it('acepta {nombre} y los textos sin variables', () => {
    expect(() => validatePromotionVariables('¡Pizza libre!', 'Hola {nombre}: todos los viernes.')).not.toThrow();
    expect(() => validatePromotionVariables('Hola {nombre}', 'Sin variables')).not.toThrow();
  });

  it('otra variable en el mensaje: con llaves y el campo en details', () => {
    const error = errorOf(() => validatePromotionVariables('Pizza', 'Tenés {puntos} pts'));

    expect(error.message).toBe('La variable {puntos} no se puede usar en este mensaje.');
    expect(error.field).toBe('body');
  });

  it('otra variable en el asunto', () => {
    const error = errorOf(() => validatePromotionVariables('Hasta el {fecha}', 'Hola {nombre}'));

    expect(error.message).toBe('La variable {fecha} no se puede usar en este mensaje.');
    expect(error.field).toBe('subject');
  });

  it('{mision}, que sí existe en otros tipos, tampoco se puede usar acá', () => {
    expect(() => validatePromotionVariables('Hola', '{mision}')).toThrow('La variable {mision}');
  });
});
