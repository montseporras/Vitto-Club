export type GeneratedRefreshToken = {
  // Lo que se le entrega al cliente
  token: string;
  // Lo único que se guarda en la base
  hash: string;
};

export abstract class RefreshTokenGenerator {
  // Token nuevo, aleatorio, junto con su hash
  abstract generate(): GeneratedRefreshToken;

  // Hash de un token recibido, para buscar su sesión
  abstract hash(token: string): string;
}
