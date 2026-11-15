import { Link, Navigate } from 'react-router'
import logoIso from '@/assets/logo-vitto-iso.png'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { INSTAGRAM_URL, LOGIN_PATH, LOGOUT_COPY } from '../logout-copy'
import { useSession } from '../session'

/**
 * Despedida después de cerrar sesión (ruta pública). Solo existe justo después
 * de un cierre voluntario: si se llega sin él (recarga, link directo), va al login.
 */
export function LoggedOutPage() {
  const session = useSession()

  if (session.status === 'restoring') return null
  if (session.status === 'authenticated') return <Navigate to="/" replace />
  if (!session.farewellRole) return <Navigate to={LOGIN_PATH} replace />

  const copy = LOGOUT_COPY[session.farewellRole]

  return (
    <main className="grid min-h-svh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md motion-safe:animate-vitto-rise">
        <div className="relative rounded-[28px] border border-accent-100 bg-accent-50/60 px-6 pb-8 pt-10 text-center shadow-xl shadow-accent-800/10 sm:px-10">
          <span className="absolute left-1/2 top-0 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-accent-100 bg-accent-100 px-4 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-accent-800">
            <Icon d={ICONS.check} className="size-3.5" />
            Sesión cerrada de forma segura
          </span>

          <img
            src={logoIso}
            alt="La Vitto Club"
            className="mx-auto size-32 object-contain motion-safe:animate-vitto-pop"
          />

          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-accent-900">
            {copy.farewellTitle}
          </h1>
          <p className="mt-3 text-neutral-700">{copy.farewellText}</p>

          <div className="mt-7 flex flex-col gap-3">
            <Link
              to={LOGIN_PATH}
              replace
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent-700 px-5 text-sm font-bold text-white shadow-lg shadow-accent-700/30 transition-colors hover:bg-accent-800"
            >
              <Icon d={ICONS.logOut} className="size-4 rotate-180" />
              {copy.farewellButton}
            </Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-5 text-sm font-bold text-accent-800 transition-colors hover:bg-accent-100"
            >
              <Icon d={ICONS.instagram} className="size-4" />
              Seguinos en Instagram
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-[0.65rem] font-bold uppercase tracking-[0.16em] text-neutral-600">
          La Vitto Comidas &amp; Café · Pasión artesanal
        </p>
      </div>
    </main>
  )
}
