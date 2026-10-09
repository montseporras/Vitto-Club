import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { PasswordHasher } from '../domain/port/password-hasher.js';

const DEFAULT_COST = 10;
const MIN_COST = 4;
const MAX_COST = 15;

// Adaptador de PasswordHasher con bcryptjs (JavaScript puro: no compila nada nativo, así que
// instala igual en Windows, en GitHub Actions y en Render). Vive en accounts, que es dueño de
// las contraseñas: nadie fuera de este módulo hashea ni compara contraseñas.
//
// Para cambiar de algoritmo (por ejemplo argon2) se escribe otro adaptador de este puerto y se
// cambia una línea en accounts.module.ts; el resto del sistema no se entera.
//
// bcrypt solo mira los primeros 72 BYTES de la contraseña y descarta el resto sin avisar. Por
// eso Password limita el largo en bytes (ver domain/password.ts).
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly cost: number;

  constructor(config: ConfigService) {
    const raw = config.get<string>('BCRYPT_COST');
    const cost = raw === undefined || raw === '' ? DEFAULT_COST : Number(raw);

    if (!Number.isInteger(cost) || cost < MIN_COST || cost > MAX_COST) {
      throw new Error(`BCRYPT_COST must be an integer between ${MIN_COST} and ${MAX_COST}`);
    }
    this.cost = cost;
  }

  async hash(plainPassword: string): Promise<string> {
    return await bcrypt.hash(plainPassword, this.cost);
  }

  // Un hash guardado que no tiene forma de bcrypt (dato corrupto) devuelve false, no un error
  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, passwordHash);
  }
}
