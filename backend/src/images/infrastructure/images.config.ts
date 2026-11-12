import { ConfigService } from '@nestjs/config';

// BASE-5 (contrato S5 §3.5.1): IMAGES_STORAGE_ENABLED=true usa Cloudinary; con false (desarrollo sin
// cuenta y e2e) o sin la variable se usa el adaptador falso. Solo se prende con "true", así una
// variable que falta nunca hace que se llame a un servicio externo por accidente.
export function isImagesStorageEnabled(config: ConfigService): boolean {
  return config.get<string>('IMAGES_STORAGE_ENABLED')?.trim().toLowerCase() === 'true';
}

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

const REQUIRED = [
  ['cloudName', 'CLOUDINARY_CLOUD_NAME'],
  ['apiKey', 'CLOUDINARY_API_KEY'],
  ['apiSecret', 'CLOUDINARY_API_SECRET'],
] as const;

// Con Cloudinary prendido, las tres variables son obligatorias: si falta alguna, el servidor no
// arranca y dice cuál (mejor que fallar recién cuando alguien sube una foto)
export function readCloudinaryConfig(config: ConfigService): CloudinaryConfig {
  const values = Object.fromEntries(REQUIRED.map(([key, name]) => [key, config.get<string>(name)?.trim()]));
  const missing = REQUIRED.filter(([key]) => !values[key]).map(([, name]) => name);
  if (missing.length > 0) {
    throw new Error(`IMAGES_STORAGE_ENABLED=true pero faltan variables de Cloudinary: ${missing.join(', ')}`);
  }
  return values as CloudinaryConfig;
}
