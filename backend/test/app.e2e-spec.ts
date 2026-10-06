import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Necesita la base levantada (docker compose up -d db), backend/.env configurado y la base
// de tests creada (ver DATABASE_URL_TEST en .env.example).
describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde ok con la base conectada', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', db: 'conectada' });
  });

  it('corre contra la base de tests, no contra la de desarrollo', async () => {
    const rows = await app.get(PrismaService).$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;

    expect(rows[0].name).toBe('vitto_club_test');
  });
});
