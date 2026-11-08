import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RewardsAvailabilityService } from '../application/rewards-availability.service.js';
import {
  isRewardsExpirationCronEnabled,
  REWARDS_EXPIRATION_CRON,
  REWARDS_EXPIRATION_TIME_ZONE,
  RewardsExpirationScheduler,
} from './rewards-expiration.scheduler.js';

const configWith = (value: string | undefined) =>
  ({ get: () => value }) as unknown as ConfigService;

const schedulerWith = (run: jest.Mock, value: string | undefined) =>
  new RewardsExpirationScheduler({ runDailyExpiration: run } as unknown as RewardsAvailabilityService, configWith(value));

describe('RewardsExpirationScheduler (US-37)', () => {
  it('CA-37.2: todos los días a las 00:05, en hora de Argentina', () => {
    expect(REWARDS_EXPIRATION_CRON).toBe('5 0 * * *');
    expect(REWARDS_EXPIRATION_TIME_ZONE).toBe('America/Argentina/Cordoba');
  });

  it('CA-37.7: REWARDS_EXPIRATION_CRON_ENABLED=false lo apaga; sin la variable queda prendido', () => {
    expect(isRewardsExpirationCronEnabled(configWith('false'))).toBe(false);
    expect(isRewardsExpirationCronEnabled(configWith(' FALSE '))).toBe(false);
    expect(isRewardsExpirationCronEnabled(configWith('true'))).toBe(true);
    expect(isRewardsExpirationCronEnabled(configWith(undefined))).toBe(true);
  });

  it('apagado no corre ni en el cron ni al iniciar', async () => {
    const run = jest.fn();
    const scheduler = schedulerWith(run, 'false');

    await scheduler.handleCron();
    await scheduler.onApplicationBootstrap();

    expect(run).not.toHaveBeenCalled();
  });

  it('CA-37.4: prendido, corre una vez al iniciar el servidor', async () => {
    const run = jest.fn().mockResolvedValue({ disabled: 0, failures: [] });

    await schedulerWith(run, undefined).onApplicationBootstrap();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('si falla al iniciar, lo deja en el log y el servidor arranca igual', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const run = jest.fn().mockRejectedValue(new Error('la base no responde'));

    await expect(schedulerWith(run, 'true').onApplicationBootstrap()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });
});
