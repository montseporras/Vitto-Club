import { DomainError } from './errors/domain.error.js';
import { buildNewReward, daysToExpire, PAST_EXPIRATION_MESSAGE } from './new-reward.js';

const TODAY = '2026-11-08';

describe('buildNewReward() — US-34', () => {
  const input = { name: 'Café + medialuna', description: 'Café chico', points: 150, stock: 20, expiresAt: '2026-12-08' };

  it('recorta el nombre y la descripción', () => {
    expect(buildNewReward({ ...input, name: '  Café + medialuna  ', description: '  Café chico ' }, TODAY)).toEqual({
      name: 'Café + medialuna',
      description: 'Café chico',
      points: 150,
      stock: 20,
      expiresAt: '2026-12-08',
    });
  });

  it.each([undefined, null, '', '   '])('descripción %p → null', (description) => {
    expect(buildNewReward({ ...input, description }, TODAY).description).toBeNull();
  });

  it('sin límite de stock y sin vencimiento: null en los dos (CA-34.3)', () => {
    const reward = buildNewReward({ ...input, stock: null, expiresAt: null }, TODAY);
    expect(reward.stock).toBeNull();
    expect(reward.expiresAt).toBeNull();
  });

  it('vence hoy → se acepta', () => {
    expect(buildNewReward({ ...input, expiresAt: TODAY }, TODAY).expiresAt).toBe(TODAY);
  });

  it('fecha anterior a hoy → "La fecha no puede ser anterior a hoy." (CA-34.4)', () => {
    expect(() => buildNewReward({ ...input, expiresAt: '2026-11-07' }, TODAY)).toThrow(
      new DomainError(PAST_EXPIRATION_MESSAGE, 'expiresAt'),
    );
  });
});

describe('daysToExpire() — §3.1', () => {
  it('no vence → null', () => {
    expect(daysToExpire(null, TODAY)).toBeNull();
  });

  it('vence hoy → 0; en 30 días → 30', () => {
    expect(daysToExpire(TODAY, TODAY)).toBe(0);
    expect(daysToExpire('2026-12-08', TODAY)).toBe(30);
  });

  it('venció ayer → -1', () => {
    expect(daysToExpire('2026-11-07', TODAY)).toBe(-1);
  });
});
