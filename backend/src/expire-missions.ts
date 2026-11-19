import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { MissionsExpirationService } from './missions/application/missions-expiration.service.js';

// US-32, CA-32.1: corre el proceso de fin de mes de las misiones a demanda, sin endpoint HTTP y sin
// levantar el servidor. Se usa con `npm run missions:expire` (compila y ejecuta este archivo). Resuelve
// las asignaciones de los meses ya terminados, igual que el cron del día 1 a las 00:10.
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(MissionsExpirationService).run();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
