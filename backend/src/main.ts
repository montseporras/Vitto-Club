import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { parseCorsOrigins } from './shared/security/cors-origins.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // descarta campos que no están en el DTO
      forbidNonWhitelisted: true, // y avisa con error 400 si mandan de más
      transform: true,            // convierte tipos automáticamente
    }),
  );

  // Orígenes del frontend: variable CORS_ORIGIN; sin ella, el de Vite (5173)
  app.enableCors({ origin: parseCorsOrigins(process.env.CORS_ORIGIN), credentials: true });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();