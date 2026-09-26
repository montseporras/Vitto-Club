import { NavLink, Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import logoIso from '@/assets/logo-vitto-iso-white.png'
import { cn } from '@/shared/lib/utils'

// Botones grandes, uno abajo del otro: cómodos de tocar en el mostrador (RNF-1, RNF-2).
const NAV = [
  {
    to: PATHS.caja.cliente,
    label: 'Cliente',
    icon: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  },
  {
    to: PATHS.caja.canje,
    label: 'Gestionar canje por código',
    icon: 'M3 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2ZM13 5v2m0 4v2m0 4v2',
  },
  {
    to: PATHS.caja.altaCliente,
    label: 'Alta manual de cliente',
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6m3-3h-6',
  },
]

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
    >
      <path d={d} />
    </svg>
  )
}

export function CajeroLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 bg-accent-700 shadow-md shadow-accent-900/20">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:py-3">
          {/* TODO: volver a la home cuando exista */}
          <button
            type="button"
            className={cn(
              'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-bg px-4 text-sm font-bold text-accent-800 shadow-sm transition-colors',
              'hover:bg-accent-50',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
            )}
          >
            <Icon d="m12 19-7-7 7-7M19 12H5" className="size-4" />
            Volver
          </button>

          <span aria-hidden="true" className="h-8 w-px bg-white/30" />

          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={logoIso}
              alt=""
              width={171}
              height={225}
              className="h-9 w-auto"
            />
            <h1 className="truncate text-lg text-white sm:text-2xl">
              Vitto Club
              <span className="font-sans text-base font-semibold sm:text-lg">
                {' '}
                · Mostrador
              </span>
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:py-8">
        <aside className="lg:w-72 lg:shrink-0">
          <nav
            aria-label="Opciones del mostrador"
            className="rounded-2xl border border-accent-200 bg-surface p-3 shadow-sm lg:sticky lg:top-24"
          >
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-800">
              Menú
            </p>
            <ul className="flex flex-col gap-2">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
                        isActive
                          ? 'bg-accent-700 text-white shadow-md shadow-accent-800/25'
                          : 'bg-accent-50 text-accent-800 hover:bg-accent-100',
                      )
                    }
                  >
                    <Icon d={item.icon} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <footer className="border-t-4 border-accent bg-beige/50 py-4">
        <p className="text-center font-heading text-sm italic text-accent-800">
          Sabores de casa, todos los días
        </p>
      </footer>
    </div>
  )
}
