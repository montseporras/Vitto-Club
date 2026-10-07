import { Test, TestingModule } from '@nestjs/testing';
import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EmployeesModule } from '../src/employees/employees.module.js';
import { AccountsModule } from '../src/accounts/accounts.module.js';
import { PasswordHasher } from '../src/accounts/domain/port/password-hasher.js';

// PasswordHasher FALSO, solo para este e2e: determinista y simple, nunca bcrypt real.
// AccountsModule no provee ninguna implementación concreta en producción (pendiente de
// auth, ver accounts.module.ts) — levantarlo de verdad en un test necesita proveer una.
class FakePasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }
  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

// @Global() para que AccountsService (adentro de AccountsModule) resuelva el puerto sin
// que AccountsModule tenga que importar este módulo de test en su código de producción.
@Global()
@Module({
  providers: [{ provide: PasswordHasher, useClass: FakePasswordHasher }],
  exports: [PasswordHasher],
})
class TestPasswordHasherModule {}

// Integración real: EmployeesModule + AccountsModule tal cual están en producción, con
// PrismaTransactionRunner real, EventEmitterModule real y el listener real de
// employee.deactivated/employee.role-changed (EmployeeEventsListener, provisto por
// AccountsModule). Nada de esto se mockea. No se importa AppModule porque AccountsModule
// todavía no está registrado ahí (ver accounts.module.ts) — ensamblar el módulo de test a
// mano es la única forma de ejercitar accounts por HTTP real hoy.
describe('ABMC empleados/cuentas — integración por eventos reales (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Transacción ambiente real (mismo armado que AppModule, ver app.module.ts).
        ClsModule.forRoot({
          global: true,
          middleware: { mount: true },
          plugins: [
            new ClsPluginTransactional({
              imports: [PrismaModule],
              adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
            }),
          ],
        }),
        // Eventos de dominio reales, sin async/nextTick (igual que AppModule): el listener
        // corre dentro de la misma transacción de quien publica.
        EventEmitterModule.forRoot(),
        PrismaModule,
        TestPasswordHasherModule,
        EmployeesModule,
        AccountsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Cada escenario es independiente: no depende del orden de ejecución ni de datos que
  // hayan quedado de otro test. Corre contra la base de tests (DATABASE_URL_TEST, ver
  // test/e2e-database.ts / test/setup-e2e-env.ts) — nunca contra la de desarrollo.
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
  });

  // Las Accounts se crean directamente con Prisma, no a través de AccountsService: así el
  // estado inicial de cada escenario queda fijado por el test, no por las reglas de negocio
  // que justamente se están poniendo a prueba (p. ej. el alta real exige email == el de
  // Employee, valida password, etc. — ruido que no corresponde acá).
  async function seedEmployeeWithAccount(params: {
    email: string;
    role: 'ADMIN' | 'CASHIER';
    lastName: string;
  }) {
    const employee = await prisma.employee.create({
      data: {
        firstName: 'Test',
        lastName: params.lastName,
        phone: '3510000000',
        email: params.email,
        role: params.role,
        isActive: true,
      },
    });
    const account = await prisma.account.create({
      data: {
        email: params.email,
        passwordHash: 'hashed:secreta123',
        role: params.role,
        isActive: true,
        employeeId: employee.id,
      },
    });
    return { employee, account };
  }

  describe('A. Degradar al único ADMIN', () => {
    it('PATCH /api/empleados/:id a CASHIER responde 409 y no deja escritura parcial', async () => {
      const { employee, account } = await seedEmployeeWithAccount({
        email: 'admin.a@vitto.club',
        role: 'ADMIN',
        lastName: 'Uno',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/empleados/${employee.id}`)
        .send({ firstName: 'Test', lastName: 'Uno', role: 'CASHIER', phone: '3510000000' });

      expect(response.status).toBe(409);

      const freshEmployee = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
      const freshAccount = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
      expect(freshEmployee.role).toBe('ADMIN');
      expect(freshAccount.role).toBe('ADMIN');
    });
  });

  describe('B. Dar de baja al único ADMIN', () => {
    it('DELETE /api/empleados/:id responde 409 y hace rollback completo', async () => {
      const { employee, account } = await seedEmployeeWithAccount({
        email: 'admin.b@vitto.club',
        role: 'ADMIN',
        lastName: 'Uno',
      });

      const response = await request(app.getHttpServer()).delete(`/api/empleados/${employee.id}`);

      expect(response.status).toBe(409);

      const freshEmployee = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
      const freshAccount = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
      expect(freshEmployee.isActive).toBe(true);
      expect(freshAccount.isActive).toBe(true);
      expect(freshEmployee.role).toBe('ADMIN');
    });
  });

  describe('C. Degradar con dos ADMIN disponibles', () => {
    it('PATCH /api/empleados/:id de A a CASHIER responde 200 y no toca a B', async () => {
      const { employee: employeeA, account: accountA } = await seedEmployeeWithAccount({
        email: 'admin.c.a@vitto.club',
        role: 'ADMIN',
        lastName: 'A',
      });
      const { employee: employeeB, account: accountB } = await seedEmployeeWithAccount({
        email: 'admin.c.b@vitto.club',
        role: 'ADMIN',
        lastName: 'B',
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/empleados/${employeeA.id}`)
        .send({ firstName: 'Test', lastName: 'A', role: 'CASHIER', phone: '3510000000' });

      expect(response.status).toBe(200);

      const freshEmployeeA = await prisma.employee.findUniqueOrThrow({ where: { id: employeeA.id } });
      const freshAccountA = await prisma.account.findUniqueOrThrow({ where: { id: accountA.id } });
      const freshEmployeeB = await prisma.employee.findUniqueOrThrow({ where: { id: employeeB.id } });
      const freshAccountB = await prisma.account.findUniqueOrThrow({ where: { id: accountB.id } });

      expect(freshEmployeeA.role).toBe('CASHIER');
      expect(freshAccountA.role).toBe('CASHIER');
      expect(freshEmployeeB.role).toBe('ADMIN');
      expect(freshAccountB.role).toBe('ADMIN');
    });
  });

  describe('D. Dar de baja un Employee CASHIER con Account', () => {
    it('DELETE /api/empleados/:id responde 200 y da de baja la Account por evento real', async () => {
      // ADMIN disponible separado, para que la baja no choque con la protección del
      // último ADMIN (este Employee es CASHIER, no ADMIN, así que ni siquiera la dispara,
      // pero se deja explícito en la preparación porque así lo pide el escenario).
      await seedEmployeeWithAccount({ email: 'admin.d@vitto.club', role: 'ADMIN', lastName: 'Disponible' });
      const { employee, account } = await seedEmployeeWithAccount({
        email: 'cashier.d@vitto.club',
        role: 'CASHIER',
        lastName: 'Uno',
      });

      const response = await request(app.getHttpServer()).delete(`/api/empleados/${employee.id}`);

      expect(response.status).toBe(200);

      const freshEmployee = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
      const freshAccount = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
      expect(freshEmployee.isActive).toBe(false);
      expect(freshAccount.isActive).toBe(false);
    });
  });
});
