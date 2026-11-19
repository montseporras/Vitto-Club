export const tableStyles = {
  wrapper: 'overflow-x-auto rounded-2xl border border-accent-200',
  table: 'w-full border-collapse text-left',
  head: 'bg-accent-100/70',
  headCell: 'px-3 py-3 text-xs font-bold uppercase tracking-wide text-accent-800',
  // Las filas se separan por contraste (una blanca, una tostada), no con líneas
  row: 'odd:bg-surface even:bg-accent-50/70',
  rowInteractive: 'cursor-pointer transition-colors hover:bg-accent-100/70',
  // Se pinta al pasar el mouse, sin ser clickeable (prototipo: .table tbody tr:hover)
  rowHighlight: 'transition-colors hover:bg-accent-100/70',
  cell: 'px-3 py-3 text-base text-text',
  // Formato de las pantallas de Administración (ajustes S5-56): encabezado de 13 px sobre
  // #fdf0e4, filas de 14 px con 10 × 12 px de margen.
  admin: {
    wrapper: 'overflow-x-auto rounded-2xl border border-[#f0d9c4] bg-white',
    head: 'bg-[#f8e3cf]',
    headCell: 'px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[#7a3a1d]',
    // Filas alternadas por contraste en lugar de líneas: en tablas largas el ojo sigue la fila
    row: 'odd:bg-white even:bg-[#fdf3e9]',
    rowHover: 'transition-colors hover:bg-[#f9e6d4]',
    cell: 'px-3 py-2.5 text-sm text-[#3b2a20]',
  },
}

/** Paginador debajo de una tabla: "Anterior · Página X de Y · Siguiente". */
export const paginationStyles = {
  root: 'mt-4 flex flex-wrap items-center justify-between gap-3',
  status: 'text-sm text-neutral-700',
  actions: 'flex gap-2',
}
