import type { Mission } from './mission.js';
import { advanceProgress, incrementFor, meetsCondition, revertProgress, snapshotForMonth } from './mission-progress.js';

const anyDay = { daysOfWeek: null, timeFrom: null, timeTo: null };

describe('meetsCondition (§3.2)', () => {
  it('sin condición, cualquier día y hora', () => {
    expect(meetsCondition(anyDay, 3, '23:59')).toBe(true);
  });

  it('días: solo los elegidos', () => {
    expect(meetsCondition({ ...anyDay, daysOfWeek: [7] }, 7, '10:00')).toBe(true);
    expect(meetsCondition({ ...anyDay, daysOfWeek: [7] }, 6, '10:00')).toBe(false);
  });

  it('franja [desde, hasta): 09:00 cuenta, 13:00 no', () => {
    const range = { ...anyDay, timeFrom: '09:00', timeTo: '13:00' };
    expect(meetsCondition(range, 1, '09:00')).toBe(true);
    expect(meetsCondition(range, 1, '12:59')).toBe(true);
    expect(meetsCondition(range, 1, '13:00')).toBe(false);
    expect(meetsCondition(range, 1, '08:59')).toBe(false);
  });

  it('día y franja combinados: los dos tienen que cumplirse', () => {
    const both = { daysOfWeek: [7], timeFrom: '09:00', timeTo: '13:00' };
    expect(meetsCondition(both, 7, '10:00')).toBe(true);
    expect(meetsCondition(both, 7, '14:00')).toBe(false);
    expect(meetsCondition(both, 1, '10:00')).toBe(false);
  });
});

describe('avance (§3.2)', () => {
  it('cantidad suma 1; monto suma el monto', () => {
    expect(incrementFor('CONSUMPTION_COUNT', 1550)).toBe(1);
    expect(incrementFor('CONSUMPTION_AMOUNT', 1550.5)).toBe(1550.5);
  });

  it('suma y completa al llegar al objetivo', () => {
    expect(advanceProgress(1, 3, 1)).toEqual({ progress: 2, completed: false });
    expect(advanceProgress(2, 3, 1)).toEqual({ progress: 3, completed: true });
  });

  it('el progreso nunca pasa el objetivo', () => {
    expect(advanceProgress(15000, 20000, 8000)).toEqual({ progress: 20000, completed: true });
  });

  it('montos con 2 decimales, sin errores de coma flotante', () => {
    expect(advanceProgress(0.1, 100, 0.2).progress).toBe(0.3);
  });

  it('anular resta lo sumado, sin bajar de 0', () => {
    expect(revertProgress(2, 1)).toBe(1);
    expect(revertProgress(500, 800)).toBe(0);
    expect(revertProgress(0.3, 0.1)).toBe(0.2);
  });
});

describe('snapshotForMonth (S5-20)', () => {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const pending = { ...mission, pendingChanges: { appliesFrom: '2026-12', ...mission, target: 5, rewardPoints: 80 } };

  it('sin pendiente: el objetivo vigente', () => {
    expect(snapshotForMonth(mission, '2026-11')).toMatchObject({ target: 3, rewardPoints: 50 });
  });

  it('pendiente que rige más adelante: el vigente', () => {
    expect(snapshotForMonth(pending, '2026-11')).toMatchObject({ target: 3, rewardPoints: 50 });
  });

  it('pendiente que ya rige: el pendiente', () => {
    expect(snapshotForMonth(pending, '2026-12')).toMatchObject({ target: 5, rewardPoints: 80 });
    expect(snapshotForMonth(pending, '2027-01')).toMatchObject({ target: 5, rewardPoints: 80 });
  });
});
