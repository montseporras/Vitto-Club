import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PromotionsProcessService } from './notifications/application/promotions-process.service.js';

// US-15, CA-15.6: corre el proceso de las promociones programadas a demanda, sin endpoint HTTP y sin levantar el
// servidor. Se usa con `npm run promotions:send` (compila y ejecuta este archivo). Saca los envíos programados que ya
// estén en hora, igual que el proceso de cada minuto.
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    await app.get(PromotionsProcessService).run();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
