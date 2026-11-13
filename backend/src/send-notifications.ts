import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { NotificationsDailyService } from './notifications/application/notifications-daily.service.js';

// US-47 y US-48: corre el proceso diario de avisos (cumpleaños y puntos por vencer) a demanda, sin endpoint HTTP y sin
// levantar el servidor. Se usa con `npm run notifications:send` (compila y ejecuta este archivo). Es idempotente: si ya
// corrió hoy, no regala ni manda nada de nuevo.
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(NotificationsDailyService).run();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
