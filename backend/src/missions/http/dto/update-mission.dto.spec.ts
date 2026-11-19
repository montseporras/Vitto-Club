import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateMissionDto } from './update-mission.dto.js';

const validate = (plain: object) =>
  validateSync(plainToInstance(UpdateMissionDto, plain), { whitelist: true, forbidNonWhitelisted: true });

const messages = (plain: object) => validate(plain).flatMap((error) => Object.values(error.constraints ?? {}));

describe('UpdateMissionDto (§3.1.4)', () => {
  it('todo es opcional: el body vacío lo rechaza el servicio, no el DTO', () => {
    expect(validate({})).toEqual([]);
  });

  it('acepta vaciar lo que se puede: descripción, días, horario, recompensa y mes de fin', () => {
    expect(
      validate({ description: null, daysOfWeek: null, timeFrom: null, timeTo: null, rewardPoints: null, endMonth: null }),
    ).toEqual([]);
  });

  it('una sola hora pasa el DTO: la franja la controla el dominio con la hora guardada', () => {
    expect(validate({ timeTo: '14:00' })).toEqual([]);
  });

  it('un objetivo sin tipo en el body pasa: el máximo lo controla el dominio con el tipo guardado', () => {
    expect(validate({ target: 150 })).toEqual([]);
  });

  it.each([
    ['nombre null', { name: null }, 'El nombre es obligatorio.'],
    ['nombre vacío', { name: '  ' }, 'El nombre es obligatorio.'],
    ['objetivo null', { target: null }, 'Completá este campo.'],
    ['objetivo 0', { target: 0 }, 'Ingresá un objetivo mayor a 0.'],
    ['tipo null', { objectiveType: null }, 'Completá este campo.'],
    ['mes de inicio null', { startMonth: null }, 'Completá este campo.'],
    ['hora mal escrita', { timeTo: '9:00' }, 'Ingresá la hora en formato HH:mm.'],
    ['días vacíos', { daysOfWeek: [] }, 'Elegí al menos un día o marcá «Todos los días».'],
    ['puntos 0', { rewardPoints: 0 }, 'Ingresá puntos enteros mayores a 0.'],
    ['mes de fin mal escrito', { endMonth: '2026-13' }, 'Ingresá el mes en formato AAAA-MM.'],
  ])('%s → un solo mensaje', (_case, body, message) => {
    expect(messages(body)).toEqual([message]);
  });

  it.each(['id', 'status', 'phase', 'pendingChanges', 'completedCount', 'createdAt'])('%s → rechazado', (field) => {
    expect(validate({ [field]: 'x' }).map((error) => error.property)).toEqual([field]);
  });
});
