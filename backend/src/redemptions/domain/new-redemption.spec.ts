import { crearCanjeConfirmado } from './new-redemption.js';
import { REDEMPTION_DURATION_MS } from './redemption.js';

describe('crearCanjeConfirmado (US-40)', () => {
  const now = new Date('2026-11-08T15:00:00.000Z');
  const reward = { id: 6, name: 'Medialunas x3', points: 150 };

  it('vence exactamente 15 minutos después de confirmar (CA-40.1)', () => {
    const redemption = crearCanjeConfirmado({ code: 'K7MP2X', customerId: 1, reward, confirmedBy: null, now });

    expect(REDEMPTION_DURATION_MS).toBe(15 * 60 * 1000);
    expect(redemption.createdAt).toEqual(now);
    expect(redemption.expiresAt).toEqual(new Date('2026-11-08T15:15:00.000Z'));
  });

  it('guarda el snapshot del nombre y de los puntos de la recompensa (CA-40.1)', () => {
    const redemption = crearCanjeConfirmado({ code: 'K7MP2X', customerId: 1, reward, confirmedBy: null, now });

    expect(redemption).toMatchObject({ rewardId: 6, rewardName: 'Medialunas x3', points: 150, customerId: 1 });
  });

  it('desde la app: origen APP y sin empleado (CA-40.5)', () => {
    const redemption = crearCanjeConfirmado({ code: 'K7MP2X', customerId: 1, reward, confirmedBy: null, now });

    expect(redemption.origin).toBe('APP');
    expect(redemption.confirmedByAccountId).toBeNull();
    expect(redemption.confirmedByName).toBeNull();
  });

  it('desde la caja: origen COUNTER con el empleado que lo confirmó (CA-40.5)', () => {
    const redemption = crearCanjeConfirmado({
      code: 'K7MP2X',
      customerId: 1,
      reward,
      confirmedBy: { accountId: 4, name: 'Diego Sosa' },
      now,
    });

    expect(redemption.origin).toBe('COUNTER');
    expect(redemption.confirmedByAccountId).toBe(4);
    expect(redemption.confirmedByName).toBe('Diego Sosa');
  });
});
