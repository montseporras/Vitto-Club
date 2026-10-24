// Formato de los puntos en las pantallas del Cliente: punto de miles, como el prototipo (1.250),
// y el signo "−" en los negativos, para que el rojo no sea la única señal (frontend/CLAUDE.md §4.10).
export const formatPoints = (points: number) =>
  `${points < 0 ? '−' : ''}${Math.abs(points).toLocaleString('es-AR')}`
