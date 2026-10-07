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

  it('acepta 72 bytes, aunque sean menos de 64 caracteres', () => {
    // 36 letras con tilde = 72 bytes
    expect(Password.create('á'.repeat(36)).getValue()).toBe('á'.repeat(36));
  });

  it('rechaza más de 72 bytes aunque no llegue a 64 caracteres: bcrypt descartaría el resto', () => {
    // 37 letras con tilde = 74 bytes, y solo 37 caracteres
    expect(() => Password.create('á'.repeat(37))).toThrow(DomainError);
    expect(() => Password.create('á'.repeat(37))).toThrow(/72 bytes/);
  });
});
