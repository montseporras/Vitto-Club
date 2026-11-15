import logoIso from '@/assets/logo-vitto-iso.png'

/** Pantalla de carga al ingresar: logo y una barra que se llena. */
export function LoginLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 grid place-items-center bg-bg motion-safe:animate-vitto-fade-in"
    >
      <div className="flex flex-col items-center">
        <div className="relative motion-safe:animate-vitto-pop">
          <img
            src={logoIso}
            alt=""
            className="size-32 object-contain motion-safe:animate-vitto-float"
          />
          {/* Vapor que sube desde la taza */}
          <span className="pointer-events-none absolute left-[66%] top-[18%] size-2 rounded-full bg-neutral-400/60 blur-[3px] motion-safe:animate-vitto-steam" />
          <span className="pointer-events-none absolute left-[74%] top-[22%] size-2 rounded-full bg-neutral-400/60 blur-[3px] [animation-delay:0.9s] motion-safe:animate-vitto-steam" />
        </div>
        <div className="mt-6 h-1.5 w-44 overflow-hidden rounded-full bg-accent-100">
          <div className="h-full rounded-full bg-accent-700 motion-safe:animate-vitto-bar" />
        </div>
        <p className="mt-3 text-sm text-neutral-700">Ingresando…</p>
      </div>
    </div>
  )
}
