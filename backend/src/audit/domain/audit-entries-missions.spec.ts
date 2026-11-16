import {
  formatMissionCondition,
  formatMissionObjective,
  formatMissionReward,
  formatMissionValidity,
  missionCreatedEntry,
  missionCompletedEntry,
  missionDeletedEntry,
  missionRewardClaimedEntry,
  missionUpdatedEntry,
  type MissionAuditEditSnapshot,
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

const snapshot: MissionAuditEditSnapshot = {
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
};

describe('missionUpdatedEntry() — US-29', () => {
  it('una fila por campo que cambió, en orden, y "Rige desde" al final; description con el nombre nuevo', () => {
    const entry = missionUpdatedEntry(
      admin,
      snapshot,
      {
        ...snapshot,
        name: 'Vení 5 veces',
        description: 'Cinco consumos.',
        target: 5,
        daysOfWeek: [7],
        rewardPoints: null,
        endMonth: '2026-12',
      },
      '2026-12',
    );

    expect(entry).toEqual({
      actor: admin,
      module: 'MISSIONS',
      action: 'MISSION_UPDATED',
      description: 'Editó la misión "Vení 5 veces"',
      details: [
        { label: 'Nombre', value: 'Vení 3 veces → Vení 5 veces' },
        { label: 'Descripción', value: '— → Cinco consumos.' },
        { label: 'Objetivo', value: '3 consumos → 5 consumos' },
        { label: 'Condición', value: 'Todos los días → los domingos' },
        { label: 'Recompensa', value: '50 pts → Sin recompensa' },
        { label: 'Vigencia', value: 'Desde noviembre 2026 → Noviembre 2026 – Diciembre 2026' },
        { label: 'Rige desde', value: 'Diciembre 2026' },
      ],
    });
    expect(() => assertValidAuditEntry(entry!)).not.toThrow();
  });

  it('sin "Rige desde" si rigió en el momento', () => {
    const entry = missionUpdatedEntry(admin, snapshot, { ...snapshot, target: 4 }, null);
    expect(entry?.details).toEqual([{ label: 'Objetivo', value: '3 consumos → 4 consumos' }]);
  });

  it('sin cambios → null (no se audita)', () => {
    expect(missionUpdatedEntry(admin, snapshot, { ...snapshot }, null)).toBeNull();
  });
});

describe('missionDeletedEntry() — US-29', () => {
  it('"Vencidas" y "Reclamadas automáticamente" solo si n > 0', () => {
    expect(missionDeletedEntry(admin, 'Vení 3 veces', 2, 1)).toEqual({
      actor: admin,
      module: 'MISSIONS',
      action: 'MISSION_DELETED',
      description: 'Dio de baja la misión "Vení 3 veces"',
      details: [
        { label: 'Vencidas', value: '2' },
        { label: 'Reclamadas automáticamente', value: '1' },
      ],
    });
    expect(missionDeletedEntry(admin, 'Vení 3 veces', 0, 0).details).toEqual([]);
    expect(missionDeletedEntry(admin, 'Vení 3 veces', 3, 0).details).toEqual([{ label: 'Vencidas', value: '3' }]);
  });
});

const customer = { id: 7, firstName: 'Martín', lastName: 'Gómez', documentType: 'DNI' as const, documentNumber: '41987654' };

describe('missionCompletedEntry() — US-30', () => {
  it('Sistema, con el cliente afectado: Misión · Objetivo · Período', () => {
    const entry = missionCompletedEntry(customer, { name: 'Vení 3 veces', objectiveType: 'CONSUMPTION_COUNT', target: 3, period: '2026-11' });
    expect(entry).toMatchObject({
      actor: { type: 'SYSTEM' },
      module: 'MISSIONS',
      action: 'MISSION_COMPLETED',
      description: 'Completó la misión "Vení 3 veces" de Martín Gómez',
      affectedCustomer: { customerId: 7, name: 'Martín Gómez', documentType: 'DNI', documentNumber: '41987654' },
      details: [
        { label: 'Misión', value: 'Vení 3 veces' },
        { label: 'Objetivo', value: '3 consumos' },
        { label: 'Período', value: 'Noviembre 2026' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });
});

describe('missionRewardClaimedEntry() — US-31', () => {
  it('siempre Sistema: Misión · Puntos otorgados · Saldo resultante · Reclamada por', () => {
    const entry = missionRewardClaimedEntry(customer, { missionName: 'Vení 3 veces', points: 50, balanceAfter: 1550, claimedBy: 'CUSTOMER' });
    expect(entry).toMatchObject({
      actor: { type: 'SYSTEM' },
      module: 'MISSIONS',
      action: 'MISSION_REWARD_CLAIMED',
      description: 'Reclamó la recompensa de la misión "Vení 3 veces" de Martín Gómez',
      affectedCustomer: { customerId: 7 },
      details: [
        { label: 'Misión', value: 'Vení 3 veces' },
        { label: 'Puntos otorgados', value: '50 pts' },
        { label: 'Saldo resultante', value: '1.550 pts' },
        { label: 'Reclamada por', value: 'Cliente' },
      ],
    });
    expect(() => assertValidAuditEntry(entry)).not.toThrow();
  });

  it('automático; saldo negativo si había deuda', () => {
    const entry = missionRewardClaimedEntry(customer, { missionName: 'X', points: 50, balanceAfter: -350, claimedBy: 'SYSTEM' });
    expect(entry.details).toEqual(
      expect.arrayContaining([
        { label: 'Saldo resultante', value: '-350 pts' },
        { label: 'Reclamada por', value: 'Automático' },
      ]),
    );
  });
});
