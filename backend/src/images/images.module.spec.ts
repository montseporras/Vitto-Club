import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ImageStorage } from './domain/port/image-storage.js';
import { FakeImageStorage } from './infrastructure/fake-image-storage.js';
import { isImagesStorageEnabled, readCloudinaryConfig } from './infrastructure/images.config.js';
import { ImagesModule } from './images.module.js';

const configWith = (values: Record<string, string>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('Configuración de imágenes (CA-B5.6)', () => {
  it('solo se prende con IMAGES_STORAGE_ENABLED=true: sin la variable o con false queda el adaptador falso', () => {
    expect(isImagesStorageEnabled(configWith({ IMAGES_STORAGE_ENABLED: 'true' }))).toBe(true);
    expect(isImagesStorageEnabled(configWith({ IMAGES_STORAGE_ENABLED: ' TRUE ' }))).toBe(true);
    expect(isImagesStorageEnabled(configWith({ IMAGES_STORAGE_ENABLED: 'false' }))).toBe(false);
    expect(isImagesStorageEnabled(configWith({ IMAGES_STORAGE_ENABLED: '' }))).toBe(false);
    expect(isImagesStorageEnabled(configWith({}))).toBe(false);
  });

  it('con Cloudinary prendido, las tres variables son obligatorias y el error dice cuáles faltan', () => {
    expect(() => readCloudinaryConfig(configWith({ CLOUDINARY_CLOUD_NAME: 'demo' }))).toThrow(
      'faltan variables de Cloudinary: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
    );
    expect(
      readCloudinaryConfig(
        configWith({ CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' }),
      ),
    ).toEqual({ cloudName: 'demo', apiKey: 'k', apiSecret: 's' });
  });
});

describe('ImagesModule (CA-B5.6)', () => {
  const build = (env: Record<string, string>) =>
    Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), ImagesModule],
    }).compile();

  it('con IMAGES_STORAGE_ENABLED=false usa el adaptador falso: no llama a Cloudinary', async () => {
    const moduleRef = await build({ IMAGES_STORAGE_ENABLED: 'false' });

    expect(moduleRef.get(ImageStorage)).toBeInstanceOf(FakeImageStorage);
  });

  it('prendido sin credenciales, el módulo no arranca y avisa qué falta', async () => {
    await expect(build({ IMAGES_STORAGE_ENABLED: 'true' })).rejects.toThrow('CLOUDINARY_CLOUD_NAME');
  });
});
