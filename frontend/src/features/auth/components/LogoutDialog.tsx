import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import logoIso from '@/assets/logo-vitto-iso.png'
import { ROLES } from '@/domain/roles'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { logout } from '../api/auth.api'
import { LOGOUT_COPY } from '../logout-copy'
import { endSession, getSessionStartedAt, useSession } from '../session'

type LogoutDialogProps = {
  onCancel: () => void
}

// Fade-out del modal y tiempo mínimo del mensaje de guardado (ms)
const FADE_MS = 250
const MIN_SAVING_MS = 1200

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** "4h 25m", "37m" o "menos de 1m" */
function formatElapsed(ms: number) {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'menos de 1m'
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

/**
 * Cierre de sesión en tres etapas, igual para los tres roles (contrato §3.10.5):
 * confirmación → guardado (logo + mensaje) → pantalla de despedida (ruta
 * /sesion-cerrada, ver LoggedOutPage). Si la llamada falla, la sesión se cierra
 * igual en el front.
 */
export function LogoutDialog({ onCancel }: LogoutDialogProps) {
  const session = useSession()
  const [phase, setPhase] = useState<'confirm' | 'leaving' | 'saving'>('confirm')
  const [elapsed] = useState(() => formatElapsed(Date.now() - getSessionStartedAt()))

  // Escape cancela, como en el resto de los modales (no mientras se cierra)
  useEffect(() => {
    if (phase !== 'confirm') return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel, phase])

  if (session.status !== 'authenticated') return null

  const { user } = session
  const copy = LOGOUT_COPY[user.role]
  const fullName =
    user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email
  const initial = (user.firstName ?? user.email).charAt(0).toUpperCase()

  async function confirm() {
    setPhase('leaving')
    await wait(FADE_MS)
    setPhase('saving')
    // El mínimo es para que se vea el mensaje aunque la API responda enseguida
    await Promise.all([logout().catch(() => undefined), wait(MIN_SAVING_MS)])
    endSession({ farewellRole: user.role })
  }

  // Portal: el header es sticky y no debe recortar ni tapar el diálogo
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-accent-900/30 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      aria-describedby="logout-description"
    >
      {phase === 'saving' ? (
        <div
          role="status"
          className="flex w-full max-w-sm flex-col items-center rounded-[20px] bg-bg px-8 py-10 text-center shadow-2xl shadow-accent-800/20 motion-safe:animate-vitto-rise"
        >
          <div className="relative motion-safe:animate-vitto-pop">
            <img
              src={logoIso}
              alt=""
              className="size-28 object-contain motion-safe:animate-vitto-float"
            />
            {/* Vapor que sube desde la taza */}
            <span className="pointer-events-none absolute left-[66%] top-[18%] size-2 rounded-full bg-neutral-400/60 blur-[3px] motion-safe:animate-vitto-steam" />
            <span className="pointer-events-none absolute left-[74%] top-[22%] size-2 rounded-full bg-neutral-400/60 blur-[3px] [animation-delay:0.9s] motion-safe:animate-vitto-steam" />
          </div>
          <p
            id="logout-title"
            className="mt-6 font-heading text-xl font-bold text-accent-900"
          >
            Cerrando sesión
          </p>
          <p id="logout-description" className="mt-2 flex items-center gap-2.5 text-sm text-neutral-700">
            <span className="size-4 shrink-0 rounded-full border-2 border-accent-200 border-t-accent-700 motion-safe:animate-vitto-spin" />
            {copy.savingText}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'relative max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-[20px] border border-accent-100 bg-bg p-6 shadow-2xl shadow-accent-800/20 sm:p-8',
            phase === 'leaving'
              ? 'motion-safe:animate-vitto-modal-out'
              : 'motion-safe:animate-vitto-modal-in',
          )}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={phase === 'leaving'}
            aria-label="Cerrar"
            title="Cerrar"
            className="absolute right-4 top-4 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-accent-50 text-accent-800 transition-colors hover:bg-accent-100"
          >
            <Icon d={ICONS.close} className="size-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent-100 text-accent-700 shadow-lg shadow-accent-300/50">
              <Icon d={ICONS.logOut} className="size-6" />
            </span>
            <span className="mt-4 rounded-full bg-accent-100 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-accent-800">
              {copy.badge}
            </span>
            <h3
              id="logout-title"
              className="mt-3 font-heading text-3xl font-bold leading-tight text-accent-900"
            >
              ¿Cerrar sesión?
            </h3>
            <p id="logout-description" className="mt-3 text-sm text-neutral-700">
              {copy.confirmText}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-accent-50 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-700 font-heading font-bold text-white">
              {initial}
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-bold text-accent-900">{fullName}</p>
              <p className="truncate text-xs text-accent-700">
                Sesión activa · {ROLES[user.role]}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-neutral-600">
              <Icon d={ICONS.clock} className="size-3.5" />
              {elapsed}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <button
              type="button"
              autoFocus
              onClick={onCancel}
              disabled={phase === 'leaving'}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-accent-300 bg-accent-100 px-3 text-sm leading-tight font-bold whitespace-nowrap text-accent-900 shadow-md shadow-accent-800/15 transition-colors hover:bg-accent-200 sm:px-4"
            >
              {/* En el celular no entra el ícono: queda el texto solo, en una línea */}
              <Icon d={ICONS.close} className="hidden size-4 sm:block" />
              <span className="sm:hidden">Quedarme</span>
              <span className="hidden sm:inline">Permanecer acá</span>
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={phase === 'leaving'}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent-700 px-3 text-sm leading-tight font-bold whitespace-nowrap text-white shadow-lg shadow-accent-700/30 transition-colors hover:bg-accent-800 sm:px-4"
            >
              <Icon d={ICONS.logOut} className="hidden size-4 sm:block" />
              <span className="sm:hidden">Cerrar sesión</span>
              <span className="hidden sm:inline">Sí, cerrar sesión</span>
            </button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-600">
            <Icon d={ICONS.shieldCheck} className="size-3.5 shrink-0" />
            Terminal segura: tu sesión se cerrará de forma inmediata en este dispositivo.
          </p>
        </div>
      )}
    </div>,
    document.body,
  )
}
