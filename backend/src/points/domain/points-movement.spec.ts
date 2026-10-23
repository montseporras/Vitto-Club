import { describeMovement, formatConsumptionCode, PointsMovementRecord, toMovementView } from './points-movement.js';

const baseRecord = (overrides: Partial<PointsMovementRecord> = {}): PointsMovementRecord => ({
  id: 10,
  createdAt: new Date('2026-10-16T18:40:00.000Z'),
  customer: { id: 3, firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001' },
  type: 'CONSUMPTION_CREDIT',
  points: 500,
  balanceAfter: 500,
  consumptionId: 131,
  reason: null,
  lot: {
    id: 7,
    accreditedAt: new Date('2026-08-16T15:00:00.000Z'),
    expiresAt: new Date('2027-08-16T15:00:00.000Z'),
    status: 'ACTIVE',
  },
  performedByAccountId: 4,
  performedByName: 'Ana Gómez',
  ...overrides,
});

describe('formatConsumptionCode()', () => {
  it('arma C- con 6 dígitos (§3.3.3)', () => {
    expect(formatConsumptionCode(131)).toBe('C-000131');
    expect(formatConsumptionCode(1234567)).toBe('C-1234567');
  });
});

describe('describeMovement() — CA-26.2', () => {
  it('CONSUMPTION_CREDIT → Consumo C-000131', () => {
    expect(describeMovement(baseRecord())).toBe('Consumo C-000131');
  });

  it('VOID_REVERSAL → Anulación de C-000131', () => {
    expect(describeMovement(baseRecord({ type: 'VOID_REVERSAL', points: -500 }))).toBe('Anulación de C-000131');
  });

  it('MANUAL_ADJUSTMENT → Ajuste: {motivo}', () => {
    const record = baseRecord({ type: 'MANUAL_ADJUSTMENT', consumptionId: null, reason: 'Regularización de saldo' });
    expect(describeMovement(record)).toBe('Ajuste: Regularización de saldo');
  });

  it('EXPIRATION → Vencimiento de lote del {fecha de acreditación} en hora de Argentina', () => {
    const record = baseRecord({ type: 'EXPIRATION', consumptionId: null, points: -200 });
    expect(describeMovement(record)).toBe('Vencimiento de lote del 16/08/2026');
  });

  it('la fecha del lote se toma en hora de Argentina (02:00 UTC del 17 = 16 en Argentina)', () => {
    const record = baseRecord({
      type: 'EXPIRATION',
      consumptionId: null,
      lot: {
        id: 7,
        accreditedAt: new Date('2026-08-17T02:00:00.000Z'),
        expiresAt: new Date('2027-08-17T02:00:00.000Z'),
        status: 'EXPIRED',
      },
    });
    expect(describeMovement(record)).toBe('Vencimiento de lote del 16/08/2026');
  });

  it('REDEMPTION no existe hasta el Sprint 4', () => {
    expect(() => describeMovement(baseRecord({ type: 'REDEMPTION', consumptionId: null }))).toThrow();
  });
});

describe('toMovementView() — CA-26.3', () => {
  it('crédito: lote con status y expiresAt en YYYY-MM-DD, consumptionCode, sin reason, empleado', () => {
    const view = toMovementView(baseRecord());

    expect(view.lot).toEqual({
      id: 7,
      accreditedAt: new Date('2026-08-16T15:00:00.000Z'),
      expiresAt: '2027-08-16',
      status: 'ACTIVE',
    });
    expect(view.consumptionCode).toBe('C-000131');
    expect(view.reason).toBeNull();
    expect(view.performedBy).toEqual({ actorType: 'EMPLOYEE', accountId: 4, name: 'Ana Gómez' });
  });

  it('reversión: sin lote aunque la base lo tenga (decisión: lot null), con consumptionCode', () => {
    const view = toMovementView(baseRecord({ type: 'VOID_REVERSAL', points: -500 }));

    expect(view.lot).toBeNull();
    expect(view.consumptionCode).toBe('C-000131');
  });

  it('ajuste ADD con lote: lot y reason, sin consumptionCode', () => {
    const view = toMovementView(
      baseRecord({ type: 'MANUAL_ADJUSTMENT', consumptionId: null, reason: 'Compensación' }),
    );

    expect(view.lot?.id).toBe(7);
    expect(view.reason).toBe('Compensación');
    expect(view.consumptionCode).toBeNull();
  });

  it('ajuste SUBTRACT: sin lote', () => {
    const view = toMovementView(
      baseRecord({ type: 'MANUAL_ADJUSTMENT', consumptionId: null, reason: 'Corrección', lot: null, points: -50 }),
    );

    expect(view.lot).toBeNull();
  });

  it('Sistema: actorType SYSTEM, accountId null y name "Sistema"', () => {
    const view = toMovementView(
      baseRecord({ type: 'EXPIRATION', consumptionId: null, performedByAccountId: null, performedByName: 'Sistema' }),
    );

    expect(view.performedBy).toEqual({ actorType: 'SYSTEM', accountId: null, name: 'Sistema' });
    expect(view.consumptionCode).toBeNull();
    expect(view.lot?.id).toBe(7);
  });
});
