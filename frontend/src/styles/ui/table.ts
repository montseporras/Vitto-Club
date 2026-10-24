export const tableStyles = {
  wrapper: 'overflow-x-auto rounded-2xl border border-accent-200',
  table: 'w-full border-collapse text-left',
  head: 'bg-accent-50',
  headCell: 'px-3 py-3 text-xs font-bold uppercase tracking-wide text-accent-800',
  row: 'border-t border-accent-100',
  rowInteractive: 'cursor-pointer transition-colors hover:bg-accent-50/60',
  // Se pinta al pasar el mouse, sin ser clickeable (prototipo: .table tbody tr:hover)
  rowHighlight: 'transition-colors hover:bg-accent-50/60',
  cell: 'px-3 py-3 text-base text-text',
}

/** Paginador debajo de una tabla: "Anterior · Página X de Y · Siguiente". */
export const paginationStyles = {
  root: 'mt-4 flex flex-wrap items-center justify-between gap-3',
  status: 'text-sm text-neutral-700',
  actions: 'flex gap-2',
}
