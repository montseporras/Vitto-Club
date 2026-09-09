import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

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

  // El frontend de Vite corre en 5173
  app.enableCors({ origin: ['http://localhost:5173'], credentials: true });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();