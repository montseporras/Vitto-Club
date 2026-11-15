import {
  formatMissionCondition,
  formatMissionObjective,
  formatMissionReward,
  formatMissionValidity,
  missionCreatedEntry,
} from './audit-entries.js';
import { assertValidAuditEntry, type AuditActor } from './audit-entry.js';

const admin: AuditActor = { type: 'EMPLOYEE', accountId: 1 };

describe('textos de las misiones (§3.1.2 y §3.14.2)', () => {
  it.each([
    ['CONSUMPTION_COUNT', 3, '3 consumos'],
    ['CONSUMPTION_COUNT', 1, '1 consumo'],
    ['CONSUMPTION_AMOUNT', 20000, '$ 20.000 en consumos'],
    ['CONSUMPTION_AMOUNT', 1500.5, '$ 1.500,5 en consumos'],
  ] as const)('objetivo %s %d → "%s"', (type, target, text) => {
    expect(formatMissionObjective(type, target)).toBe(text);
  });

  it.each([
    [null, null, null, 'Todos los días'],
    [[7], null, null, 'los domingos'],
    [[7], '09:00', '13:00', 'los domingos de 09:00 a 13:00'],
    [[1, 3], null, null, 'los lunes y miércoles'],
    [[1, 3, 7], null, null, 'los lunes, miércoles y domingos'],
    [[6], null, null, 'los sábados'],
    [null, '09:00', '13:00', 'Todos los días de 09:00 a 13:00'],
  ])('condición %j %s–%s → "%s"', (days, from, to, text) => {
    expect(formatMissionCondition(days, from, to)).toBe(text);
  });

  it('recompensa: "50 pts", "1.500 pts" o "Sin recompensa"', () => {
    expect(formatMissionReward(50)).toBe('50 pts');
    expect(formatMissionReward(1500)).toBe('1.500 pts');
    expect(formatMissionReward(null)).toBe('Sin recompensa');
  });

  it('vigencia: "Noviembre 2026 – Diciembre 2026" o "Desde noviembre 2026"', () => {
    expect(formatMissionValidity('2026-11', '2026-12')).toBe('Noviembre 2026 – Diciembre 2026');
    expect(formatMissionValidity('2026-11', null)).toBe('Desde noviembre 2026');
  });
});

describe('missionCreatedEntry() — US-28', () => {
  it('MISSION_CREATED en MISSIONS, sin cliente ni código, con Objetivo · Condición · Recompensa · Vigencia', () => {
    const entry = missionCreatedEntry(admin, {
      name: 'Vení 3 veces',
      objectiveType: 'CONSUMPTION_COUNT',
      target: 3,
      daysOfWeek: [7],
      timeFrom: '09:00',
      timeTo: '13:00',
      rewardPoints: 50,
      startMonth: '2026-11',
      endMonth: null,
    });

    expect(entry).toEqual({
      actor: admin,
      module: 'MISSIONS',
      action: 'MISSION_CREATED',
      description: 'Creó la misión "Vení 3 veces"',
      details: [
        { label: 'Objetivo', value: '3 consumos' },
        { label: 'Condición', value: 'los domingos de 09:00 a 13:00' },
        { label: 'Recompensa', value: '50 pts' },
        { label: 'Vigencia', value: 'Desde noviembre 2026' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});
