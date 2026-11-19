import { ConfigService } from '@nestjs/config';
import { MissionsExpirationService } from '../application/missions-expiration.service.js';
import {
  isMissionsExpirationCronEnabled,
  MISSIONS_EXPIRATION_CRON,
  MISSIONS_EXPIRATION_TIME_ZONE,
  MissionsExpirationScheduler,
} from './missions-expiration.scheduler.js';

const configWith = (value: string | undefined) => ({ get: () => value }) as unknown as ConfigService;

describe('MissionsExpirationScheduler (CA-32.1)', () => {
  it('el día 1 a las 00:10, hora de Argentina', () => {
    expect(MISSIONS_EXPIRATION_CRON).toBe('10 0 1 * *');
    expect(MISSIONS_EXPIRATION_TIME_ZONE).toBe('America/Argentina/Cordoba');
  });

  it.each([
    [undefined, true],
    ['true', true],
    ['false', false],
    [' FALSE ', false],
  ])('MISSIONS_EXPIRATION_CRON_ENABLED=%s → %s', (value, enabled) => {
    expect(isMissionsExpirationCronEnabled(configWith(value))).toBe(enabled);
  });

  it('corre al iniciar si está prendido, y no si está apagado', async () => {
    const expiration = { run: jest.fn().mockResolvedValue(undefined) };

    await new MissionsExpirationScheduler(expiration as unknown as MissionsExpirationService, configWith(undefined)).onApplicationBootstrap();
    expect(expiration.run).toHaveBeenCalledTimes(1);

    await new MissionsExpirationScheduler(expiration as unknown as MissionsExpirationService, configWith('false')).onApplicationBootstrap();
    expect(expiration.run).toHaveBeenCalledTimes(1);
  });

  it('si falla al iniciar, el servidor arranca igual', async () => {
    const expiration = { run: jest.fn().mockRejectedValue(new Error('falla')) };
    const scheduler = new MissionsExpirationScheduler(expiration as unknown as MissionsExpirationService, configWith(undefined));

    await expect(scheduler.onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
