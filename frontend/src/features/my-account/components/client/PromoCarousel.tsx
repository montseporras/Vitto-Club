// Carrusel de promociones del Inicio (diseño V2): una tarjeta por promo, se desliza de costado y
// los puntitos de abajo marcan cuál se ve. Cada tarjeta abre el detalle de la promo.
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { promotionPath } from '../../lib/paths'
import { LOCAL_PROMOTIONS, type LocalPromotion } from '../../lib/promotions'

/** Ilustración de la promo: el ícono grande sobre un fondo cálido (no hay fotos de promociones). */
export function PromoArt({ promotion, className }: { promotion: LocalPromotion; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative grid place-items-center overflow-hidden bg-gradient-to-br from-beige via-accent-200 to-accent-400',
        className,
      )}
    >
      <span className="absolute -top-6 -left-6 size-24 rounded-full bg-white/30" />
      <span className="absolute -right-4 -bottom-8 size-20 rounded-full bg-white/25" />
      <span className="relative grid size-20 place-items-center rounded-full bg-white/80 text-accent-700 shadow-lg">
        <Icon d={promotion.icon} className="size-11" />
      </span>
    </div>
  )
}

export function PromoCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)

  const goTo = (index: number) => {
    const track = trackRef.current
    const slide = track?.children[index] as HTMLElement | undefined
    if (track && slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }

  return (
    <section aria-roledescription="carrusel" aria-label="Promociones" className="grid gap-3">
      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget
          const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth))
          if (index !== current) setCurrent(index)
        }}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-1 [&::-webkit-scrollbar]:hidden"
      >
        {LOCAL_PROMOTIONS.map((promotion, index) => (
          <Link
            key={promotion.slug}
            to={promotionPath(promotion.slug)}
            aria-roledescription="diapositiva"
            aria-label={`${promotion.tag} ${promotion.title}. ${index + 1} de ${LOCAL_PROMOTIONS.length}`}
            className={cn(
              'group grid w-full shrink-0 snap-center grid-cols-[42%_1fr] overflow-hidden rounded-3xl shadow-md shadow-accent-900/15',
              'transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
            )}
          >
            <PromoArt promotion={promotion} className="min-h-36" />
            <div className="flex items-center gap-2 bg-gradient-to-br from-accent-800 to-[#4f2714] p-4 text-white">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-accent-200">{promotion.tag}</p>
                <p className="mt-1 font-heading text-2xl leading-tight font-bold">{promotion.title}</p>
              </div>
              <Icon d={ICONS.chevronRight} className="size-6 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Puntitos: en el celular marcan la promo que se ve; desde tablet se ven todas juntas */}
      <div className="flex justify-center gap-2 md:hidden">
        {LOCAL_PROMOTIONS.map((promotion, index) => (
          <button
            key={promotion.slug}
            type="button"
            aria-label={`Ver promo ${index + 1}`}
            aria-current={index === current ? 'true' : undefined}
            onClick={() => goTo(index)}
            className="grid size-6 cursor-pointer place-items-center"
          >
            <span
              className={cn(
                'block h-2 rounded-full transition-[width,background-color] duration-200',
                index === current ? 'w-5 bg-accent-700' : 'w-2 bg-accent-200',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
