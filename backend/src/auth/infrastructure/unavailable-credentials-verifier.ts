import { Injectable } from '@nestjs/common';
import { CredentialsVerifier } from '../domain/port/credentials-verifier.js';

// PROVISORIO: rechaza todas las credenciales. Existe para que la aplicación arranque y
// auth se pueda probar antes de integrarse con accounts. Mientras esté registrado, nadie
// puede iniciar sesión. Se reemplaza por el adaptador hacia AccountsService en la
// integración (ver auth.module.ts).
@Injectable()
export class UnavailableCredentialsVerifier implements CredentialsVerifier {
  async verify(): Promise<null> {
    return null;
  }

  async findActiveById(): Promise<null> {
    return null;
  }
}
