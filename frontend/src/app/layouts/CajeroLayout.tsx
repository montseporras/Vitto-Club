import { NavLink, Outlet } from 'react-router'
import { cn } from '@/shared/lib/utils'

// Pantalla completa, botones grandes, sin sidebar (RNF-1, RNF-2, RNF-5).
const NAV: { to: string; label: string }[] = []

export function CajeroLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b-2 border-divider bg-bg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-lg">Vitto Club — Caja</h1>
          <nav className="flex gap-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-[var(--radius)] px-4 py-2 font-heading text-sm font-extrabold',
                    isActive
                      ? 'bg-accent text-bg'
                      : 'border border-divider hover:bg-surface',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
