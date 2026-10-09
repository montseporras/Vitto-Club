import { Session } from '../session.js';

export abstract class SessionRepository {
  // Guarda una sesión nueva y la devuelve con su id
  abstract save(session: Session): Promise<Session>;

  abstract findByTokenHash(tokenHash: string): Promise<Session | null>;

  // Guarda una renovación (token y vencimiento nuevos) SOLO si la sesión todavía tiene el
  // token anterior. Devuelve false si otro pedido la renovó antes (dos pestañas a la vez):
  // así el mismo refresh token nunca sirve dos veces.
  abstract saveRotation(session: Session, previousTokenHash: string): Promise<boolean>;

  // Guarda la revocación de una sesión
  abstract saveRevocation(session: Session): Promise<void>;

  // Revoca todas las sesiones vigentes de una cuenta (baja de la cuenta)
  abstract revokeAllForAccount(accountId: number, now: Date): Promise<void>;
}
