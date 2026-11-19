import { DomainError } from './errors/domain.error.js';
import { buildNewMission, PAST_START_MONTH_MESSAGE, type NewMissionInput } from './new-mission.js';

const base: NewMissionInput = {
  name: 'Vení 3 veces',
  objectiveType: 'CONSUMPTION_COUNT',
  target: 3,
  rewardPoints: 50,
  startMonth: '2026-11',
};

describe('buildNewMission (§3.1.3)', () => {
  it('lo que no vino queda en null: todos los días, sin horario, sin mes de fin', () => {
    expect(buildNewMission(base, '2026-11')).toEqual({
      name: 'Vení 3 veces',
      description: null,
      objectiveType: 'CONSUMPTION_COUNT',
      target: 3,
      daysOfWeek: null,
      timeFrom: null,
      timeTo: null,
      rewardPoints: 50,
      startMonth: '2026-11',
      endMonth: null,
    });
  });

  it('sin recompensa: rewardPoints null', () => {
    expect(buildNewMission({ ...base, rewardPoints: null }, '2026-11').rewardPoints).toBeNull();
  });

  it('recorta el nombre y la descripción; descripción vacía → null', () => {
    const mission = buildNewMission({ ...base, name: '  Vení 3 veces  ', description: '   ' }, '2026-11');
    expect(mission.name).toBe('Vení 3 veces');
    expect(mission.description).toBeNull();
  });

  it('ordena los días de lunes a domingo', () => {
    expect(buildNewMission({ ...base, daysOfWeek: [7, 1, 3] }, '2026-11').daysOfWeek).toEqual([1, 3, 7]);
  });

  it('el mes de inicio puede ser el actual o uno posterior', () => {
    expect(buildNewMission({ ...base, startMonth: '2026-11' }, '2026-11').startMonth).toBe('2026-11');
    expect(buildNewMission({ ...base, startMonth: '2027-01' }, '2026-11').startMonth).toBe('2027-01');
  });

  it('mes de inicio anterior al actual → DomainError en startMonth', () => {
    const build = () => buildNewMission({ ...base, startMonth: '2026-10' }, '2026-11');
    expect(build).toThrow(DomainError);
    expect(build).toThrow(PAST_START_MONTH_MESSAGE);
    try {
      build();
    } catch (error) {
      expect((error as DomainError).field).toBe('startMonth');
    }
  });
});
