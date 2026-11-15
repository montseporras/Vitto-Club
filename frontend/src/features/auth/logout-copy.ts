import type { Role } from '@/domain/roles'

/** Textos de las tres etapas del cierre de sesión, según el rol. */
type LogoutCopy = {
  /** Etiqueta de ámbito en el modal de confirmación */
  badge: string
  confirmText: string
  /** Mensaje mientras se guarda y se cierra */
  savingText: string
  farewellTitle: string
  farewellText: string
  farewellButton: string
}

export const LOGOUT_COPY: Record<Role, LogoutCopy> = {
  ADMIN: {
    badge: 'Panel de control',
    confirmText:
      'Vas a salir de tu cuenta de administrador en Vitto Club. Asegurate de haber guardado todos los cambios en caja, configuraciones y perfiles antes de continuar.',
    savingText: 'Sincronizando registros y asegurando cambios...',
    farewellTitle: 'Sesión administrativa finalizada',
    farewellText:
      'Tu sesión se cerró correctamente y todas las operaciones del panel quedaron aseguradas. La terminal está lista para un nuevo inicio de sesión.',
    farewellButton: 'Volver al inicio de sesión',
  },
  CASHIER: {
    badge: 'Terminal mostrador',
    confirmText:
      'Vas a cerrar el turno de mostrador en Vitto Club. Asegurate de que no queden cobros ni acreditaciones de consumos pendientes antes de salir.',
    savingText: 'Cerrando turno de caja y liberando terminal...',
    farewellTitle: 'Turno de mostrador cerrado',
    farewellText:
      'Los cobros y registros de clientes se guardaron con éxito en el sistema. La caja de mostrador quedó libre para el próximo compañero.',
    farewellButton: 'Ingresar nuevo cajero',
  },
  CUSTOMER: {
    badge: 'Portal clientes',
    confirmText:
      'Vas a salir de tu cuenta de Vitto Club. Tus puntos acumulados y recompensas canjeadas quedan guardados de forma segura hasta tu próxima visita.',
    savingText: 'Guardando tus puntos y cerrando sesión...',
    farewellTitle: '¡Te esperamos pronto para otro café!',
    farewellText:
      'Tu saldo de puntos y beneficios están protegidos en tu cuenta de Vitto Club. Disfrutá tu café y nos vemos en tu próxima visita.',
    farewellButton: 'Ingresar a mi cuenta',
  },
}

// Igual a PATHS.login: un feature no puede importar de app/router
export const LOGIN_PATH = '/login'

export const INSTAGRAM_URL = 'https://www.instagram.com/lavitto.comidas'
