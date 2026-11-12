// BASE-5 (contrato S5 §3.5.1, CA-B5.6): una imagen se valida por su CONTENIDO, no por la extensión
// ni por el tipo que declara el cliente. Un PDF renombrado a .jpg tiene que rechazarse.

// "Hasta 2 MB" (§3.5.1). 2 MB + 1 byte se rechaza; 2 MB exactos se acepta
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const IMAGE_FORMATS = ['JPEG', 'PNG', 'WEBP'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (buffer: Buffer, bytes: number[], offset = 0): boolean =>
  buffer.length >= offset + bytes.length && bytes.every((byte, index) => buffer[offset + index] === byte);

// Formato real del archivo según sus primeros bytes, o null si no es JPG, PNG ni WebP
export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  // JPEG: FF D8 FF
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'JPEG';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buffer, PNG_SIGNATURE)) return 'PNG';
  // WebP: "RIFF" + 4 bytes de tamaño + "WEBP"
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'WEBP';
  }
  return null;
}

// Una imagen es válida si no está vacía, entra en 2 MB y es JPG, PNG o WebP de verdad
export function isValidImage(buffer: Buffer): boolean {
  return buffer.length > 0 && buffer.length <= MAX_IMAGE_BYTES && detectImageFormat(buffer) !== null;
}
