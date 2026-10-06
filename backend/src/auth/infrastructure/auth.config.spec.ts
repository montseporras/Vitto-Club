import { ConfigService } from '@nestjs/config';
import { AuthConfig } from './auth.config.js';

const SECRET = 'a'.repeat(32);

const configWith = (env: Record<string, string>) =>
  new AuthConfig({ get: (key: string) => env[key] } as unknown as ConfigService);

describe('AuthConfig', () => {
  it('usa los valores acordados cuando solo está el secreto', () => {
    const config = configWith({ JWT_SECRET: SECRET });

    expect(config.jwtSecret).toBe(SECRET);
    expect(config.accessTokenTtlSeconds).toBe(900);
    expect(config.forRole('CASHIER')).toEqual({ inactivityMs: 1_800_000, absoluteMs: 43_200_000 });
    expect(config.forRole('CUSTOMER')).toEqual({ inactivityMs: 604_800_000, absoluteMs: 2_592_000_000 });
  });

  it('Cajero y Administrador comparten los mismos plazos', () => {
    const config = configWith({ JWT_SECRET: SECRET });

    expect(config.forRole('ADMIN')).toEqual(config.forRole('CASHIER'));
  });

  it('toma los plazos de las variables de entorno (para bajarlos en una demo)', () => {
    const config = configWith({
      JWT_SECRET: SECRET,
      JWT_ACCESS_TTL_SECONDS: '10',
      SESSION_EMPLOYEE_INACTIVITY_SECONDS: '20',
      SESSION_EMPLOYEE_ABSOLUTE_SECONDS: '60',
    });

    expect(config.accessTokenTtlSeconds).toBe(10);
    expect(config.forRole('ADMIN')).toEqual({ inactivityMs: 20_000, absoluteMs: 60_000 });
  });

  it('no arranca sin secreto', () => {
    expect(() => configWith({})).toThrow('JWT_SECRET');
  });

  it('no arranca con un secreto corto', () => {
    expect(() => configWith({ JWT_SECRET: 'corto' })).toThrow('JWT_SECRET');
  });

  it('no arranca con un plazo inválido', () => {
    expect(() => configWith({ JWT_SECRET: SECRET, JWT_ACCESS_TTL_SECONDS: 'quince' })).toThrow(
      'JWT_ACCESS_TTL_SECONDS',
    );
    expect(() => configWith({ JWT_SECRET: SECRET, SESSION_CUSTOMER_ABSOLUTE_SECONDS: '0' })).toThrow(
      'SESSION_CUSTOMER_ABSOLUTE_SECONDS',
    );
  });

  it('la cookie exige HTTPS solo en producción', () => {
    expect(configWith({ JWT_SECRET: SECRET }).cookieSecure).toBe(false);
    expect(configWith({ JWT_SECRET: SECRET, NODE_ENV: 'production' }).cookieSecure).toBe(true);
  });
});
