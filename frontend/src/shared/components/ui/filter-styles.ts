// Clases de los controles de las barras de filtros de Administración (ver FilterBar.tsx).

/** Control de una celda de la barra: sin borde ni fondo, de 34 px de alto. */
export const filterControlClass =
  'h-[34px] w-full border-0 bg-transparent p-0 text-[13px] text-[#2b1a10] outline-none placeholder:text-[#9c8f82]'

/** Campo suelto (prototipo: .input). */
export const looseInputClass = [
  'h-[42px] w-full rounded-xl border border-[#ecd3bd] bg-white px-3 text-sm text-[#3b2a20] outline-none',
  'placeholder:text-[#9c8f82]',
  'focus-visible:border-[#a9532b] focus-visible:ring-[3px] focus-visible:ring-[#f5d6bf]',
  'disabled:bg-[#fbf3ea] disabled:cursor-not-allowed',
].join(' ')
