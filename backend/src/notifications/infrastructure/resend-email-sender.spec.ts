import { ResendClient, ResendEmailSender } from './resend-email-sender.js';

// Cliente de mentira: los tests nunca llaman a Resend
const clientReturning = (response: Awaited<ReturnType<ResendClient['emails']['send']>>) => {
  const send = jest.fn().mockResolvedValue(response);
  return { client: { emails: { send } } satisfies ResendClient, send };
};

const message = { to: 'sofia@mail.com', subject: 'Tus puntos están por vencer', text: 'Hola Sofía' };

describe('ResendEmailSender: pausa entre envíos (límite de 10 por segundo de Resend)', () => {
  // Reloj y espera de mentira: el tiempo solo avanza cuando termina cada espera (no al empezarla), así varios
  // envíos a la vez ven la misma hora, como en la realidad
  function fakeClock() {
    let time = 1_000;
    const sleeps: number[] = [];
    return {
      sleeps,
      now: () => time,
      sleep: async (ms: number) => {
        sleeps.push(ms);
        await Promise.resolve();
        time += ms;
      },
    };
  }

  it('el primer correo sale sin esperar', async () => {
    const { client } = clientReturning({ data: { id: 're_1' }, error: null });
    const clock = fakeClock();

    await new ResendEmailSender(client, 'avisos@vitto.club', clock).send(message);

    expect(clock.sleeps).toEqual([]);
  });

  it('la pausa por defecto es de 150 ms', async () => {
    const { client } = clientReturning({ data: { id: 're_1' }, error: null });
    const clock = fakeClock();
    const sender = new ResendEmailSender(client, 'avisos@vitto.club', clock);

    await sender.send(message);
    await sender.send(message);

    expect(clock.sleeps).toEqual([150]);
  });

  it('varios envíos seguidos salen separados por la pausa: ninguno pasa los 10 por segundo', async () => {
    const { client, send } = clientReturning({ data: { id: 're_1' }, error: null });
    const clock = fakeClock();
    const sender = new ResendEmailSender(client, 'avisos@vitto.club', clock);

    for (let i = 0; i < 5; i++) await sender.send(message);

    expect(send).toHaveBeenCalledTimes(5);
    expect(clock.sleeps).toEqual([150, 150, 150, 150]);
  });

  it('envíos a la vez también quedan separados (cada uno reserva su turno)', async () => {
    const { client } = clientReturning({ data: { id: 're_1' }, error: null });
    const clock = fakeClock();
    const sender = new ResendEmailSender(client, 'avisos@vitto.club', clock);

    await Promise.all([sender.send(message), sender.send(message), sender.send(message)]);

    // El segundo espera 150 ms y el tercero 300 ms desde el primero
    expect(clock.sleeps.sort((a, b) => a - b)).toEqual([150, 300]);
  });

  it('si pasó más tiempo que la pausa, no espera', async () => {
    const { client } = clientReturning({ data: { id: 're_1' }, error: null });
    const clock = fakeClock();
    let extra = 0;
    const sender = new ResendEmailSender(client, 'avisos@vitto.club', {
      now: () => clock.now() + extra,
      sleep: clock.sleep,
    });

    await sender.send(message);
    extra = 1_000;
    await sender.send(message);

    expect(clock.sleeps).toEqual([]);
  });

  it('la pausa se puede cambiar', async () => {
    const { client } = clientReturning({ data: { id: 're_1' }, error: null });
    const clock = fakeClock();
    const sender = new ResendEmailSender(client, 'avisos@vitto.club', { ...clock, minIntervalMs: 500 });

    await sender.send(message);
    await sender.send(message);

    expect(clock.sleeps).toEqual([500]);
  });

  it('un error del proveedor también cuenta como un turno usado', async () => {
    const { client } = clientReturning({ data: null, error: { message: 'rate_limit_exceeded' } });
    const clock = fakeClock();
    const sender = new ResendEmailSender(client, 'avisos@vitto.club', clock);

    await expect(sender.send(message)).rejects.toThrow('rate_limit_exceeded');
    await expect(sender.send(message)).rejects.toThrow('rate_limit_exceeded');

    expect(clock.sleeps).toEqual([150]);
  });
});

describe('ResendEmailSender (CA-B5.7, contrato S5 §3.8.3)', () => {
  it('manda el correo con el remitente configurado y devuelve SENT', async () => {
    const { client, send } = clientReturning({ data: { id: 're_1' }, error: null });

    const result = await new ResendEmailSender(client, 'Vitto Club <avisos@vitto.club>').send(message);

    expect(result).toBe('SENT');
    expect(send).toHaveBeenCalledWith({
      from: 'Vitto Club <avisos@vitto.club>',
      to: 'sofia@mail.com',
      subject: 'Tus puntos están por vencer',
      text: 'Hola Sofía',
    });
  });

  it('si el mensaje trae html, lo manda también', async () => {
    const { client, send } = clientReturning({ data: { id: 're_2' }, error: null });

    await new ResendEmailSender(client, 'avisos@vitto.club').send({ ...message, html: '<p>Hola Sofía</p>' });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ html: '<p>Hola Sofía</p>' }));
  });

  it('si el proveedor responde con error, rechaza con el motivo (queda FAILED con ese texto)', async () => {
    const { client } = clientReturning({ data: null, error: { message: 'The to address is not valid.' } });

    await expect(new ResendEmailSender(client, 'avisos@vitto.club').send(message)).rejects.toThrow(
      'The to address is not valid.',
    );
  });
});
