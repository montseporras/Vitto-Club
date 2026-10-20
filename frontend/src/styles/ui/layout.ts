/** Contenedor centrado de cada pantalla. */
export const pageStyles = 'mx-auto w-full max-w-4xl'

/** Tarjeta principal de una pantalla: tira clara con el título arriba + cuerpo. */
export const pageCardStyles =
  'overflow-hidden rounded-3xl border border-accent-200 bg-surface shadow-xl shadow-accent-800/10'
export const pageCardHeaderStyles =
  'relative overflow-hidden border-b border-accent-100 bg-accent-100/70 px-6 py-5 sm:px-8'
export const pageCardLogoStyles =
  'pointer-events-none absolute right-6 bottom-4 hidden h-16 w-auto opacity-10 sm:block'
export const pageCardEyebrowStyles = 'text-xs font-bold uppercase tracking-[0.18em] text-accent-700'
export const pageCardTitleStyles = 'mt-1 text-2xl leading-tight text-ink sm:text-3xl'
export const pageCardDescriptionStyles = 'mt-2 max-w-prose text-sm leading-relaxed text-neutral-700'
export const pageCardBodyStyles = 'px-5 py-6 sm:px-8 sm:py-8'

/** Variante de PageCard sin tira de color: título simple arriba del cuerpo. */
export const pageCardPlainTitleStyles = 'font-heading text-2xl text-ink sm:text-3xl'
export const pageCardPlainDescriptionStyles = 'mt-1.5 max-w-prose text-sm text-neutral-700'

/** Pantalla de ingreso/registro: panel de marca a la izquierda + formulario a la derecha. */
export const authShellStyles = {
  root: 'overflow-hidden rounded-3xl border border-accent-200 bg-surface shadow-xl shadow-accent-800/10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]',
  left: 'flex flex-col justify-center gap-3 bg-accent-600 px-8 py-10 text-white sm:px-10 lg:py-14',
  eyebrow: 'text-xs font-bold uppercase tracking-[0.18em]',
  title: 'font-heading text-4xl leading-tight sm:text-5xl',
  tagline: 'mt-2 max-w-sm font-heading text-lg italic text-white/90',
  right: 'px-6 py-8 sm:px-10 sm:py-10',
}

/** Bloque separado del anterior por una línea. */
export const dividedSectionStyles = 'mt-7 border-t border-accent-100 pt-7'

/** Título chico en mayúsculas sobre un bloque (ej. "Cuentas de prueba"). */
export const eyebrowStyles = 'text-xs font-bold uppercase tracking-[0.18em] text-accent-800'

/** Tarjeta secundaria dentro de una pantalla (ej. resumen del cliente). */
export const cardStyles =
  'rounded-2xl border border-accent-200 bg-accent-50/60 p-5 sm:p-6'
export const cardTitleStyles = 'text-2xl leading-tight'

/** Lista de datos etiqueta/valor. */
export const dataListStyles =
  'grid gap-x-6 gap-y-4 border-t border-accent-200 pt-5 sm:grid-cols-2'
export const dataListItemStyles = 'flex flex-col gap-0.5'
export const dataListTermStyles =
  'text-xs font-bold uppercase tracking-wide text-accent-800'
export const dataListValueStyles = 'text-base break-words text-text'

/** Texto de estado o ayuda (ej. "Buscando…", "No hay resultados"). */
export const statusTextStyles = 'text-base text-neutral-700'

/** Modal: fondo oscuro + panel con la estética de la tarjeta principal. */
export const modalStyles = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4',
  panel:
    'flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-accent-200 bg-surface shadow-xl shadow-accent-800/10',
  header:
    'flex shrink-0 items-start justify-between gap-4 bg-accent-700 px-6 py-5 text-white sm:px-8',
  eyebrow: 'text-xs font-bold uppercase tracking-[0.18em]',
  title: 'text-2xl leading-tight',
  titleWithEyebrow: 'mt-1 text-3xl leading-tight',
  description: 'mt-1.5 text-sm text-white/90',
  close: [
    'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-sm font-bold text-white transition-colors',
    'hover:bg-white/25',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  ].join(' '),
  body: 'overflow-y-auto px-5 py-6 sm:px-8',
}
