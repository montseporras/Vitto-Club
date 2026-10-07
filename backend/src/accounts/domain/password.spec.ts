import { Password } from './password.js';
import { DomainError } from './errors/domain.error.js';

describe('Password', () => {
  it('acepta una contraseña de 8 caracteres (mínimo)', () => {
    expect(Password.create('a'.repeat(8)).getValue()).toBe('a'.repeat(8));
  });

  it('acepta una contraseña de 64 caracteres (máximo)', () => {
    expect(Password.create('a'.repeat(64)).getValue()).toBe('a'.repeat(64));
  });

  it('rechaza una contraseña vacía', () => {
    expect(() => Password.create('')).toThrow(DomainError);
  });

  it('rechaza una contraseña de menos de 8 caracteres', () => {
    expect(() => Password.create('a'.repeat(7))).toThrow(DomainError);
    expect(() => Password.create('a'.repeat(7))).toThrow(/at least 8/);
  });

  it('rechaza una contraseña de más de 64 caracteres', () => {
    expect(() => Password.create('a'.repeat(65))).toThrow(DomainError);
    expect(() => Password.create('a'.repeat(65))).toThrow(/exceed 64/);
  });
});
