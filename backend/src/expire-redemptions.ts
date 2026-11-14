import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { RedemptionsExpirationService } from './redemptions/application/redemptions-expiration.service.js';

// US-44, CA-44.7: corre el barrido de canjes vencidos a demanda, sin endpoint HTTP y sin levantar
// el servidor. Se usa con `npm run redemptions:expire` (compila y ejecuta este archivo). Vence lo que
// esté vencido en este momento, igual que el cron de 5 minutos.
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(RedemptionsExpirationService).run();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
