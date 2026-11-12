import { InvalidImageException } from '../application/invalid-image.exception.js';
import { FakeImageStorage } from './fake-image-storage.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe('FakeImageStorage (CA-B5.6)', () => {
  let storage: FakeImageStorage;

  beforeEach(() => {
    storage = new FakeImageStorage();
  });

  it('valida igual que el real: un PDF renombrado se rechaza y no se registra ninguna subida', async () => {
    await expect(
      storage.upload(Buffer.from('%PDF-1.7'), { folder: 'vitto-club/rewards', access: 'PUBLIC' }),
    ).rejects.toThrow(InvalidImageException);
    expect(storage.uploads).toEqual([]);
  });

  it('una pública devuelve public_id y URL de prueba, en la carpeta pedida', async () => {
    const image = await storage.upload(jpeg, { folder: 'vitto-club/rewards', access: 'PUBLIC' });

    expect(image.publicId).toMatch(/^vitto-club\/rewards\/fake-\d+$/);
    expect(image.url).toBe(`https://images.fake.test/${image.publicId}.jpg`);
  });

  it('una de perfil (autenticada) no guarda URL: se firma en cada respuesta', async () => {
    const image = await storage.upload(jpeg, { folder: 'vitto-club/customers', access: 'AUTHENTICATED' });

    expect(image.publicId).toMatch(/^vitto-club\/customers\/fake-\d+$/);
    expect(image.url).toBeNull();
  });

  it('cada subida tiene un public_id distinto', async () => {
    const a = await storage.upload(jpeg, { folder: 'vitto-club/rewards', access: 'PUBLIC' });
    const b = await storage.upload(jpeg, { folder: 'vitto-club/rewards', access: 'PUBLIC' });

    expect(a.publicId).not.toBe(b.publicId);
  });

  it('la URL firmada vence a la hora', () => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const url = storage.signedUrl('vitto-club/customers/fake-1');

    expect(url).toContain('vitto-club/customers/fake-1');
    expect(url).toContain(`expires=${now / 1000 + 3600}`);
    jest.restoreAllMocks();
  });

  it('delete deja registrado qué se borró', async () => {
    await storage.delete('vitto-club/rewards/fake-1', 'PUBLIC');

    expect(storage.deletions).toEqual([{ publicId: 'vitto-club/rewards/fake-1', access: 'PUBLIC' }]);
  });
});
