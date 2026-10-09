import { cva } from 'class-variance-authority'

/** Barra superior de la app (mostrador y administración). */
export const appHeaderStyles = {
  root: 'sticky top-0 z-20 bg-accent-700 shadow-md shadow-accent-900/20',
  inner: 'mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:py-3',
  back: [
    'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-bg px-4 text-sm font-bold text-accent-800 shadow-sm transition-colors',
    'hover:bg-accent-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  ].join(' '),
  divider: 'h-8 w-px bg-white/30',
  brand: 'flex min-w-0 items-center gap-2.5',
  logo: 'h-9 w-auto',
  title: 'truncate text-lg text-white sm:text-2xl',
  area: 'font-sans text-base font-semibold sm:text-lg',
  actions: 'ml-auto flex items-center gap-3',
  meta: 'hidden text-sm text-white/90 md:inline',
  // Botón con texto sobre el naranja (ej. cerrar sesión)
  action: [
    'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-bold text-white transition-colors',
    'hover:bg-white/25 disabled:pointer-events-none disabled:opacity-60',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  ].join(' '),
  // Botón redondo sobre el naranja (ej. configuración)
  iconButton: [
    'group inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors',
    'hover:bg-white/25',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
  ].join(' '),
}

export const appFooterStyles = {
  root: 'border-t-4 border-accent bg-beige/50 py-4',
  text: 'text-center font-heading text-sm italic text-accent-800',
}

/** Menú lateral desplegable: expandido muestra ícono + nombre; contraído, solo íconos. */
export const sideNavVariants = cva(
  'relative z-10 shrink-0 rounded-2xl border border-accent-200 bg-surface p-3 shadow-sm transition-[width] duration-300 ease-in-out',
  {
    variants: {
      size: { md: '', lg: '' },
      collapsed: { true: 'w-20', false: '' },
    },
    compoundVariants: [
      { size: 'md', collapsed: false, className: 'w-68' },
      { size: 'lg', collapsed: false, className: 'w-full lg:w-76' },
    ],
    defaultVariants: { size: 'lg', collapsed: false },
  },
)

export const sideNavStyles = {
  header: 'flex h-8 items-center justify-between gap-2 pb-2 pl-2',
  headerCollapsed: 'justify-center pl-0',
  title:
    'overflow-hidden text-xs font-bold whitespace-nowrap uppercase tracking-[0.18em] text-accent-800 transition-opacity duration-200',
  titleCollapsed: 'w-0 opacity-0',
  toggle: [
    'grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-accent-800 transition-colors',
    'hover:bg-accent-100',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
  list: 'flex flex-col gap-2',
  entry: 'group/nav relative',
  item: [
    'flex min-h-12 w-full cursor-pointer items-center overflow-hidden rounded-xl px-4 py-3 text-left text-base font-semibold transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
  ].join(' '),
  itemActive: 'bg-accent-700 text-white shadow-md shadow-accent-800/25',
  itemIdle: 'bg-accent-50 text-accent-800 hover:bg-accent-100',
  icon: 'size-5 shrink-0',
  label:
    'ml-3 overflow-hidden whitespace-nowrap transition-[opacity,margin] duration-300',
  labelCollapsed: 'ml-0 opacity-0',
  // Nombre de la sección al pasar el cursor sobre el ícono (solo con el menú contraído)
  tooltip: [
    'pointer-events-none invisible absolute top-1/2 left-full z-30 ml-3 -translate-x-1 -translate-y-1/2 opacity-0',
    'rounded-lg bg-accent-700 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-accent-900/25',
    'transition-[opacity,translate] duration-150',
    'before:absolute before:top-1/2 before:-left-1 before:size-2.5 before:-translate-y-1/2 before:rotate-45 before:bg-accent-700',
    'group-hover/nav:visible group-hover/nav:translate-x-0 group-hover/nav:opacity-100',
    'group-focus-within/nav:visible group-focus-within/nav:translate-x-0 group-focus-within/nav:opacity-100',
  ].join(' '),
}
