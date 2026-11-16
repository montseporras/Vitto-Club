// Textos y mensajes de error del cambio de estado del usuario de un empleado (SCRUM-27).
import { toApiError } from '@/shared/api/ApiError';

export type StatusChange = 'deactivate' | 'reactivate';


export const TEXTS = {
  deactivate: {
    question:
      'Va a dejar de poder ingresar al sistema y se cierran sus sesiones abiertas. Después vas a poder activarla nuevamente.',
    confirm: 'Desactivar cuenta',
    pending: 'Desactivando…',
    conflict: 'Esta cuenta ya estaba desactivada.',
    failed: 'No se pudo desactivar la cuenta. Intentá nuevamente.',
  },
  reactivate: {
    question: 'Va a poder volver a ingresar al sistema con la contraseña que tenía.',
    confirm: 'Reactivar usuario',
    pending: 'Reactivando…',
    conflict:
      'No se pudo reactivar: el usuario ya está activo o el empleado está dado de baja.',
    failed: 'No se pudo reactivar el usuario. Intentá nuevamente.',
  },
} as const;

// Contrato §3.11.4: al reactivar, el email lo usa otra cuenta activa.
const EMAIL_IN_USE_MESSAGE =
  'El mail de este usuario ya lo usa otra cuenta activa.';

// Mensaje según la respuesta del backend
// (PATCH /usuarios/:id/deactivate o /usuarios/:id/reactivate).
export function accountStatusErrorMessage(change: StatusChange, error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.code === 'LAST_ADMIN') {
    return 'No se puede desactivar: es el único administrador que puede ingresar al sistema.';
  }
  if (apiError.code === 'EMAIL_IN_USE') return EMAIL_IN_USE_MESSAGE;
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 409:
      return TEXTS[change].conflict;
    case 404:
      return 'El usuario ya no existe.';
    default:
      return TEXTS[change].failed;
  }
}
