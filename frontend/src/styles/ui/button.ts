import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  [
    'relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full',
    // Animación simple al pasar el cursor (sube apenas) y al hacer click (se achica)
    'font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out',
    'hover:-translate-y-px active:translate-y-0 active:scale-[0.97]',
    'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
    'disabled:pointer-events-none disabled:opacity-60',
    // Cargando: no responde a clicks, pero no se "apaga" como un botón deshabilitado
    'aria-busy:pointer-events-none aria-busy:opacity-100',
  ],
  {
    variants: {
      variant: {
        // Principal: relleno y con sombra. Es el único que llama la atención.
        primary:
          // Naranja oscuro: sobre el #DA864D el texto blanco no se lee bien
          'bg-accent-700 text-white shadow-md shadow-accent-800/25 hover:bg-accent-800 hover:shadow-lg active:bg-accent-900',
        // Secundario: sin relleno ni sombra y con texto menos pesado, para no competir con el principal
        secondary:
          'border border-neutral-300 bg-surface font-semibold text-accent-800 hover:border-accent-300 hover:bg-accent-50',
        ghost: 'font-semibold text-accent-800 hover:bg-accent-50',
        // Acción destructiva (ej. confirmar "Eliminar" en un diálogo)
        danger:
          'bg-negative text-white shadow-md shadow-negative/25 hover:bg-[#8f1e18] hover:shadow-lg active:bg-[#741812]',
      },
      size: {
        // Acciones dentro de tablas, filtros y barras de herramientas: el tamaño completo no entra
        sm: 'h-9 px-4 text-sm',
        // Tamaño estándar en web y celular: 32 px a los costados, 18 px arriba y abajo, texto de 16 px
        md: 'min-h-13 px-8 py-[18px] text-base leading-4',
        // RNF-1/RNF-2: botones grandes en la pantalla de caja (36 × 20 px, texto de 18 px)
        lg: 'min-h-15 px-9 py-5 text-lg leading-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

/** Estado "cargando" del botón: ruedita + relleno que avanza de izquierda a derecha. */
export const buttonLoadingStyles = {
  // Capa que se va oscureciendo de izquierda a derecha mientras espera la respuesta
  fill: 'pointer-events-none absolute inset-y-0 left-0 -z-10 animate-vitto-load bg-black/15',
  spinner: 'size-4 shrink-0 animate-vitto-spin rounded-full border-2 border-current border-r-transparent',
}

/** Botón "Eliminar": el tachito se pinta de rojo de izquierda a derecha al pasar el cursor. */
export const deleteButtonStyles = {
  root: 'group/delete',
  icon: 'relative grid size-4 shrink-0',
  iconBase: 'col-start-1 row-start-1 size-4',
  iconRed: [
    'col-start-1 row-start-1 size-4 text-negative',
    '[clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-700 ease-out',
    'group-hover/delete:[clip-path:inset(0_0_0_0)] group-focus-visible/delete:[clip-path:inset(0_0_0_0)]',
    'motion-reduce:transition-none',
  ].join(' '),
}
