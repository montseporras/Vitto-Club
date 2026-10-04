export const labelStyles = 'text-sm font-semibold text-ink'

/** Etiqueta + control + mensaje de error o ayuda. */
export const formFieldStyles = {
  root: 'flex flex-col gap-1.5',
  optional: 'ml-1.5 text-xs font-normal text-neutral-600',
  error: 'text-sm font-medium text-accent-700',
  hint: 'text-xs text-neutral-600',
}

/** Bloque numerado del formulario. */
export const formSectionStyles = {
  root: 'mt-7 first:mt-0',
  legend: 'mb-4 flex items-center gap-3',
  step: 'grid size-8 place-items-center rounded-full bg-accent font-heading text-base font-bold text-ink',
  title: 'font-heading text-xl font-bold text-accent-800',
  grid: 'grid gap-5 sm:grid-cols-2',
}

/** Botonera al pie del formulario. */
export const formActionsStyles = {
  root: 'mt-8 flex flex-col-reverse items-stretch gap-3 border-t border-accent-100 pt-6 sm:flex-row sm:items-center sm:justify-end',
  message: 'text-sm text-neutral-700 sm:mr-auto',
}

/** Control segmentado (radios con forma de botones). */
export const segmentedStyles = {
  root: 'flex flex-col gap-1.5 disabled:cursor-not-allowed',
  legend: 'mb-1.5 text-sm font-semibold text-ink',
  group: 'grid grid-cols-2 gap-1 rounded-xl border border-accent-200 bg-accent-50 p-1',
  // Bloqueado: sin hover ni clic; el cursor lo pone el fieldset deshabilitado.
  label: 'cursor-pointer has-disabled:pointer-events-none',
  option: [
    'block rounded-lg px-3 py-2.5 text-center text-base font-semibold text-accent-800 transition-colors',
    'hover:bg-accent-100',
    'peer-checked:bg-accent-700 peer-checked:text-white peer-checked:shadow-sm',
    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-700',
    'peer-disabled:opacity-60',
  ].join(' '),
}
