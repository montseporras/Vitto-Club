import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ConfirmRedemptionDto } from './confirm-redemption.dto.js';

// Mismas opciones que el ValidationPipe global de main.ts. Devuelve los mensajes, como el pipe
const messagesOf = (plain: object) =>
  validateSync(plainToInstance(ConfirmRedemptionDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).flatMap((error) => Object.values(error.constraints ?? {}));

describe('ConfirmRedemptionDto (CA-40.11, §3.7.1 paso 1)', () => {
  it('acepta un rewardId entero >= 1', () => {
    expect(messagesOf({ rewardId: 6 })).toEqual([]);
    expect(messagesOf({ rewardId: 1 })).toEqual([]);
  });

  it.each([{}, { rewardId: null }])('si falta, responde "Completá este campo." (una sola vez): %j', (body) => {
    expect(messagesOf(body)).toEqual(['Completá este campo.']);
  });

  it.each([0, -3, 2.5, '6', 'abc', true])(
    'si no es un entero >= 1, responde "Ingresá un número entero mayor a 0." (una sola vez): %j',
    (rewardId) => {
      expect(messagesOf({ rewardId })).toEqual(['Ingresá un número entero mayor a 0.']);
    },
  );

  it('rechaza customerId en el body (CA-40.10)', () => {
    expect(messagesOf({ rewardId: 6, customerId: 1 })).toEqual(['property customerId should not exist']);
  });
});
