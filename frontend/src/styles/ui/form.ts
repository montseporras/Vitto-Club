export const labelStyles = 'text-sm font-semibold text-ink'

/** Etiqueta + control + mensaje de error o ayuda. */
export const formFieldStyles = {
  root: 'flex flex-col gap-1.5',
  optional: 'ml-1.5 text-xs font-normal text-neutral-600',
  required: 'ml-0.5 text-accent-700',
  error: 'text-sm font-medium text-accent-700',
  hint: 'text-xs text-neutral-600',
}

/** Bloque del formulario: título en mayúsculas con línea debajo. */
export const formSectionStyles = {
  root: 'mt-7 first:mt-0',
  legend: 'mb-4 w-full border-b border-accent-100 pb-1.5',
  title: 'text-xs font-bold tracking-[0.06em] text-accent-800 uppercase',
  grid: 'grid gap-5 sm:grid-cols-2',
}

/** Botonera al pie del formulario. */
export const formActionsStyles = {
  root: 'mt-8 -mx-5 flex flex-col-reverse items-stretch gap-3 border-t border-accent-100 bg-bg px-5 py-5 sm:-mx-8 sm:flex-row sm:items-center sm:justify-end sm:px-8',
  rootWithMessage: 'sm:justify-between',
  message: 'text-sm text-neutral-600',
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
  // Variante compacta: a la altura de un campo de 40 px (registro)
  rootCompact: 'gap-1',
  legendCompact: 'mb-1',
  optionCompact: 'rounded-md px-2.5 py-1.5 text-sm',
}

/** Formulario de registro (prototipo v2): bloques más juntos y campos de 40 px. */
export const authFormStyles = {
  section: 'mt-3.5 first:mt-0',
  legend: 'mb-2 w-full border-b border-accent-100 pb-1',
  title: 'font-heading text-base font-bold text-accent-800',
  grid: 'grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-3 gap-y-4',
  input: 'h-10 rounded-lg px-3 text-sm',
  // Sin padding derecho: lo necesita el botón de mostrar la contraseña
  passwordInput: 'h-10 rounded-lg pl-3 text-sm',
  note: 'mt-3 text-[13px] text-neutral-700',
  actions: 'mt-3.5 flex flex-wrap items-center justify-end gap-3 border-t border-accent-100 pt-3',
}
