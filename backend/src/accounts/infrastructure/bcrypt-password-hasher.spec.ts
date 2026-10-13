import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { BcryptPasswordHasher } from './bcrypt-password-hasher.js';

const hasherWith = (env: Record<string, string>) =>
  new BcryptPasswordHasher({ get: (key: string) => env[key] } as unknown as ConfigService);

// Costo 4: el mínimo, para que los tests no sean lentos
const hasher = hasherWith({ BCRYPT_COST: '4' });

describe('BcryptPasswordHasher', () => {
  it('genera un hash bcrypt que no contiene la contraseña', async () => {
    const hash = await hasher.hash('clave-de-ana');

    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(hash).toHaveLength(60);
    expect(hash).not.toContain('clave-de-ana');
  });

  it('verifica la contraseña correcta y rechaza una incorrecta', async () => {
    const hash = await hasher.hash('clave-de-ana');

    expect(await hasher.verify('clave-de-ana', hash)).toBe(true);
    expect(await hasher.verify('otra-clave', hash)).toBe(false);
  });

  it('distingue mayúsculas: la contraseña se compara tal cual', async () => {
    const hash = await hasher.hash('Clave-De-Ana');

    expect(await hasher.verify('clave-de-ana', hash)).toBe(false);
  });

  it('la misma contraseña da hashes distintos (cada uno lleva su propia sal) y los dos verifican', async () => {
    const first = await hasher.hash('clave-de-ana');
    const second = await hasher.hash('clave-de-ana');

    expect(first).not.toBe(second);
    expect(await hasher.verify('clave-de-ana', first)).toBe(true);
    expect(await hasher.verify('clave-de-ana', second)).toBe(true);
  });

  it('verifica hashes generados por otra instancia de bcryptjs, como los del seed', async () => {
    const seedHash = await bcrypt.hash('vitto-admin-dev', 4);

    expect(await hasher.verify('vitto-admin-dev', seedHash)).toBe(true);
  });

  it('un hash guardado que no es de bcrypt no verifica ni tira error', async () => {
    expect(await hasher.verify('clave-de-ana', 'x')).toBe(false);
    expect(await hasher.verify('clave-de-ana', '')).toBe(false);
  });

  it('usa el costo 10 si no hay variable de entorno', async () => {
    const hash = await hasherWith({}).hash('clave-de-ana');

    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('no arranca con un costo inválido', () => {
    expect(() => hasherWith({ BCRYPT_COST: '3' })).toThrow('BCRYPT_COST');
    expect(() => hasherWith({ BCRYPT_COST: '16' })).toThrow('BCRYPT_COST');
    expect(() => hasherWith({ BCRYPT_COST: 'diez' })).toThrow('BCRYPT_COST');
  });
});
