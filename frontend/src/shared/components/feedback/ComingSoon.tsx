type ComingSoonProps = {
  eyebrow: string
  title: string
  description: string
}

/** Lugar reservado para una pantalla que todavía no está construida. */
export function ComingSoon({ eyebrow, title, description }: ComingSoonProps) {
  return (
    <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-accent-200 bg-surface shadow-xl shadow-accent-800/10">
      <header className="bg-accent-700 px-6 py-7 text-white sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl leading-tight sm:text-4xl">{title}</h2>
      </header>
      <div className="px-6 py-10 sm:px-8">
        <span className="inline-block rounded-full bg-beige px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
          Próximamente
        </span>
        <p className="mt-3 max-w-prose text-base text-neutral-700">
          {description}
        </p>
      </div>
    </section>
  )
}
