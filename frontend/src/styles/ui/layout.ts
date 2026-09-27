/** Contenedor centrado de cada pantalla. */
export const pageStyles = 'mx-auto w-full max-w-4xl'

/** Tarjeta principal de una pantalla: encabezado naranja a la izquierda (xl) + cuerpo. */
export const pageCardStyles =
  'overflow-hidden rounded-3xl border border-accent-200 bg-surface shadow-xl shadow-accent-800/10 xl:grid xl:grid-cols-[17rem_1fr]'
export const pageCardHeaderStyles =
  'relative overflow-hidden bg-accent-700 px-6 py-7 text-white sm:px-8 xl:py-10'
export const pageCardLogoStyles =
  'pointer-events-none absolute right-6 bottom-8 hidden h-48 w-auto opacity-20 xl:block'
export const pageCardEyebrowStyles = 'text-xs font-bold uppercase tracking-[0.18em]'
export const pageCardTitleStyles = 'mt-2 text-3xl leading-tight sm:text-4xl'
export const pageCardBodyStyles = 'px-5 py-6 sm:px-8 sm:py-8'

/** Bloque separado del anterior por una línea. */
export const dividedSectionStyles = 'mt-7 border-t border-accent-100 pt-7'

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
