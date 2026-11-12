import { InvalidImageException } from '../application/invalid-image.exception.js';
import { CloudinaryClient, CloudinaryImageStorage } from './cloudinary-image-storage.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

// Cliente de mentira: los tests nunca llaman a Cloudinary
function fakeClient(overrides: { destroyResult?: string } = {}) {
  const client = {
    uploader: {
      upload: jest.fn().mockResolvedValue({
        public_id: 'vitto-club/rewards/abc123',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/vitto-club/rewards/abc123.jpg',
      }),
      destroy: jest.fn().mockResolvedValue({ result: overrides.destroyResult ?? 'ok' }),
    },
    utils: { private_download_url: jest.fn().mockReturnValue('https://api.cloudinary.com/signed') },
  };
  return client satisfies CloudinaryClient;
}

describe('CloudinaryImageStorage (CA-B5.6, contrato S5 §3.5.1)', () => {
  it('rechaza un PDF renombrado y uno de 2 MB + 1 byte ANTES de subir: Cloudinary no se llama', async () => {
    const client = fakeClient();
    const storage = new CloudinaryImageStorage(client);
    const tooBig = Buffer.alloc(2 * 1024 * 1024 + 1);
    jpeg.copy(tooBig);

    await expect(
      storage.upload(Buffer.from('%PDF-1.7'), { folder: 'vitto-club/rewards', access: 'PUBLIC' }),
    ).rejects.toThrow(InvalidImageException);
    await expect(storage.upload(tooBig, { folder: 'vitto-club/rewards', access: 'PUBLIC' })).rejects.toThrow(
      InvalidImageException,
    );
    expect(client.uploader.upload).not.toHaveBeenCalled();
  });

  it('una pública sube con entrega pública, en su carpeta, y guarda public_id y la secure_url', async () => {
    const client = fakeClient();
    const storage = new CloudinaryImageStorage(client);

    const image = await storage.upload(jpeg, { folder: 'vitto-club/rewards', access: 'PUBLIC' });

    expect(client.uploader.upload).toHaveBeenCalledWith(
      `data:image/jpeg;base64,${jpeg.toString('base64')}`,
      { folder: 'vitto-club/rewards', type: 'upload', resource_type: 'image' },
    );
    expect(image).toEqual({
      publicId: 'vitto-club/rewards/abc123',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/vitto-club/rewards/abc123.jpg',
    });
  });

  it('una de perfil sube con entrega autenticada y no guarda URL', async () => {
    const client = fakeClient();
    const storage = new CloudinaryImageStorage(client);

    const image = await storage.upload(png, { folder: 'vitto-club/customers', access: 'AUTHENTICATED' });

    expect(client.uploader.upload).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/), {
      folder: 'vitto-club/customers',
      type: 'authenticated',
      resource_type: 'image',
    });
    expect(image.url).toBeNull();
    expect(image.publicId).toBe('vitto-club/rewards/abc123');
  });

  it('la URL firmada es autenticada y vence a la hora', () => {
    const client = fakeClient();
    const storage = new CloudinaryImageStorage(client);
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const url = storage.signedUrl('vitto-club/customers/xyz');

    expect(url).toBe('https://api.cloudinary.com/signed');
    expect(client.utils.private_download_url).toHaveBeenCalledWith('vitto-club/customers/xyz', 'jpg', {
      resource_type: 'image',
      type: 'authenticated',
      expires_at: now / 1000 + 3600,
    });
    jest.restoreAllMocks();
  });

  it('delete usa el tipo de entrega de cada imagen e invalida la caché', async () => {
    const client = fakeClient();
    const storage = new CloudinaryImageStorage(client);

    await storage.delete('vitto-club/rewards/abc123', 'PUBLIC');
    await storage.delete('vitto-club/customers/xyz', 'AUTHENTICATED');

    expect(client.uploader.destroy).toHaveBeenNthCalledWith(1, 'vitto-club/rewards/abc123', {
      type: 'upload',
      resource_type: 'image',
      invalidate: true,
    });
    expect(client.uploader.destroy).toHaveBeenNthCalledWith(2, 'vitto-club/customers/xyz', {
      type: 'authenticated',
      resource_type: 'image',
      invalidate: true,
    });
  });

  it('borrar algo que ya no está no es un error; cualquier otra respuesta sí', async () => {
    await expect(
      new CloudinaryImageStorage(fakeClient({ destroyResult: 'not found' })).delete('a', 'PUBLIC'),
    ).resolves.toBeUndefined();
    await expect(
      new CloudinaryImageStorage(fakeClient({ destroyResult: 'error' })).delete('a', 'PUBLIC'),
    ).rejects.toThrow('Cloudinary no pudo borrar a: error');
  });
});
