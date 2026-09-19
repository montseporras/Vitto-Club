import { NavLink, Outlet } from 'react-router'
import { PATHS } from '@/app/router/paths'
import logoIso from '@/assets/logo-vitto-iso.png'
import logoVitto from '@/assets/logo-vitto.png'
import { cn } from '@/shared/lib/utils'

// Pantalla completa, botones grandes, sin sidebar (RNF-1, RNF-2, RNF-5).
const NAV = [{ to: PATHS.caja.altaCliente, label: 'Alta manual de cliente' }]

export function CajeroLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-divider/50 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-3">
            <img
              src={logoIso}
              alt="La Vitto"
              width={48}
              height={64}
              className="h-9 w-auto sm:hidden"
            />
            <img
              src={logoVitto}
              alt="La Vitto — Sabores caseros"
              width={350}
              height={192}
              className="hidden h-11 w-auto sm:block"
            />
            <span className="rounded-full bg-accent-100 px-3 py-1 font-heading text-xs font-extrabold uppercase tracking-wide text-accent-800">
              Caja
            </span>
          </div>

          <nav className="flex gap-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-2 font-heading text-xs font-extrabold transition-colors sm:px-4 sm:text-sm',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    isActive
                      ? 'bg-accent text-bg shadow-sm'
                      : 'border border-divider/60 hover:bg-surface',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-divider/40 py-4">
        <p className="text-center text-xs text-neutral-600">
          Vitto Club · Sabores Caseros
        </p>
      </footer>
    </div>
  )
}
