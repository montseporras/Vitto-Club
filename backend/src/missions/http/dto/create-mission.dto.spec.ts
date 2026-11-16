import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMissionDto } from './create-mission.dto.js';

const VALID = {
  name: 'Vení 3 veces',
  description: 'Tres consumos en el mes.',
  objectiveType: 'CONSUMPTION_COUNT',
  target: 3,
  daysOfWeek: [7],
  timeFrom: '09:00',
  timeTo: '13:00',
  rewardPoints: 50,
  startMonth: '2026-11',
  endMonth: '2026-12',
};

const validate = (plain: object) =>
  validateSync(plainToInstance(CreateMissionDto, plain), { whitelist: true, forbidNonWhitelisted: true });

// Todos los mensajes, para ver que cada caso devuelve uno solo
const messages = (plain: object) => validate(plain).flatMap((error) => Object.values(error.constraints ?? {}));

const without = (field: keyof typeof VALID) => {
  const copy: Record<string, unknown> = { ...VALID };
  delete copy[field];
  return copy;
};

describe('CreateMissionDto (§3.1.3) — CA-28.5', () => {
  it('acepta una misión completa', () => {
    expect(validate(VALID)).toEqual([]);
  });

  it('acepta la mínima: sin descripción, días, horario, recompensa ni mes de fin (ausentes o null)', () => {
    const minimal = { name: 'Vení 3 veces', objectiveType: 'CONSUMPTION_COUNT', target: 3, startMonth: '2026-11' };
    expect(validate(minimal)).toEqual([]);
    expect(
      validate({ ...minimal, description: null, daysOfWeek: null, timeFrom: null, timeTo: null, rewardPoints: null, endMonth: null }),
    ).toEqual([]);
  });

  it('acepta los límites: nombre de 80, descripción de 255, objetivos 1/100 y 1/1.000.000, 1 y 100.000 pts', () => {
    expect(validate({ ...VALID, name: 'a'.repeat(80), description: 'd'.repeat(255) })).toEqual([]);
    expect(validate({ ...VALID, target: 1, rewardPoints: 1 })).toEqual([]);
    expect(validate({ ...VALID, target: 100, rewardPoints: 100_000 })).toEqual([]);
    expect(validate({ ...VALID, objectiveType: 'CONSUMPTION_AMOUNT', target: 1_000_000 })).toEqual([]);
    expect(validate({ ...VALID, objectiveType: 'CONSUMPTION_AMOUNT', target: 20000.29 })).toEqual([]);
    expect(validate({ ...VALID, objectiveType: 'CONSUMPTION_AMOUNT', target: 0.29 })).toEqual([]);
  });

  it('acepta el mismo mes de inicio y de fin, y días desordenados', () => {
    expect(validate({ ...VALID, endMonth: '2026-11' })).toEqual([]);
    expect(validate({ ...VALID, daysOfWeek: [7, 1, 3] })).toEqual([]);
  });

  it.each([
    ['nombre vacío', { name: '   ' }, 'El nombre es obligatorio.'],
    ['nombre que no es texto', { name: 12 }, 'El nombre es obligatorio.'],
    ['nombre de 81', { name: 'a'.repeat(81) }, 'El nombre no puede superar los 80 caracteres.'],
    ['descripción de 256', { description: 'd'.repeat(256) }, 'La descripción no puede superar los 255 caracteres.'],
    ['tipo de objetivo inválido', { objectiveType: 'VISITS' }, 'Elegí un tipo de objetivo válido.'],
    ['objetivo 0', { target: 0 }, 'Ingresá un objetivo mayor a 0.'],
    ['objetivo negativo', { target: -3 }, 'Ingresá un objetivo mayor a 0.'],
    ['objetivo como texto', { target: '3' }, 'Ingresá un objetivo mayor a 0.'],
    ['cantidad con decimales', { target: 2.5 }, 'Ingresá un número entero.'],
    ['cantidad de más', { target: 101 }, 'El objetivo máximo es 100.'],
    [
      'monto de más',
      { objectiveType: 'CONSUMPTION_AMOUNT', target: 1_000_001 },
      'El objetivo máximo es 1.000.000.',
    ],
    ['monto con 3 decimales', { objectiveType: 'CONSUMPTION_AMOUNT', target: 10.123 }, 'Ingresá un monto con hasta 2 decimales.'],
    ['puntos 0', { rewardPoints: 0 }, 'Ingresá puntos enteros mayores a 0.'],
    ['puntos con decimales', { rewardPoints: 10.5 }, 'Ingresá puntos enteros mayores a 0.'],
    ['puntos de más', { rewardPoints: 100_001 }, 'El máximo es 100.000 puntos.'],
    ['días vacíos', { daysOfWeek: [] }, 'Elegí al menos un día o marcá «Todos los días».'],
    ['día 0', { daysOfWeek: [0] }, 'Los días tienen que ser de 1 (lunes) a 7 (domingo), sin repetir.'],
    ['día 8', { daysOfWeek: [8] }, 'Los días tienen que ser de 1 (lunes) a 7 (domingo), sin repetir.'],
    ['día repetido', { daysOfWeek: [7, 7] }, 'Los días tienen que ser de 1 (lunes) a 7 (domingo), sin repetir.'],
    ['días que no son lista', { daysOfWeek: 7 }, 'Los días tienen que ser de 1 (lunes) a 7 (domingo), sin repetir.'],
    ['solo hora de inicio', { timeTo: null }, 'Completá las dos horas o ninguna.'],
    ['solo hora de fin', { timeFrom: null }, 'Completá las dos horas o ninguna.'],
    ['inicio igual al fin', { timeFrom: '13:00' }, 'La hora de inicio tiene que ser anterior a la de fin.'],
    ['inicio después del fin', { timeFrom: '14:00' }, 'La hora de inicio tiene que ser anterior a la de fin.'],
    ['hora mal escrita', { timeFrom: '9:00' }, 'Ingresá la hora en formato HH:mm.'],
    ['hora 24:00', { timeTo: '24:00' }, 'Ingresá la hora en formato HH:mm.'],
    ['mes de inicio mal escrito', { startMonth: '2026-13' }, 'Ingresá el mes en formato AAAA-MM.'],
    ['mes de inicio con día', { startMonth: '2026-11-01' }, 'Ingresá el mes en formato AAAA-MM.'],
    ['mes de fin mal escrito', { endMonth: '11/2026' }, 'Ingresá el mes en formato AAAA-MM.'],
    ['mes de fin anterior al de inicio', { endMonth: '2026-10' }, 'El mes de fin no puede ser anterior al de inicio.'],
  ])('%s → un solo mensaje', (_case, override, message) => {
    expect(messages({ ...VALID, ...override })).toEqual([message]);
  });

  it.each(['objectiveType', 'target', 'startMonth'] as const)('sin %s → "Completá este campo."', (field) => {
    expect(messages(without(field))).toEqual(['Completá este campo.']);
  });

  it('sin nombre → "El nombre es obligatorio."', () => {
    expect(messages(without('name'))).toEqual(['El nombre es obligatorio.']);
  });

  it.each(['id', 'status', 'phase', 'completedCount', 'pendingChanges', 'createdAt', 'updatedAt', 'deletedAt'])(
    'CA-28.7: %s en el body → rechazado',
    (field) => {
      const errors = validate({ ...VALID, [field]: 'x' });
      expect(errors.map((error) => error.property)).toEqual([field]);
    },
  );
});
