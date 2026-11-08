import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Redemption, REDEMPTION_DURATION_MS, type RedemptionProps } from '../../domain/redemption.js';
import { RejectRedemptionDto } from './reject-redemption.dto.js';
import { toCustomerRedemptionDto, toEmployeeRedemptionDto } from './redemption-response.dto.js';

async function reasonErrors(reason: unknown): Promise<string[]> {
  const dto = plainToInstance(RejectRedemptionDto, { reason });
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('RejectRedemptionDto (US-43, §3.10.1, CA-43.2)', () => {
  it.each([
    [undefined, 'El motivo es obligatorio.'],
    ['', 'El motivo es obligatorio.'],
    ['    ', 'El motivo es obligatorio.'],
    ['Otro', 'Indicá un motivo de al menos 5 caracteres.'],
    ['  Otro  ', 'Indicá un motivo de al menos 5 caracteres.'],
    ['x'.repeat(501), 'El motivo no puede superar los 500 caracteres.'],
  ])('motivo %p → "%s"', async (reason, message) => {
    expect(await reasonErrors(reason)).toEqual([message]);
  });

  it.each(['Sin insumo', 'El cliente desistió', 'El cliente no está', 'Cinco', 'x'.repeat(500)])(
    'motivo %p es válido',
    async (reason) => {
      expect(await reasonErrors(reason)).toEqual([]);
    },
  );

  it('recorta el motivo antes de guardarlo', () => {
    expect(plainToInstance(RejectRedemptionDto, { reason: '  Sin insumo  ' }).reason).toBe('Sin insumo');
  });
});

describe('Respuesta del canje (§3.6.2)', () => {
  const createdAt = new Date('2026-11-07T15:00:00.000Z');
  const expiresAt = new Date(createdAt.getTime() + REDEMPTION_DURATION_MS);
  const customer = { id: 101, firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI' as const, documentNumber: '38456123' };
  const base = (overrides: Partial<RedemptionProps> = {}) =>
    Redemption.reconstruct({
      id: 1,
      code: 'K7MP2X',
      customerId: 101,
      rewardId: 20,
      rewardName: 'Café + medialuna',
      points: 150,
      status: 'CONFIRMED',
      origin: 'COUNTER',
      confirmedByAccountId: 12,
      confirmedByName: 'Bruno Pérez',
      createdAt,
      expiresAt,
      resolvedAt: null,
      resolvedByAccountId: null,
      resolvedByName: null,
      rejectionReason: null,
      balanceBefore: null,
      balanceAfter: null,
      ...overrides,
    });

  it('vista del empleado: todos los campos, con el empleado que rechazó', () => {
    const resolvedAt = new Date(createdAt.getTime() + 60_000);
    const dto = toEmployeeRedemptionDto(
      base({ status: 'REJECTED', resolvedAt, resolvedByAccountId: 12, resolvedByName: 'Bruno Pérez', rejectionReason: 'Sin insumo' }),
      customer,
    );

    expect(dto).toEqual({
      id: 1,
      code: 'K7MP2X',
      createdAt: '2026-11-07T15:00:00.000Z',
      expiresAt: '2026-11-07T15:15:00.000Z',
      status: 'REJECTED',
      reward: { id: 20, name: 'Café + medialuna', points: 150 },
      customer,
      origin: 'COUNTER',
      confirmedBy: { accountId: 12, name: 'Bruno Pérez' },
      resolvedAt: '2026-11-07T15:01:00.000Z',
      resolvedBy: { actorType: 'EMPLOYEE', accountId: 12, name: 'Bruno Pérez' },
      rejectionReason: 'Sin insumo',
      balanceBefore: null,
      balanceAfter: null,
    });
  });

  it('vista del empleado: el Sistema como resolvedBy y confirmedBy null desde la app', () => {
    const dto = toEmployeeRedemptionDto(
      base({
        origin: 'APP',
        confirmedByAccountId: null,
        confirmedByName: null,
        status: 'REJECTED',
        resolvedAt: createdAt,
        resolvedByName: 'Sistema',
        rejectionReason: 'Recompensa desactivada',
      }),
      customer,
    );

    expect(dto.confirmedBy).toBeNull();
    expect(dto.resolvedBy).toEqual({ actorType: 'SYSTEM', accountId: null, name: 'Sistema' });
  });

  it('vista del Cliente: sin datos de empleados ni del cliente; canCancel solo si está Confirmado y vigente', () => {
    const cancelled = toCustomerRedemptionDto(base({ status: 'CANCELLED', resolvedAt: createdAt }), createdAt);

    expect(cancelled).toEqual({
      id: 1,
      code: 'K7MP2X',
      createdAt: '2026-11-07T15:00:00.000Z',
      expiresAt: '2026-11-07T15:15:00.000Z',
      status: 'CANCELLED',
      reward: { id: 20, name: 'Café + medialuna', points: 150 },
      resolvedAt: '2026-11-07T15:00:00.000Z',
      rejectionReason: null,
      canCancel: false,
    });
    expect(toCustomerRedemptionDto(base(), createdAt).canCancel).toBe(true);
    expect(toCustomerRedemptionDto(base(), expiresAt).canCancel).toBe(false);
  });
});
