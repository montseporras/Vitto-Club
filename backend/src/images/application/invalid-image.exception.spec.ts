import { BadRequestException } from '@nestjs/common';
import { assertValidImage, INVALID_IMAGE, InvalidImageException } from './invalid-image.exception.js';

describe('InvalidImageException (contrato S5 §3.5.1 y §5)', () => {
  it('es un 400 con el code INVALID_IMAGE y el mensaje del contrato', () => {
    const exception = new InvalidImageException();

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      message: 'Usá una imagen JPG, PNG o WebP de hasta 2 MB.',
      code: 'INVALID_IMAGE',
    });
    expect(INVALID_IMAGE.code).toBe('INVALID_IMAGE');
  });

  it('assertValidImage lanza con un PDF renombrado y deja pasar una imagen válida', () => {
    expect(() => assertValidImage(Buffer.from('%PDF-1.7 renombrado a .jpg'))).toThrow(InvalidImageException);
    expect(() => assertValidImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).not.toThrow();
  });
});
