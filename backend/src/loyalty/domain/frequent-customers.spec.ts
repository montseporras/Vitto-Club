import { DomainError } from './errors/domain.error.js';
import {
  assertFrequentMinConsumptions,
  DEFAULT_FREQUENT_MIN_CONSUMPTIONS,
  FREQUENT_MIN_CONSUMPTIONS_MESSAGE,
} from './frequent-customers.js';

describe('assertFrequentMinConsumptions — §3.9.6', () => {
  it('el valor por defecto es 3', () => {
    expect(DEFAULT_FREQUENT_MIN_CONSUMPTIONS).toBe(3);
  });

  it.each([1, 3, 100])('acepta %d', (value) => {
    expect(() => assertFrequentMinConsumptions(value)).not.toThrow();
  });

  it.each([0, 101, -1, 2.5, '3', null, undefined, NaN])('rechaza %p con el mensaje del contrato', (value) => {
    expect(() => assertFrequentMinConsumptions(value)).toThrow(
      new DomainError(FREQUENT_MIN_CONSUMPTIONS_MESSAGE, 'minConsumptions'),
    );
    expect(FREQUENT_MIN_CONSUMPTIONS_MESSAGE).toBe('Ingresá un número entero de 1 a 100.');
  });
});
