import { assertValidImage } from '../application/invalid-image.exception.js';
import { detectImageFormat, ImageFormat } from '../domain/image-validation.js';
import {
  ImageAccess,
  ImageStorage,
  SIGNED_URL_TTL_SECONDS,
  StoredImage,
  UploadImageOptions,
} from '../domain/port/image-storage.js';

// Lo único que se usa del SDK de Cloudinary (`v2`). Se declara acá para poder probar el adaptador con
// un cliente de mentira: los tests nunca llaman a Cloudinary.
export type CloudinaryClient = {
  uploader: {
    upload(file: string, options: Record<string, unknown>): Promise<{ public_id: string; secure_url: string }>;
    destroy(publicId: string, options: Record<string, unknown>): Promise<{ result: string }>;
  };
  utils: {
    private_download_url(publicId: string, format: string, options: Record<string, unknown>): string;
  };
};

const MIME_TYPES: Record<ImageFormat, string> = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
};

// Cloudinary: `upload` = entrega pública; `authenticated` = solo con URL firmada (§3.5.1)
const deliveryType = (access: ImageAccess): 'upload' | 'authenticated' =>
  access === 'PUBLIC' ? 'upload' : 'authenticated';

// BASE-5 (contrato S5 §3.5.1, CA-B5.6). El backend sube el archivo y guarda solo el public_id y la URL;
// nunca guarda la imagen.
export class CloudinaryImageStorage extends ImageStorage {
  constructor(private readonly cloudinary: CloudinaryClient) {
    super();
  }

  async upload(file: Buffer, options: UploadImageOptions): Promise<StoredImage> {
    // Por contenido y tamaño, ANTES de tocar Cloudinary
    assertValidImage(file);
    const format = detectImageFormat(file) as ImageFormat;
    const dataUri = `data:${MIME_TYPES[format]};base64,${file.toString('base64')}`;

    const result = await this.cloudinary.uploader.upload(dataUri, {
      folder: options.folder,
      type: deliveryType(options.access),
      resource_type: 'image',
    });

    return {
      publicId: result.public_id,
      // Solo las públicas guardan la URL; las de perfil se firman en cada respuesta
      url: options.access === 'PUBLIC' ? result.secure_url : null,
    };
  }

  async delete(publicId: string, access: ImageAccess): Promise<void> {
    const response = await this.cloudinary.uploader.destroy(publicId, {
      type: deliveryType(access),
      resource_type: 'image',
      invalidate: true,
    });
    // 'not found': ya no estaba, que es lo que se quería
    if (response.result !== 'ok' && response.result !== 'not found') {
      throw new Error(`Cloudinary no pudo borrar ${publicId}: ${response.result}`);
    }
  }

  // §3.5.1 y S5-23: URL firmada que vence a la hora, generada en cada respuesta. Se usa la URL de
  // descarga firmada con vencimiento, que funciona sin plan Enterprise. Se pide siempre en JPG para no
  // depender del formato original, que no se guarda. Hay que confirmarla con una cuenta real.
  signedUrl(publicId: string): string {
    return this.cloudinary.utils.private_download_url(publicId, 'jpg', {
      resource_type: 'image',
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
    });
  }
}
