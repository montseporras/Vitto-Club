import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { RewardsAvailabilityService } from './rewards/application/rewards-availability.service.js';

// US-37, CA-37.7: corre el proceso diario de recompensas vencidas a demanda, sin endpoint HTTP y
// sin levantar el servidor. Se usa con `npm run rewards:expire` (compila y ejecuta este archivo; el
// script está anotado en src/rewards/documentation-updates-us37.md). Deshabilita las que estén
// vencidas en este momento, igual que el cron de las 00:05.
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(RewardsAvailabilityService).runDailyExpiration();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
