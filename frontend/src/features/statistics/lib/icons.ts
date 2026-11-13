import { ICONS } from '@/shared/components/ui/icons';

// Ícono de cada pestaña (los de Clientes, Consumos y Puntos son los del sistema).
export const TAB_ICONS = {
  clients: ICONS.users,
  consumptions: ICONS.receipt,
  points: ICONS.coins,
  program: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42zM7 7.5h1',
} as const;

// Trazos (viewBox 24x24) de los íconos de Estadísticas que no están en los del sistema.
// Van acá y no en shared/ para no tocar una pieza compartida.
export const STATISTICS_ICONS = {
  userCheck:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M16 11l2 2 4-4',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  trend: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  tag: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42zM7 7.5h1',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  info: 'M12 22a10 10 0 1 0 0-20a10 10 0 1 0 0 20M12 16v-4M12 8h.01',
} as const;
