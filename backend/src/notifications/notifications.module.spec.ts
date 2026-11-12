import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { EmailSender } from './domain/port/email-sender.js';
import { LogEmailSender } from './infrastructure/log-email-sender.js';
import { isEmailSendingEnabled, readResendConfig } from './infrastructure/notifications.config.js';
import { NotificationsModule } from './notifications.module.js';

const configWith = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('Configuración del correo (CA-B5.7)', () => {
  it('solo se prende con NOTIFICATIONS_EMAIL_ENABLED=true: sin la variable o con false no se manda nada', () => {
    expect(isEmailSendingEnabled(configWith({ NOTIFICATIONS_EMAIL_ENABLED: 'true' }))).toBe(true);
    expect(isEmailSendingEnabled(configWith({ NOTIFICATIONS_EMAIL_ENABLED: ' True ' }))).toBe(true);
    expect(isEmailSendingEnabled(configWith({ NOTIFICATIONS_EMAIL_ENABLED: 'false' }))).toBe(false);
    expect(isEmailSendingEnabled(configWith({ NOTIFICATIONS_EMAIL_ENABLED: '' }))).toBe(false);
    expect(isEmailSendingEnabled(configWith({}))).toBe(false);
  });

  it('con el envío prendido, RESEND_API_KEY y NOTIFICATIONS_FROM son obligatorias y el error dice cuáles faltan', () => {
    expect(() => readResendConfig(configWith({}))).toThrow(
      'faltan variables de Resend: RESEND_API_KEY, NOTIFICATIONS_FROM',
    );
    expect(() => readResendConfig(configWith({ RESEND_API_KEY: 're_x' }))).toThrow('NOTIFICATIONS_FROM');
    expect(readResendConfig(configWith({ RESEND_API_KEY: 're_x', NOTIFICATIONS_FROM: 'avisos@vitto.club' }))).toEqual({
      apiKey: 're_x',
      from: 'avisos@vitto.club',
    });
  });
});

// Los repositorios piden el PrismaTransactionRunner (que en la app sale del PrismaModule global): acá se
// reemplaza por uno de mentira, porque este test no toca la base
@Global()
@Module({
  providers: [{ provide: PrismaTransactionRunner, useValue: {} }],
  exports: [PrismaTransactionRunner],
})
class FakePrismaModule {}

describe('NotificationsModule (CA-B5.7)', () => {
  const build = (env: Record<string, string>) =>
    Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        FakePrismaModule,
        NotificationsModule,
      ],
    }).compile();

  it('con NOTIFICATIONS_EMAIL_ENABLED=false usa el adaptador que solo deja el envío en el log', async () => {
    const moduleRef = await build({ NOTIFICATIONS_EMAIL_ENABLED: 'false' });

    expect(moduleRef.get(EmailSender)).toBeInstanceOf(LogEmailSender);
  });

  it('prendido sin credenciales, el módulo no arranca y avisa qué falta', async () => {
    await expect(build({ NOTIFICATIONS_EMAIL_ENABLED: 'true' })).rejects.toThrow('RESEND_API_KEY');
  });
});
