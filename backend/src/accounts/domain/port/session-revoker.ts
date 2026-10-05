// Punto de integración con el módulo de autenticación: cuando una Account se da de baja,
// hay que invalidar sus sesiones/refresh tokens para que no pueda renovarlos. El concepto
// de sesión/refresh token todavía no existe en el proyecto; por ahora este puerto solo
// deja reservado el lugar donde la rama de auth va a enganchar su implementación real.
export abstract class SessionRevoker {
  abstract revokeAllForAccount(accountId: number): Promise<void>;
}
