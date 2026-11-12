import { BadRequestException } from '@nestjs/common';
import { isValidImage } from '../domain/image-validation.js';

export const INVALID_IMAGE = {
  code: 'INVALID_IMAGE',
  message: 'Usá una imagen JPG, PNG o WebP de hasta 2 MB.',
} as const;

// 400 INVALID_IMAGE (contrato S5 §3.5.1 y §5). Es un HttpException con `code`, así que los filtros de
// cada módulo lo respetan tal cual, como el resto de los errores con code.
export class InvalidImageException extends BadRequestException {
  constructor() {
    super({ message: INVALID_IMAGE.message, code: INVALID_IMAGE.code });
  }
}

// Valida por contenido y tamaño. Los adaptadores de ImageStorage lo llaman ANTES de subir nada
export function assertValidImage(buffer: Buffer): void {
  if (!isValidImage(buffer)) {
    throw new InvalidImageException();
  }
}
