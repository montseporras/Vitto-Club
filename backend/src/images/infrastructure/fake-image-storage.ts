import { assertValidImage } from '../application/invalid-image.exception.js';
import {
  ImageAccess,
  ImageStorage,
  SIGNED_URL_TTL_SECONDS,
  StoredImage,
  UploadImageOptions,
} from '../domain/port/image-storage.js';

// BASE-5 (CA-B5.6): adaptador falso, para el desarrollo sin cuenta de Cloudinary y para los e2e
// (IMAGES_STORAGE_ENABLED=false). Valida el archivo igual que el real (por contenido y tamaño) y
// devuelve URLs de prueba, pero no llama a ningún servicio. Guarda en memoria lo que recibió para que
// los tests puedan comprobarlo.
export class FakeImageStorage extends ImageStorage {
  readonly uploads: StoredImage[] = [];
  readonly deletions: { publicId: string; access: ImageAccess }[] = [];
  private nextId = 1;

  async upload(file: Buffer, options: UploadImageOptions): Promise<StoredImage> {
    assertValidImage(file);
    const publicId = `${options.folder}/fake-${this.nextId++}`;
    const image: StoredImage = {
      publicId,
      url: options.access === 'PUBLIC' ? `https://images.fake.test/${publicId}.jpg` : null,
    };
    this.uploads.push(image);
    return image;
  }

  async delete(publicId: string, access: ImageAccess): Promise<void> {
    this.deletions.push({ publicId, access });
  }

  signedUrl(publicId: string): string {
    const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    return `https://images.fake.test/signed/${publicId}.jpg?expires=${expiresAt}`;
  }
}
