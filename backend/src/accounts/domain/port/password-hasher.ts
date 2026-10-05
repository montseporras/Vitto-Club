// Puerto que implementará la rama de autenticación con la librería de hashing que elijan
// (bcrypt, argon2, u otra). Este módulo nunca hashea ni compara contraseñas por su cuenta,
// ni decide el algoritmo: solo depende de este contrato.
export abstract class PasswordHasher {
  abstract hash(plainPassword: string): Promise<string>;
}
