import { CryptoRefreshTokenGenerator } from './crypto-refresh-token-generator.js';

describe('CryptoRefreshTokenGenerator', () => {
  const generator = new CryptoRefreshTokenGenerator();

  it('genera un token y su hash con el formato esperado', () => {
    const { token, hash } = generator.generate();

    // 32 bytes en base64url, sin relleno
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // SHA-256 en hexadecimal: entra en la columna VarChar(64) de sessions.token_hash
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('el hash guardado es el mismo que se calcula al recibir el token', () => {
    const { token, hash } = generator.generate();

    expect(generator.hash(token)).toBe(hash);
  });

  it('nunca guarda el token: el hash es distinto del token', () => {
    const { token, hash } = generator.generate();

    expect(hash).not.toBe(token);
  });

  it('cada token generado es distinto', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generator.generate().token));

    expect(tokens.size).toBe(50);
  });
});
