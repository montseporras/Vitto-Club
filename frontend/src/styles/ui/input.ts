/** Base compartida por los campos de texto y las listas desplegables. */
export const inputStyles = [
  // text-base en mobile evita el zoom automático de iOS al enfocar
  'h-12 w-full rounded-xl border border-neutral-300 bg-surface px-4 text-base text-text shadow-xs transition',
  'placeholder:text-neutral-500',
  'hover:border-accent-300',
  // Campo activo: borde de 2 px bien contrastado (1 px de borde + 1 px de sombra, sin mover el texto)
  // y un halo suave, para que quien navega con el teclado sepa siempre dónde está parado
  'focus:border-accent-700 focus:shadow-[0_0_0_1px_var(--color-accent-700),0_0_0_5px_var(--color-accent-100)] focus:outline-none',
  'aria-invalid:border-accent-600 aria-invalid:bg-accent-50 aria-invalid:ring-4 aria-invalid:ring-accent-100',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

/**
 * Solo lectura: se muestra el dato pero no se puede cambiar (ej.: documento al editar un cliente).
 * Va aparte de inputStyles porque un <select> siempre cumple :read-only y se vería bloqueado.
 */
export const inputReadOnlyStyles =
  'read-only:cursor-not-allowed read-only:bg-neutral-100 read-only:text-neutral-600 read-only:hover:border-neutral-300'

/** Contraseña con botón para mostrarla u ocultarla. */
export const passwordInputStyles = {
  root: 'relative',
  input: 'pr-13',
  toggle: [
    'absolute top-1/2 right-2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-accent-800 transition-colors',
    'hover:bg-accent-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
}

/** Lista desplegable: mismo aspecto que un Input, con flecha propia. */
export const selectStyles = {
  root: 'relative',
  select: 'cursor-pointer appearance-none pr-11',
  chevron:
    'pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-accent-800',
}

/** Texto de varios renglones (ej. motivo de un ajuste): mismo aspecto que un Input, alto libre. */
export const textareaStyles = 'h-auto min-h-12 resize-y py-2.5'

/** Interruptor (encendido / apagado). */
export const switchStyles = {
  root: [
    'group/switch inline-flex min-h-9 cursor-pointer items-center gap-2.5 rounded-full text-sm font-semibold',
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-700',
    'disabled:cursor-not-allowed aria-busy:cursor-progress',
  ].join(' '),
  textOn: 'text-accent-800',
  textOff: 'text-neutral-600',
  track: 'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
  trackOn: 'bg-olive',
  trackOff: 'bg-neutral-300 group-hover/switch:bg-neutral-400',
  thumb:
    'absolute top-1 grid size-5 place-items-center rounded-full bg-white shadow transition-[left] duration-200 ease-out motion-reduce:transition-none',
  thumbOn: 'left-6',
  thumbOff: 'left-1',
  spinner: 'size-3 animate-vitto-spin rounded-full border-2 border-neutral-400 border-r-transparent',
  text: 'min-w-[86px] text-left',
}

/** Fecha en tres campos (Día · Mes · Año): el ancho de cada uno anticipa cuánto entra. */
export const splitDateStyles = {
  root: 'flex items-start gap-2',
  part: 'flex flex-col items-center gap-0.5',
  short: 'w-16 px-0 text-center tabular-nums',
  long: 'w-22 px-0 text-center tabular-nums',
  caption: 'text-xs text-neutral-600',
}
