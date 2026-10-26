import { ConfigService } from '@nestjs/config';
import type { PointsExpirationService } from '../application/points-expiration.service.js';
import {
  isPointsExpirationCronEnabled,
  POINTS_EXPIRATION_CRON,
  POINTS_EXPIRATION_TIME_ZONE,
  PointsExpirationScheduler,
} from './points-expiration.scheduler.js';

const configWith = (value: string | undefined) =>
  ({ get: () => value }) as unknown as ConfigService;

describe('PointsExpirationScheduler (US-25)', () => {
  it('CA-25.1: corre a las 00:05 todos los días, en hora de Argentina', () => {
    expect(POINTS_EXPIRATION_CRON).toBe('5 0 * * *');
    expect(POINTS_EXPIRATION_TIME_ZONE).toBe('America/Argentina/Cordoba');
  });

  it('CA-25.6: POINTS_EXPIRATION_CRON_ENABLED=false lo apaga; sin la variable queda prendido', () => {
    expect(isPointsExpirationCronEnabled(configWith('false'))).toBe(false);
    expect(isPointsExpirationCronEnabled(configWith(' FALSE '))).toBe(false);
    expect(isPointsExpirationCronEnabled(configWith('true'))).toBe(true);
    expect(isPointsExpirationCronEnabled(configWith(undefined))).toBe(true);
  });

  it('con la variable apagada no corre el proceso', async () => {
    const run = jest.fn();
    const scheduler = new PointsExpirationScheduler(
      { run } as unknown as PointsExpirationService,
      configWith('false'),
    );

    await scheduler.handleCron();

    expect(run).not.toHaveBeenCalled();
  });

  it('prendido, corre el proceso', async () => {
    const run = jest.fn().mockResolvedValue({ expiredLots: 0, expiredPoints: 0, failures: [] });
    const scheduler = new PointsExpirationScheduler(
      { run } as unknown as PointsExpirationService,
      configWith('true'),
    );

    await scheduler.handleCron();

    expect(run).toHaveBeenCalledTimes(1);
  });
});
