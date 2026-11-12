import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageStorage } from './domain/port/image-storage.js';
import { CloudinaryImageStorage } from './infrastructure/cloudinary-image-storage.js';
import { FakeImageStorage } from './infrastructure/fake-image-storage.js';
import { isImagesStorageEnabled, readCloudinaryConfig } from './infrastructure/images.config.js';

// BASE-5 (contrato S5 §8.4): módulo técnico sin dominio de negocio, como `prisma`. Solo ofrece el puerto
// ImageStorage; lo usan `rewards` (US-34) y `customers` (FOTO-PERFIL). Con IMAGES_STORAGE_ENABLED=true usa
// Cloudinary; si no, el adaptador falso. El SDK se carga recién cuando hace falta, así que sin Cloudinary
// prendido nunca se toca.
@Module({
  providers: [
    {
      provide: ImageStorage,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<ImageStorage> => {
        if (!isImagesStorageEnabled(config)) {
          return new FakeImageStorage();
        }
        const { cloudName, apiKey, apiSecret } = readCloudinaryConfig(config);
        const { v2 } = await import('cloudinary');
        v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
        return new CloudinaryImageStorage(v2);
      },
    },
  ],
  exports: [ImageStorage],
})
export class ImagesModule {}
