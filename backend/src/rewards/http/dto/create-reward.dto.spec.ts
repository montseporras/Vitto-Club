import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateRewardDto } from './create-reward.dto.js';

const VALID = {
  name: 'Café + medialuna',
  description: 'Café chico con una medialuna de manteca.',
  points: 150,
  stock: 20,
  expiresAt: '2026-12-08',
};

const validate = (plain: object) =>
  validateSync(plainToInstance(CreateRewardDto, plain), { whitelist: true, forbidNonWhitelisted: true });

// Mensajes de un campo, para ver que cada caso devuelve uno solo
const messagesOf = (plain: object, field: string) =>
  validate(plain)
    .filter((error) => error.property === field)
    .flatMap((error) => Object.values(error.constraints ?? {}));

const without = (field: keyof typeof VALID) => {
  const copy: Record<string, unknown> = { ...VALID };
  delete copy[field];
  return copy;
};

describe('CreateRewardDto (§3.2.3) — CA-34.4', () => {
  it('acepta una recompensa completa, sin descripción, sin límite y sin vencimiento', () => {
    expect(validate(VALID)).toEqual([]);
    expect(validate(without('description'))).toEqual([]);
    expect(validate({ ...VALID, description: null, stock: null, expiresAt: null })).toEqual([]);
  });

  it('acepta los límites: nombre de 80, descripción de 255, 1 y 1.000.000 pts, stock 1 y 100.000', () => {
    expect(validate({ ...VALID, name: 'a'.repeat(80), description: 'd'.repeat(255) })).toEqual([]);
    expect(validate({ ...VALID, points: 1, stock: 1 })).toEqual([]);
    expect(validate({ ...VALID, points: 1_000_000, stock: 100_000 })).toEqual([]);
  });

  describe('name', () => {
    it.each([undefined, null, '', '   ', 123])('%p: "Completá este campo."', (name) => {
      expect(messagesOf({ ...VALID, name }, 'name')).toEqual(['Completá este campo.']);
    });

    it('más de 80: "Máximo 80 caracteres."', () => {
      expect(messagesOf({ ...VALID, name: 'a'.repeat(81) }, 'name')).toEqual(['Máximo 80 caracteres.']);
    });

    it('se recorta antes de validar: 80 caracteres con espacios alrededor valen', () => {
      const dto = plainToInstance(CreateRewardDto, { ...VALID, name: `  ${'a'.repeat(80)}  ` });
      expect(validateSync(dto)).toEqual([]);
      expect(dto.name).toBe('a'.repeat(80));
    });
  });

  describe('description', () => {
    it('más de 255: "Máximo 255 caracteres." (se cuenta recortada)', () => {
      expect(messagesOf({ ...VALID, description: 'd'.repeat(256) }, 'description')).toEqual(['Máximo 255 caracteres.']);
      expect(messagesOf({ ...VALID, description: ` ${'d'.repeat(255)} ` }, 'description')).toEqual([]);
    });
  });

  describe('points', () => {
    it.each([undefined, null, ''])('vacío (%p): "Completá este campo."', (points) => {
      expect(messagesOf({ ...VALID, points }, 'points')).toEqual(['Completá este campo.']);
    });

    it.each([0, -5, 1.5, '150', 'abc'])('%p: "Ingresá un número entero mayor a 0."', (points) => {
      expect(messagesOf({ ...VALID, points }, 'points')).toEqual(['Ingresá un número entero mayor a 0.']);
    });

    it('más de 1.000.000: "El máximo es 1.000.000 puntos."', () => {
      expect(messagesOf({ ...VALID, points: 1_000_001 }, 'points')).toEqual(['El máximo es 1.000.000 puntos.']);
    });
  });

  describe('stock', () => {
    it('ausente: "Completá este campo." (null vale, pero tiene que venir)', () => {
      expect(messagesOf(without('stock'), 'stock')).toEqual(['Completá este campo.']);
    });

    it.each([0, -1])('%p al crear: "Ingresá un número entero mayor a 0."', (stock) => {
      expect(messagesOf({ ...VALID, stock }, 'stock')).toEqual(['Ingresá un número entero mayor a 0.']);
    });

    it.each([2.5, '20', 'abc', ''])('%p: "Ingresá un número entero, sin decimales."', (stock) => {
      expect(messagesOf({ ...VALID, stock }, 'stock')).toEqual(['Ingresá un número entero, sin decimales.']);
    });

    it('más de 100.000: "El máximo es 100.000."', () => {
      expect(messagesOf({ ...VALID, stock: 100_001 }, 'stock')).toEqual(['El máximo es 100.000.']);
    });
  });

  describe('expiresAt', () => {
    it('ausente: "Completá este campo." (null vale, pero tiene que venir)', () => {
      expect(messagesOf(without('expiresAt'), 'expiresAt')).toEqual(['Completá este campo.']);
    });

    it.each(['2026-13-01', '2026-02-30', '08/12/2026', 'mañana', '', '2026-12-08T00:00:00Z', 20261208])(
      '%p: "expiresAt no es una fecha válida (YYYY-MM-DD)"',
      (expiresAt) => {
        expect(messagesOf({ ...VALID, expiresAt }, 'expiresAt')).toEqual([
          'expiresAt no es una fecha válida (YYYY-MM-DD)',
        ]);
      },
    );
  });

  it.each(['status', 'usedCount', 'id', 'createdAt', 'updatedAt', 'photoUrl'])(
    'CA-34.7: %s no se puede mandar ("property X should not exist")',
    (field) => {
      const errors = validate({ ...VALID, [field]: 1 });
      expect(errors.map((error) => [error.property, Object.values(error.constraints ?? {})])).toEqual([
        [field, [`property ${field} should not exist`]],
      ]);
    },
  );
});
