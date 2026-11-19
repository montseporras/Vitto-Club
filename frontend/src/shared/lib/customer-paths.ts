// Rutas de la vista del Cliente (rediseño "App Fidelización V2"). Están en `shared/` porque las
// usan el router (`app/`) y las pantallas del feature `my-account`, que no puede importar `app/`.
export const CUSTOMER_PATHS = {
  root: '/mi-cuenta',
  promotion: '/mi-cuenta/promos/:slug',
  redemptions: '/mi-cuenta/canjes',
  history: '/mi-cuenta/historial',
  missions: '/mi-cuenta/misiones',
  rewards: '/mi-cuenta/recompensas',
  rewardDetail: '/mi-cuenta/recompensas/:id',
  profile: '/mi-cuenta/perfil',
  profileData: '/mi-cuenta/perfil/datos',
  profileLevel: '/mi-cuenta/perfil/nivel',
  profileNotifications: '/mi-cuenta/perfil/notificaciones',
  profileHelp: '/mi-cuenta/perfil/ayuda',
} as const
