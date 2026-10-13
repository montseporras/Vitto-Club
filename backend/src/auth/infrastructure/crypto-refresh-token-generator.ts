import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { GeneratedRefreshToken, RefreshTokenGenerator } from '../domain/port/refresh-token-generator.js';

// 32 bytes aleatorios = 256 bits: imposible de adivinar
const TOKEN_BYTES = 32;

// El refresh token es un valor aleatorio opaco, no un JWT. En la base se guarda solo su
// SHA-256: como el token ya es aleatorio y largo, un hash rápido alcanza (no hace falta
// bcrypt) y permite buscar la sesión por índice.
@Injectable()
export class CryptoRefreshTokenGenerator implements RefreshTokenGenerator {
  generate(): GeneratedRefreshToken {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
