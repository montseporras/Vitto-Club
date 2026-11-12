// BASE-5 (contrato S5 §3.5.1 y §8.4, CA-B5.6): Cloudinary se usa solo a través de este puerto, con dos
// adaptadores: el de Cloudinary y uno falso (IMAGES_STORAGE_ENABLED=false, que es lo que usan el
// desarrollo sin cuenta y los e2e).

// Carpetas de Cloudinary (§3.5.1)
export const IMAGE_FOLDERS = ['vitto-club/rewards', 'vitto-club/customers'] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

// PUBLIC: entrega pública (recompensas). AUTHENTICATED: solo con URL firmada (fotos de perfil, S5-23)
export type ImageAccess = 'PUBLIC' | 'AUTHENTICATED';

export type UploadImageOptions = { folder: ImageFolder; access: ImageAccess };

// Lo que se guarda en la base (§3.15 "Fotos"): el public_id y, solo para las públicas, la URL
export type StoredImage = {
  publicId: string;
  // null en las AUTHENTICATED: su URL se firma en cada respuesta con signedUrl()
  url: string | null;
};

// Una hora, en segundos (§3.5.1: "URL firmada que vence a la hora")
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export abstract class ImageStorage {
  // Valida por contenido y tamaño ANTES de subir (400 INVALID_IMAGE) y sube la imagen
  abstract upload(file: Buffer, options: UploadImageOptions): Promise<StoredImage>;

  // Borra la imagen. Quien lo llama lo hace DESPUÉS del commit: si falla, solo queda en el log
  abstract delete(publicId: string, access: ImageAccess): Promise<void>;

  // URL firmada de una imagen AUTHENTICATED, que vence a la hora. Se genera en cada respuesta
  abstract signedUrl(publicId: string): string;
}
