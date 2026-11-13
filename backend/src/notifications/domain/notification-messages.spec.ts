import { DomainError } from './errors/domain.error.js';
import {
  parseMessageInput,
  sortAutomaticMessages,
  validateAutomaticMessages,
  type MessageInput,
} from './notification-messages.js';

const valid = (): MessageInput[] => [
  { type: 'POINTS_EXPIRING', active: true, subject: 'Tus puntos están por vencer', body: 'Hola {nombre}: {puntos} pts el {fecha}.' },
  { type: 'BIRTHDAY', active: true, subject: '¡Feliz cumpleaños!', body: '¡Feliz cumpleaños, {nombre}! {puntos} pts.' },
  { type: 'MISSION', active: false, subject: '¡Completaste una misión!', body: '¡Bien, {nombre}! Completaste {mision}.' },
];

const errorOf = (messages: MessageInput[]): DomainError => {
  try {
    validateAutomaticMessages(messages);
  } catch (error) {
    return error as DomainError;
  }
  throw new Error('Se esperaba un DomainError y no hubo ninguno');
};

describe('validateAutomaticMessages (US-14, contrato S5 §3.6.2)', () => {
  it('acepta los tres mensajes automáticos con sus variables', () => {
    expect(() => validateAutomaticMessages(valid())).not.toThrow();
  });

  it('acepta los tres en cualquier orden', () => {
    expect(() => validateAutomaticMessages(valid().reverse())).not.toThrow();
  });

  it('rechaza un mensaje PROMOTION con su mensaje propio', () => {
    const error = errorOf([...valid(), { type: 'PROMOTION', active: true, subject: 'Promo', body: 'Hola {nombre}' }]);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.message).toBe('Las promociones no tienen mensaje automático.');
    expect(error.field).toBe('messages.3.type');
  });

  it('una PROMOTION se rechaza antes que cualquier otro error, aunque falten tipos', () => {
    const error = errorOf([{ type: 'PROMOTION', active: true, subject: 'Promo', body: 'Hola' }]);

    expect(error.message).toBe('Las promociones no tienen mensaje automático.');
  });

  it.each([
    ['falta uno', () => valid().slice(0, 2)],
    ['no viene ninguno', () => []],
    ['uno viene repetido', () => [valid()[0], valid()[0], valid()[1]]],
    ['sobra uno repetido', () => [...valid(), valid()[1]]],
  ])('rechaza cuando %s', (_name, build) => {
    const error = errorOf(build());

    expect(error.message).toBe('Tienen que venir los tres mensajes automáticos.');
    expect(error.field).toBe('messages');
  });

  it('rechaza una variable que no corresponde al tipo, con llaves, y dice en qué campo', () => {
    const messages = valid();
    messages[1].body = '¡Feliz cumpleaños, {nombre}! Vence el {fecha}.';

    const error = errorOf(messages);

    expect(error.message).toBe('La variable {fecha} no se puede usar en este mensaje.');
    expect(error.field).toBe('messages.1.body');
  });

  it('también controla las variables del asunto', () => {
    const messages = valid();
    messages[2].subject = 'Completaste {mision} y ganaste {puntos}';

    const error = errorOf(messages);

    expect(error.message).toBe('La variable {puntos} no se puede usar en este mensaje.');
    expect(error.field).toBe('messages.2.subject');
  });

  it('una variable desconocida, o unas llaves vacías, también se rechazan', () => {
    const unknown = valid();
    unknown[0].body = 'Hola {apellido}';
    expect(errorOf(unknown).message).toBe('La variable {apellido} no se puede usar en este mensaje.');

    const empty = valid();
    empty[0].body = 'Hola {}';
    expect(errorOf(empty).message).toBe('La variable {} no se puede usar en este mensaje.');
  });
});

