import { detectImageFormat, isValidImage, MAX_IMAGE_BYTES } from './image-validation.js';

// Archivos de mentira con la cabecera real de cada formato, rellenados hasta el tamaño pedido
const withHeader = (header: number[], size = 64): Buffer => {
  const buffer = Buffer.alloc(Math.max(size, header.length));
  Buffer.from(header).copy(buffer);
  return buffer;
};

const jpeg = (size?: number) => withHeader([0xff, 0xd8, 0xff, 0xe0], size);
const png = (size?: number) => withHeader([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], size);
// "RIFF" + tamaño + "WEBP"
const webp = (size?: number) =>
  withHeader([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], size);

describe('Validación de imágenes por contenido (CA-B5.6, contrato S5 §3.5.1)', () => {
  it('acepta JPG, PNG y WebP según su cabecera', () => {
    expect(detectImageFormat(jpeg())).toBe('JPEG');
    expect(detectImageFormat(png())).toBe('PNG');
    expect(detectImageFormat(webp())).toBe('WEBP');
    expect(isValidImage(jpeg())).toBe(true);
    expect(isValidImage(png())).toBe(true);
    expect(isValidImage(webp())).toBe(true);
  });

  it('rechaza un PDF renombrado a .jpg: lo que cuenta es el contenido', () => {
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');
    expect(detectImageFormat(pdf)).toBeNull();
    expect(isValidImage(pdf)).toBe(false);
  });

  it('rechaza otros formatos de imagen (GIF) y un RIFF que no es WebP (WAV)', () => {
    expect(isValidImage(Buffer.from('GIF89a......'))).toBe(false);
    const wav = withHeader([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
    expect(isValidImage(wav)).toBe(false);
  });

  it('rechaza un archivo vacío o con la cabecera cortada', () => {
    expect(isValidImage(Buffer.alloc(0))).toBe(false);
    expect(isValidImage(Buffer.from([0xff, 0xd8]))).toBe(false);
    expect(isValidImage(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it('el límite es 2 MB: 2 MB exactos entra, 2 MB + 1 byte no', () => {
    expect(MAX_IMAGE_BYTES).toBe(2 * 1024 * 1024);
    expect(isValidImage(jpeg(MAX_IMAGE_BYTES))).toBe(true);
    expect(isValidImage(jpeg(MAX_IMAGE_BYTES + 1))).toBe(false);
    expect(isValidImage(png(MAX_IMAGE_BYTES + 1))).toBe(false);
    expect(isValidImage(webp(MAX_IMAGE_BYTES + 1))).toBe(false);
  });
});
