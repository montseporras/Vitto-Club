/** Aviso breve (toast): abajo y centrado, por encima de la barra inferior del Cliente. */
export const toastStyles = {
  region:
    'pointer-events-none fixed inset-x-0 bottom-24 z-[10050] flex justify-center px-4 sm:bottom-8',
  toast:
    'pointer-events-auto relative flex max-w-md animate-vitto-rise items-center gap-2 overflow-hidden rounded-full bg-accent-800 py-3 pr-3 pl-5 text-sm font-semibold text-white shadow-lg shadow-accent-900/25',
  icon: 'size-4 shrink-0',
  action: [
    'ml-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-sm font-bold text-white transition-colors',
    'hover:bg-white/25 active:scale-[0.97]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  ].join(' '),
  countdown: 'absolute bottom-0 left-0 h-0.5 w-full origin-left animate-vitto-shrink bg-white/60',
}

/** Estado vacío: nombra el estado, explica por qué está vacío y ofrece qué hacer. */
export const emptyStateStyles = {
  root: 'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-accent-200 bg-accent-50/50 px-6 py-9 text-center',
  compact: 'py-6',
  icon: 'mb-1 grid size-12 place-items-center rounded-full bg-accent-100 text-accent-700',
  title: 'font-heading text-lg font-bold text-ink',
  description: 'max-w-sm text-sm text-neutral-700',
  action: 'mt-3',
}

/** Qué falta para poder enviar un formulario (va arriba del botón principal). */
export const submitHintStyles = {
  root: 'flex w-full items-start gap-2 rounded-xl bg-accent-50 px-3.5 py-2.5 text-sm text-accent-800',
  icon: 'mt-0.5 size-4 shrink-0',
}

/** Requisitos de la contraseña: ✗ en gris que pasa a ✓ en verde a medida que se cumplen. */
export const passwordChecklistStyles = {
  root: 'mt-1 grid gap-1 text-sm',
  item: 'flex items-center gap-2 transition-colors duration-200',
  pending: 'text-neutral-600',
  done: 'text-olive-800',
  iconWrap: 'grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-200',
  iconPending: 'bg-neutral-200 text-neutral-600',
  iconDone: 'bg-olive text-white',
  icon: 'size-3',
}
