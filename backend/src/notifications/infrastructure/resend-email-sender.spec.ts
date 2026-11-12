import { ResendClient, ResendEmailSender } from './resend-email-sender.js';

// Cliente de mentira: los tests nunca llaman a Resend
const clientReturning = (response: Awaited<ReturnType<ResendClient['emails']['send']>>) => {
  const send = jest.fn().mockResolvedValue(response);
  return { client: { emails: { send } } satisfies ResendClient, send };
};

const message = { to: 'sofia@mail.com', subject: 'Tus puntos están por vencer', text: 'Hola Sofía' };

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
