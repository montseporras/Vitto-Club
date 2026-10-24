import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PointsExpirationService } from './points/application/points-expiration.service.js';

// US-25, CA-25.6 (P7): corre el vencimiento de puntos a demanda, sin endpoint HTTP y sin
// levantar el servidor. Se usa con `npm run points:expire` (compila y ejecuta este archivo).
// Vence lo que esté vencido en este momento, igual que el cron de las 00:05.
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(PointsExpirationService).run();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
