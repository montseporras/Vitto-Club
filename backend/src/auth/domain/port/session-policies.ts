import type { AuthRole } from '../auth-role.js';

// Plazos de una sesión, en milisegundos
export type SessionPolicy = {
  inactivityMs: number;
  absoluteMs: number;
};

// De dónde salen los plazos según el rol. Los casos de uso no leen configuración.
export abstract class SessionPolicies {
  abstract forRole(role: AuthRole): SessionPolicy;
}
