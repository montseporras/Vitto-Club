import { DomainError } from './errors/domain.error.js';
import type { Mission } from './mission.js';
import {
  PAST_END_MONTH_MESSAGE,
  planMissionEdit,
  STARTED_MISSION_MESSAGE,
  type MissionEditContext,
} from './mission-edit.js';
import { PAST_START_MONTH_MESSAGE } from './new-mission.js';

const mission: Mission = {
  id: 1,
  name: 'Vení 3 veces',
  description: null,
  objectiveType: 'CONSUMPTION_COUNT',
  target: 3,
  daysOfWeek: null,
  timeFrom: null,
  timeTo: null,
  rewardPoints: 50,
  startMonth: '2026-10',
  endMonth: null,
  pendingChanges: null,
  status: 'ACTIVE',
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  updatedAt: new Date('2026-10-01T12:00:00.000Z'),
};

const free: MissionEditContext = { currentMonth: '2026-11', hasAssignmentsThisMonth: false };
const busy: MissionEditContext = { currentMonth: '2026-11', hasAssignmentsThisMonth: true };

const domainErrorOf = (run: () => unknown): DomainError => {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error;
  }
  throw new Error('no tiró DomainError');
};

describe('planMissionEdit (§3.1.4, S5-20)', () => {
  describe('CA-29.1: sin clientes este mes, todo rige ya', () => {
    it('cambia objetivo, condición y recompensa en el momento, sin pendiente', () => {
      const plan = planMissionEdit(
        mission,
        { target: 5, daysOfWeek: [7, 6], timeFrom: '09:00', timeTo: '13:00', rewardPoints: null },
        free,
      );

      expect(plan.next).toMatchObject({ target: 5, daysOfWeek: [6, 7], timeFrom: '09:00', timeTo: '13:00', rewardPoints: null });
      expect(plan.next.pendingChanges).toBeNull();
      expect(plan.appliesFrom).toBeNull();
      expect(plan.changed).toBe(true);
    });
  });

  describe('CA-29.2: con clientes este mes, el objetivo rige desde el mes siguiente', () => {
    it('deja el vigente igual y guarda el nuevo en pendingChanges con appliesFrom', () => {
      const plan = planMissionEdit(mission, { target: 5, rewardPoints: 80 }, busy);

      expect(plan.next).toMatchObject({ target: 3, rewardPoints: 50 });
      expect(plan.next.pendingChanges).toEqual({
        appliesFrom: '2026-12',
        objectiveType: 'CONSUMPTION_COUNT',
        target: 5,
        daysOfWeek: null,
        timeFrom: null,
        timeTo: null,
        rewardPoints: 80,
      });
      expect(plan.appliesFrom).toBe('2026-12');
      expect(plan.auditBefore).toMatchObject({ target: 3, rewardPoints: 50 });
      expect(plan.auditAfter).toMatchObject({ target: 5, rewardPoints: 80 });
    });

    it('el nombre y la descripción rigen ya, aunque tenga clientes', () => {
      const plan = planMissionEdit(mission, { name: '  Vení 4 veces ', description: '  Nueva ' }, busy);

      expect(plan.next).toMatchObject({ name: 'Vení 4 veces', description: 'Nueva', pendingChanges: null });
      expect(plan.appliesFrom).toBeNull();
    });

    it('se combina con un pendiente anterior y el "antes" de la auditoría es el pendiente', () => {
      const pending = { ...mission, pendingChanges: { appliesFrom: '2026-12', ...mission, target: 5 } };
      const plan = planMissionEdit(pending, { rewardPoints: 80 }, busy);

      expect(plan.next.pendingChanges).toMatchObject({ target: 5, rewardPoints: 80, appliesFrom: '2026-12' });
      expect(plan.auditBefore).toMatchObject({ target: 5, rewardPoints: 50 });
      expect(plan.auditAfter).toMatchObject({ target: 5, rewardPoints: 80 });
    });

    it('si vuelve al objetivo vigente, borra el pendiente', () => {
      const pending = { ...mission, pendingChanges: { appliesFrom: '2026-12', ...mission, target: 5 } };
      const plan = planMissionEdit(pending, { target: 3 }, busy);

      expect(plan.next.pendingChanges).toBeNull();
      expect(plan.appliesFrom).toBeNull();
      expect(plan.changed).toBe(true);
    });

    it('editar solo el nombre conserva el pendiente y appliesFrom es null', () => {
      const pending = { ...mission, pendingChanges: { appliesFrom: '2026-12', ...mission, target: 5 } };
      const plan = planMissionEdit(pending, { name: 'Otra' }, busy);

      expect(plan.next.pendingChanges).toMatchObject({ target: 5 });
      expect(plan.appliesFrom).toBeNull();
    });
  });

  it('sin cambios reales → changed false', () => {
    const plan = planMissionEdit(mission, { target: 3, name: 'Vení 3 veces', endMonth: null }, busy);
    expect(plan.changed).toBe(false);
    expect(plan.appliesFrom).toBeNull();
  });

  it('descripción vacía → null', () => {
    const plan = planMissionEdit({ ...mission, description: 'Algo' }, { description: '   ' }, free);
    expect(plan.next.description).toBeNull();
  });

  describe('reglas con los valores combinados', () => {
    it('cambiar a cantidad con un objetivo de monto con decimales → "Ingresá un número entero." en target', () => {
      const amount = { ...mission, objectiveType: 'CONSUMPTION_AMOUNT' as const, target: 1500.5 };
      const error = domainErrorOf(() => planMissionEdit(amount, { objectiveType: 'CONSUMPTION_COUNT' }, free));
      expect([error.message, error.field]).toEqual(['Ingresá un número entero.', 'target']);
    });

    it('objetivo mayor al máximo del tipo guardado → "El objetivo máximo es 100."', () => {
      const error = domainErrorOf(() => planMissionEdit(mission, { target: 150 }, free));
      expect(error.message).toBe('El objetivo máximo es 100.');
    });

    it('solo una hora, sin horario guardado → "Completá las dos horas o ninguna."', () => {
      const error = domainErrorOf(() => planMissionEdit(mission, { timeFrom: '09:00' }, free));
      expect([error.message, error.field]).toEqual(['Completá las dos horas o ninguna.', 'timeTo']);
    });

    it('cambiar solo la hora de fin con el horario guardado vale; invertida → error', () => {
      const withTime = { ...mission, timeFrom: '09:00', timeTo: '13:00' };
      expect(planMissionEdit(withTime, { timeTo: '14:00' }, free).next.timeTo).toBe('14:00');
      const error = domainErrorOf(() => planMissionEdit(withTime, { timeTo: '08:00' }, free));
      expect(error.message).toBe('La hora de inicio tiene que ser anterior a la de fin.');
    });

    it('quitar el horario: las dos en null', () => {
      const withTime = { ...mission, timeFrom: '09:00', timeTo: '13:00' };
      expect(planMissionEdit(withTime, { timeFrom: null, timeTo: null }, free).next).toMatchObject({
        timeFrom: null,
        timeTo: null,
      });
    });
  });

  describe('CA-29.3: mes de inicio', () => {
    it('ya empezó → "La misión ya empezó: no se puede cambiar el mes de inicio." en startMonth', () => {
      const error = domainErrorOf(() => planMissionEdit(mission, { startMonth: '2026-12' }, free));
      expect([error.message, error.field]).toEqual([STARTED_MISSION_MESSAGE, 'startMonth']);
    });

    it('empieza este mes: ya empezó', () => {
      const error = domainErrorOf(() => planMissionEdit({ ...mission, startMonth: '2026-11' }, { startMonth: '2026-12' }, free));
      expect(error.message).toBe(STARTED_MISSION_MESSAGE);
    });

    it('mandar el mismo mes de inicio de una que ya empezó no es un cambio', () => {
      expect(planMissionEdit(mission, { startMonth: '2026-10' }, free).changed).toBe(false);
    });

    it('no empezó: se puede cambiar, pero no a un mes anterior al actual', () => {
      const upcoming = { ...mission, startMonth: '2027-01' };
      expect(planMissionEdit(upcoming, { startMonth: '2026-12' }, free).next.startMonth).toBe('2026-12');
      const error = domainErrorOf(() => planMissionEdit(upcoming, { startMonth: '2026-10' }, free));
      expect(error.message).toBe(PAST_START_MONTH_MESSAGE);
    });
  });

  describe('mes de fin', () => {
    it('anterior al actual → "El mes de fin no puede ser anterior al mes actual."', () => {
      const error = domainErrorOf(() => planMissionEdit(mission, { endMonth: '2026-10' }, free));
      expect([error.message, error.field]).toEqual([PAST_END_MONTH_MESSAGE, 'endMonth']);
    });

    it('el actual vale; null = se repite', () => {
      expect(planMissionEdit(mission, { endMonth: '2026-11' }, free).next.endMonth).toBe('2026-11');
      expect(planMissionEdit({ ...mission, endMonth: '2026-12' }, { endMonth: null }, free).next.endMonth).toBeNull();
    });

    it('anterior al nuevo mes de inicio → "El mes de fin no puede ser anterior al de inicio."', () => {
      const upcoming = { ...mission, startMonth: '2027-01', endMonth: '2027-02' };
      const error = domainErrorOf(() => planMissionEdit(upcoming, { startMonth: '2027-03' }, free));
      expect(error.message).toBe('El mes de fin no puede ser anterior al de inicio.');
    });
  });
});
