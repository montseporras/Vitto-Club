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
// Ocupa todo el alto entre el encabezado y el pie (prototipo v2, vista de ingreso).
// En celular el panel de marca va arriba, a lo ancho, y la página se desplaza entera.
export const authShellStyles = {
  root: 'flex w-full flex-1 flex-wrap bg-surface md:min-h-0',
  // #b8653d: color del panel en el prototipo (no hay un tono igual en la paleta)
  left: 'relative flex min-h-[220px] max-w-full shrink-0 grow-0 basis-full flex-col justify-center overflow-hidden bg-[#b8653d] px-6 py-10 text-white md:px-[clamp(32px,6vw,96px)]',
  // Ancho del panel: más angosto en el registro, que tiene más campos
  leftWide: 'md:basis-[60%]',
  leftNarrow: 'md:basis-[38%]',
  logo: 'pointer-events-none absolute -right-10 -bottom-10 h-[min(70%,460px)] w-auto opacity-[.12]',
  eyebrow: 'relative text-xs font-bold uppercase tracking-[0.18em]',
  title: 'relative mt-2.5 font-heading text-[44px] leading-[1.1] font-bold tracking-[-0.01em] text-white',
  tagline: 'relative mt-5 max-w-[22ch] font-heading text-[clamp(22px,2.4vw,32px)] leading-[1.3] font-semibold italic',
  description: 'relative mt-3 max-w-[65ch] text-sm leading-relaxed text-white/90',
  right: 'flex min-w-0 flex-[1_1_360px] flex-col justify-center-safe px-[clamp(24px,4vw,64px)] py-7 md:max-h-full md:overflow-y-auto',
  // Ancho del formulario de ingreso, de las pestañas y de los avisos
  narrow: 'mx-auto w-full max-w-[440px]',
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

/** Puntos con signo: verdes si suman, rojos si restan o si el saldo es negativo. */
export const pointsToneStyles = {
  positive: 'text-olive-800',
  negative: 'text-negative',
}

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
  // Cruz en la esquina, para diálogos sin encabezado naranja (ej. cerrar sesión)
  closeIcon: [
    'absolute top-4 right-4 grid size-9 cursor-pointer place-items-center rounded-full text-accent-800 transition-colors',
    'hover:bg-accent-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
}
