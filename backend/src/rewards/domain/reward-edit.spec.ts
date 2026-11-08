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

      expect(plan).toEqual({ changes: [], next: active, availabilityChange: null, enabledFrom: null });
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

  describe('disponibilidad (§3.4)', () => {
    const outOfStock = { ...active, stock: 0, status: 'DISABLED' as const, disabledReason: 'OUT_OF_STOCK' as const };
    const expired = { ...active, expiresAt: '2026-11-01', status: 'DISABLED' as const, disabledReason: 'EXPIRED' as const };

    it('Agotada que repone stock → ACTIVE, ENABLED desde OUT_OF_STOCK (CA-35.5)', () => {
      const plan = planRewardEdit(outOfStock, { stock: 20 }, TODAY);

      expect(plan.next).toMatchObject({ stock: 20, status: 'ACTIVE', disabledReason: null });
      expect(plan).toMatchObject({ availabilityChange: 'ENABLED', enabledFrom: 'OUT_OF_STOCK' });
    });

    it('Agotada que pasa a sin límite → ACTIVE', () => {
      expect(planRewardEdit(outOfStock, { stock: null }, TODAY).availabilityChange).toBe('ENABLED');
    });

    it.each([['2026-12-31'], [null]])('Vencida con fecha nueva (%p) → ACTIVE, ENABLED desde EXPIRED (CA-35.5)', (expiresAt) => {
      const plan = planRewardEdit(expired, { expiresAt }, TODAY);

      expect(plan.next).toMatchObject({ status: 'ACTIVE', disabledReason: null });
      expect(plan).toMatchObject({ availabilityChange: 'ENABLED', enabledFrom: 'EXPIRED' });
    });

    it('Activa que queda con stock 0 → DISABLED / OUT_OF_STOCK (CA-35.6)', () => {
      const plan = planRewardEdit(active, { stock: 0 }, TODAY);

      expect(plan.next).toMatchObject({ stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });
      expect(plan).toMatchObject({ availabilityChange: 'DISABLED', enabledFrom: null });
    });

    it('Activa vencida que todavía no marcó el proceso diario: editar otro campo no la deshabilita', () => {
      const plan = planRewardEdit({ ...active, expiresAt: '2026-11-01' }, { points: 200 }, TODAY);

      expect(plan.next.status).toBe('ACTIVE');
      expect(plan.availabilityChange).toBeNull();
    });

    it('Inactiva no cambia de estado aunque quede sin stock o vuelva a tener (CA-35.7)', () => {
      const inactive = { ...active, status: 'INACTIVE' as const };

      expect(planRewardEdit(inactive, { stock: 0 }, TODAY).next.status).toBe('INACTIVE');
      expect(planRewardEdit({ ...inactive, stock: 0 }, { stock: 5 }, TODAY)).toMatchObject({
        next: { status: 'INACTIVE', disabledReason: null },
        availabilityChange: null,
      });
    });

    it('Agotada que repone stock pero ya venció → sigue DISABLED con motivo EXPIRED, sin cambio que avisar', () => {
      const plan = planRewardEdit({ ...outOfStock, expiresAt: '2026-11-05' }, { stock: 10 }, TODAY);

      expect(plan.next).toMatchObject({ stock: 10, status: 'DISABLED', disabledReason: 'EXPIRED' });
      expect(plan.availabilityChange).toBeNull();
    });

    it('Vencida con fecha nueva pero stock 0 → sigue DISABLED con motivo OUT_OF_STOCK', () => {
      const plan = planRewardEdit(expired, { expiresAt: '2026-12-31', stock: 0 }, TODAY);

      expect(plan.next).toMatchObject({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });
      expect(plan.availabilityChange).toBeNull();
    });

    it('si el motivo de antes sigue valiendo, se conserva', () => {
      const both = { ...outOfStock, expiresAt: '2026-11-05' };

      expect(planRewardEdit(both, { points: 300 }, TODAY).next.disabledReason).toBe('OUT_OF_STOCK');
    });
  });
});
