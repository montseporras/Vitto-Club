// Vista del Cliente (rediseño "App Fidelización V2"): la estructura del PDF con la estética de
// La Vitto (naranjas del manual, DM Sans y Playfair en los títulos).

/** Barra de pestañas: abajo en el celular, arriba (en la barra de la marca) desde tablet. */
export const clientNavStyles = {
  // Celular: panel blanco fijo abajo, con las esquinas de arriba redondeadas
  bottom:
    'fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-accent-100 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px] shadow-accent-900/25 backdrop-blur md:hidden',
  bottomList: 'mx-auto grid max-w-xl grid-cols-4 px-2 pt-2 pb-2.5',
  bottomItem: [
    'relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-xs font-semibold transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
  bottomActive: 'text-accent-700',
  bottomIdle: 'text-neutral-700 hover:text-accent-700',
  // Rayita debajo de la pestaña activa (como el PDF)
  indicator: 'absolute -bottom-0.5 h-1 w-8 rounded-full bg-accent-700',
  // Tablet y compu: pestañas en la barra de arriba
  top: 'sticky top-0 z-30 hidden bg-accent-700 shadow-md shadow-accent-900/20 md:block',
  topInner: 'mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-3',
  topList: 'ml-auto flex items-center gap-1',
  topItem: [
    'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  ].join(' '),
  topActive: 'bg-white text-accent-800 shadow-sm',
  topIdle: 'text-white/90 hover:bg-white/15 hover:text-white',
}

/** Bloques que se repiten en las pantallas del Cliente. */
export const clientStyles = {
  page: 'mx-auto grid w-full max-w-xl grid-cols-[minmax(0,1fr)] gap-6 md:max-w-3xl lg:max-w-5xl',
  // Encabezado de la pantalla: título a la izquierda, "Consultas y reservas" a la derecha y una
  // línea naranja que lo separa del contenido
  header:
    'relative -mx-4 -mt-2 flex min-h-14 items-center gap-2 border-b-2 border-accent-200 px-4 pb-3 after:absolute after:-bottom-0.5 after:left-4 after:h-0.5 after:w-12 after:rounded-full after:bg-accent-700 md:mx-0 md:mt-0 md:px-0 md:after:left-0',
  title: 'min-w-0 flex-1 truncate font-heading text-2xl font-bold text-ink md:text-3xl',
  back: [
    '-ml-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink transition-colors',
    'hover:bg-accent-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
  // Botón chico de WhatsApp: se ve, pero no compite con el título
  contact: [
    'inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-accent-200 bg-surface px-2.5 text-[11px] font-bold whitespace-nowrap text-accent-800 shadow-sm transition-[background-color,transform] duration-150',
    'hover:bg-accent-50 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
  // Encabezado de una sección ("Recompensas disponibles")
  section: 'grid gap-3',
  sectionHeader: 'flex items-center gap-2.5',
  sectionIcon: 'size-6 shrink-0 text-ink',
  sectionTitle: 'flex-1 font-heading text-xl font-bold text-ink',
  // Tarjeta blanca
  card: 'rounded-2xl border border-accent-100 bg-surface shadow-sm shadow-accent-900/5',
  // Fila de una lista dentro de una tarjeta, separada por contraste
  list: 'overflow-hidden rounded-2xl border border-accent-100 bg-surface shadow-sm shadow-accent-900/5',
  row: 'flex min-h-16 items-center gap-3 px-4 py-3 even:bg-accent-50/60',
  rowLink: [
    'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors even:bg-accent-50/60',
    'hover:bg-accent-100/60 focus-visible:bg-accent-100/60 focus-visible:outline-none',
  ].join(' '),
  rowTitle: 'truncate font-bold text-ink',
  rowMeta: 'text-sm text-neutral-600',
  chevron: 'size-5 shrink-0 text-accent-700',
  // Pastilla de puntos ("250 pts")
  pill: 'inline-flex items-center rounded-full bg-accent-100 px-3 py-1 text-sm font-bold text-accent-800 tabular-nums',
  // Botón con borde redondeado ("Ver historial", "Ver todas las recompensas")
  outlineLink: [
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-accent-700 px-5 text-sm font-bold text-accent-800 transition-[background-color,transform] duration-150',
    'hover:bg-accent-50 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
  // Botón cuadrado chico con ícono (↗ de Misiones)
  iconLink: [
    'grid size-11 place-items-center rounded-xl border-2 border-accent-700 text-accent-800 transition-[background-color,transform] duration-150',
    'hover:bg-accent-50 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
  // Barra de progreso
  track: 'h-2.5 flex-1 overflow-hidden rounded-full bg-accent-100',
  bar: 'h-full rounded-full bg-accent-700 transition-[width] duration-500',
}
