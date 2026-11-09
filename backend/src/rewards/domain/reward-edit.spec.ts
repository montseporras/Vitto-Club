import { DomainError } from './errors/domain.error.js';
import { PAST_EXPIRATION_MESSAGE } from './new-reward.js';
import { planRewardEdit, RewardEditableState } from './reward-edit.js';

const TODAY = '2026-11-08';

const active: RewardEditableState = {
  name: 'Café + medialuna',
  description: null,
  points: 150,
  stock: 20,
  expiresAt: '2026-12-08',
  status: 'ACTIVE',
  disabledReason: null,
};

describe('planRewardEdit() — US-35', () => {
  describe('cambios (CA-35.1, CA-35.2)', () => {
    it('una fila por campo que cambió, en el orden Nombre · Descripción · Puntos · Stock · Vencimiento', () => {
      const plan = planRewardEdit(active, { expiresAt: '2026-12-31', points: 200, name: 'Café + 2 medialunas' }, TODAY);

      expect(plan.changes).toEqual([
        { field: 'name', before: 'Café + medialuna', after: 'Café + 2 medialunas' },
        { field: 'points', before: 150, after: 200 },
        { field: 'expiresAt', before: '2026-12-08', after: '2026-12-31' },
      ]);
      expect(plan.next).toMatchObject({ name: 'Café + 2 medialunas', points: 200, expiresAt: '2026-12-31' });
    });

    it('mismos valores → sin cambios ni cambio de disponibilidad', () => {
      const plan = planRewardEdit(active, { name: ' Café + medialuna ', points: 150, stock: 20, expiresAt: '2026-12-08' }, TODAY);

      expect(plan).toEqual({ changes: [], next: active });
    });

    it('descripción: se recorta y vacía = null ("" sobre null no es un cambio)', () => {
      expect(planRewardEdit(active, { description: '   ' }, TODAY).changes).toEqual([]);
      expect(planRewardEdit(active, { description: ' Con manteca ' }, TODAY).changes).toEqual([
        { field: 'description', before: null, after: 'Con manteca' },
      ]);
    });

    it('stock y fecha a null (sin límite, no vence) son cambios', () => {
      expect(planRewardEdit(active, { stock: null, expiresAt: null }, TODAY).changes).toEqual([
        { field: 'stock', before: 20, after: null },
        { field: 'expiresAt', before: '2026-12-08', after: null },
      ]);
    });
  });

  describe('fecha (CA-35.8)', () => {
    it('fecha anterior a hoy → 400, aunque sea la misma que ya tiene', () => {
      const expired = { ...active, expiresAt: '2026-11-01', status: 'DISABLED' as const, disabledReason: 'EXPIRED' as const };

      expect(() => planRewardEdit(expired, { points: 200, expiresAt: '2026-11-01' }, TODAY)).toThrow(
        new DomainError(PAST_EXPIRATION_MESSAGE, 'expiresAt'),
      );
    });

    it('vence hoy → se acepta', () => {
      expect(planRewardEdit(active, { expiresAt: TODAY }, TODAY).next.expiresAt).toBe(TODAY);
    });
  });

  it('el estado y el motivo no cambian acá: los reevalúa US-37 después de guardar', () => {
    const plan = planRewardEdit(active, { stock: 0 }, TODAY);

    expect(plan.next).toMatchObject({ stock: 0, status: 'ACTIVE', disabledReason: null });
  });
});
