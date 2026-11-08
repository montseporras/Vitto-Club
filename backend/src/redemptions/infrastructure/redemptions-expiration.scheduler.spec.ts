import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedemptionsExpirationService } from '../application/redemptions-expiration.service.js';
import {
  isRedemptionsExpirationCronEnabled,
  REDEMPTIONS_EXPIRATION_CRON,
  RedemptionsExpirationScheduler,
} from './redemptions-expiration.scheduler.js';

const configWith = (value: string | undefined) =>
  ({ get: () => value }) as unknown as ConfigService;

const schedulerWith = (run: jest.Mock, value: string | undefined) =>
  new RedemptionsExpirationScheduler({ run } as unknown as RedemptionsExpirationService, configWith(value));

describe('RedemptionsExpirationScheduler (US-44)', () => {
  it('CA-44.3: corre cada 5 minutos', () => {
    expect(REDEMPTIONS_EXPIRATION_CRON).toBe('*/5 * * * *');
  });

  it('CA-44.7: REDEMPTIONS_EXPIRATION_CRON_ENABLED=false lo apaga; sin la variable queda prendido', () => {
    expect(isRedemptionsExpirationCronEnabled(configWith('false'))).toBe(false);
    expect(isRedemptionsExpirationCronEnabled(configWith(' FALSE '))).toBe(false);
    expect(isRedemptionsExpirationCronEnabled(configWith('true'))).toBe(true);
    expect(isRedemptionsExpirationCronEnabled(configWith(undefined))).toBe(true);
  });

  it('con la variable apagada no corre ni en el cron ni al iniciar', async () => {
    const run = jest.fn();
    const scheduler = schedulerWith(run, 'false');

    await scheduler.handleCron();
    await scheduler.onApplicationBootstrap();

    expect(run).not.toHaveBeenCalled();
  });

  it('prendido, corre en el cron', async () => {
    const run = jest.fn().mockResolvedValue({ expired: 0, failures: [] });

    await schedulerWith(run, 'true').handleCron();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('CA-44.3: prendido, corre una vez al iniciar el servidor', async () => {
    const run = jest.fn().mockResolvedValue({ expired: 0, failures: [] });

    await schedulerWith(run, undefined).onApplicationBootstrap();

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('si falla al iniciar, lo deja en el log y no impide que el servidor arranque', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const run = jest.fn().mockRejectedValue(new Error('la base no responde'));

    await expect(schedulerWith(run, 'true').onApplicationBootstrap()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });
});