describe('parseMessageInput (US-14, contrato S5 §3.6.2)', () => {
  const errorOf = (raw: unknown): DomainError => {
    try {
      parseMessageInput(raw);
    } catch (error) {
      return error as DomainError;
    }
    throw new Error('Se esperaba un DomainError y no hubo ninguno');
  };
  const item = (overrides: Record<string, unknown> = {}) => ({
    type: 'BIRTHDAY',
    active: true,
    subject: 'Asunto',
    body: 'Mensaje',
    ...overrides,
  });

  it('devuelve los mensajes tipados, con solo los cuatro campos', () => {
    const result = parseMessageInput([{ ...item(), extra: 'se ignora' }]);

    expect(result).toEqual([{ type: 'BIRTHDAY', active: true, subject: 'Asunto', body: 'Mensaje' }]);
  });

  it('acepta el asunto de 120 y el mensaje de 1.000 caracteres, y los cuatro tipos', () => {
    expect(() => parseMessageInput([item({ subject: 'a'.repeat(120), body: 'b'.repeat(1000) })])).not.toThrow();
    for (const type of ['POINTS_EXPIRING', 'BIRTHDAY', 'PROMOTION', 'MISSION']) {
      expect(() => parseMessageInput([item({ type })])).not.toThrow();
    }
  });

  it.each([
    ['no es una lista', {}],
    ['no viene', undefined],
    ['es nulo', null],
  ])('si messages %s: "messages debe ser una lista"', (_name, raw) => {
    const error = errorOf(raw);

    expect(error.message).toBe('messages debe ser una lista');
    expect(error.field).toBe('messages');
  });

  it.each([
    ['vacío', '', 'El asunto es obligatorio.'],
    ['solo espacios', '   ', 'El asunto es obligatorio.'],
    ['ausente', undefined, 'El asunto es obligatorio.'],
    ['que no es texto', 5, 'El asunto es obligatorio.'],
    ['de 121 caracteres', 'a'.repeat(121), 'El asunto no puede superar los 120 caracteres.'],
  ])('asunto %s: "%s"', (_name, subject, message) => {
    const error = errorOf([item(), item({ subject })]);

    expect(error.message).toBe(message);
    expect(error.field).toBe('messages.1.subject');
  });

  it.each([
    ['vacío', '', 'El mensaje es obligatorio.'],
    ['solo espacios y saltos', '  \n ', 'El mensaje es obligatorio.'],
    ['ausente', undefined, 'El mensaje es obligatorio.'],
    ['de 1.001 caracteres', 'a'.repeat(1001), 'El mensaje no puede superar los 1.000 caracteres.'],
  ])('mensaje %s: "%s"', (_name, body, message) => {
    const error = errorOf([item({ body })]);

    expect(error.message).toBe(message);
    expect(error.field).toBe('messages.0.body');
  });

  it('un tipo desconocido o ausente, y un active que no es booleano, se rechazan con su campo', () => {
    expect(errorOf([item({ type: 'FOO' })])).toMatchObject({ message: 'type no es un tipo de notificación válido', field: 'messages.0.type' });
    expect(errorOf([item({ type: undefined })]).field).toBe('messages.0.type');
    expect(errorOf([item({ active: 'si' })])).toMatchObject({ message: 'active debe ser verdadero o falso', field: 'messages.0.active' });
  });

  it('un elemento que no es un objeto se rechaza', () => {
    expect(errorOf([null]).field).toBe('messages.0.type');
    expect(errorOf(['texto']).field).toBe('messages.0.type');
  });

  it('un mensaje con espacios alrededor se guarda tal cual, sin recortar', () => {
    const [result] = parseMessageInput([item({ subject: ' Hola ' })]);

    expect(result.subject).toBe(' Hola ');
  });
});

describe('sortAutomaticMessages', () => {
  it('los deja en el orden del contrato: vencimiento, cumpleaños, misiones', () => {
    const sorted = sortAutomaticMessages(valid().reverse());

    expect(sorted.map((message) => message.type)).toEqual(['POINTS_EXPIRING', 'BIRTHDAY', 'MISSION']);
  });
});
