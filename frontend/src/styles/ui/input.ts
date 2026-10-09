/** Base compartida por los campos de texto y las listas desplegables. */
export const inputStyles = [
  // text-base en mobile evita el zoom automático de iOS al enfocar
  'h-12 w-full rounded-xl border border-neutral-300 bg-surface px-4 text-base text-text shadow-xs transition',
  'placeholder:text-neutral-500',
  'hover:border-accent-300',
  'focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-200 focus-visible:outline-none',
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
