import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdjustPointsDto } from './adjust-points.dto.js';

const VALID = { direction: 'ADD', points: 350, reason: 'Regularización por anulación de consumo' };

const validate = (plain: object) =>
  validateSync(plainToInstance(AdjustPointsDto, plain), { whitelist: true, forbidNonWhitelisted: true });

// Mensajes de un campo, para ver que cada caso devuelve uno solo
const messagesOf = (plain: object, field: string) =>
  validate(plain)
    .filter((error) => error.property === field)
    .flatMap((error) => Object.values(error.constraints ?? {}));

describe('AdjustPointsDto (§3.5.1)', () => {
  it('acepta un ajuste válido, para sumar y para restar', () => {
    expect(validate(VALID)).toEqual([]);
    expect(validate({ ...VALID, direction: 'SUBTRACT' })).toEqual([]);
  });

  it('acepta el máximo: 1.000.000', () => {
    expect(validate({ ...VALID, points: 1_000_000 })).toEqual([]);
  });

  it.each([undefined, null, ''])('cantidad vacía (%p): "Ingresá la cantidad de puntos."', (points) => {
    expect(messagesOf({ ...VALID, points }, 'points')).toEqual(['Ingresá la cantidad de puntos.']);
  });

  it.each([10.5, 0, -5, '10', 'abc', true])(
    'cantidad %p: "Tiene que ser un número entero mayor a 0."',
    (points) => {
      expect(messagesOf({ ...VALID, points }, 'points')).toEqual(['Tiene que ser un número entero mayor a 0.']);
    },
  );

  it('cantidad mayor a 1.000.000: mensaje del máximo', () => {
    expect(messagesOf({ ...VALID, points: 1_000_001 }, 'points')).toEqual([
      'Ingresá un número menor o igual a 1.000.000.',
    ]);
  });

  it.each([undefined, null, '', '   ', 5])('motivo %p: "El motivo es obligatorio."', (reason) => {
    expect(messagesOf({ ...VALID, reason }, 'reason')).toEqual(['El motivo es obligatorio.']);
  });

  it('recorta el motivo: con espacios en los extremos se guarda sin ellos', () => {
    const dto = plainToInstance(AdjustPointsDto, { ...VALID, reason: '  Corrección  ' });
    expect(dto.reason).toBe('Corrección');
  });

  it('motivo de 500 caracteres pasa; de 501, no', () => {
    expect(validate({ ...VALID, reason: 'a'.repeat(500) })).toEqual([]);
    expect(messagesOf({ ...VALID, reason: 'a'.repeat(501) }, 'reason')).toEqual([
      'El motivo no puede superar los 500 caracteres.',
    ]);
  });

  it.each([undefined, '', 'MULTIPLY', 'add'])('dirección %p: "Elegí si querés sumar o restar puntos."', (direction) => {
    expect(messagesOf({ ...VALID, direction }, 'direction')).toEqual(['Elegí si querés sumar o restar puntos.']);
  });

  it('rechaza campos que no van en el body (quién ajusta, fecha)', () => {
    const properties = validate({ ...VALID, performedBy: 9, createdAt: '2026-10-16' }).map((e) => e.property);
    expect(properties).toEqual(expect.arrayContaining(['performedBy', 'createdAt']));
  });
});
