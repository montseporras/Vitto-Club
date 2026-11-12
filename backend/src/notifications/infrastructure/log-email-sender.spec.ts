import { Logger } from '@nestjs/common';
import { LogEmailSender } from './log-email-sender.js';

describe('LogEmailSender (CA-B5.7)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('no manda nada: deja el envío en el log y devuelve SKIPPED', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const result = await new LogEmailSender().send({
      to: 'sofia@mail.com',
      subject: '¡Feliz cumpleaños!',
      text: 'Hola Sofía',
    });

    expect(result).toBe('SKIPPED');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('¡Feliz cumpleaños!'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('sofia@mail.com'));
  });
});
