export const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // 2 MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Devuelve el mensaje de error si la imagen no sirve, o undefined si está bien. */
export function validatePhoto(file: File): string | undefined {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'La foto tiene que ser JPG, PNG o WEBP'
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'La foto no puede pesar más de 2 MB'
  }
  return undefined
}
