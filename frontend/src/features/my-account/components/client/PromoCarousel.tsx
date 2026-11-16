// Carrusel de promociones del Inicio (diseño V2). En el celular pasa solo cada 8 segundos y se
// puede deslizar sin fin para los dos lados: después de la última vuelve la primera. Los puntitos
// marcan cuál se ve. Desde tablet se ven todas juntas. Cada tarjeta abre el detalle de la promo.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
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

// Cada cuánto pasa sola a la siguiente
const AUTOPLAY_MS = 8000
// Cuánto hay que arrastrar (px) para pasar de promo
const SWIPE_THRESHOLD = 50

function PromoSlide({ promotion, index, total }: { promotion: LocalPromotion; index: number; total: number }) {
  return (
    <Link
      to={promotionPath(promotion.slug)}
      draggable={false}
      aria-roledescription="diapositiva"
      aria-label={`${promotion.tag} ${promotion.title}. ${index + 1} de ${total}`}
      className={cn(
        'group grid h-full w-full grid-cols-[42%_1fr] overflow-hidden rounded-3xl shadow-md shadow-accent-900/15 select-none',
        'transition-transform duration-150 md:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
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
  )
}

export function PromoCarousel() {
  const promos = LOCAL_PROMOTIONS
  const total = promos.length
  const loops = total > 1
  // Pista con una copia de la última al principio y de la primera al final: así el paso de la
  // última a la primera se ve igual que cualquier otro, y después se salta sin animación
  const slides = loops ? [promos[total - 1], ...promos, promos[0]] : promos
  const [position, setPosition] = useState(loops ? 1 : 0)
  const [animated, setAnimated] = useState(true)
  const [dragOffset, setDragOffset] = useState(0)
  const drag = useRef<{ startX: number; moved: boolean } | null>(null)
  const current = loops ? (((position - 1) % total) + total) % total : 0

  // Pasa sola cada 8 segundos; si el cliente la mueve, el tiempo arranca de nuevo
  useEffect(() => {
    if (!loops || dragOffset !== 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setTimeout(() => {
      setAnimated(true)
      setPosition((value) => value + 1)
    }, AUTOPLAY_MS)
    return () => clearTimeout(timer)
  }, [loops, position, dragOffset])

  // Después del salto sin animación, la vuelve a prender para el próximo paso
  useEffect(() => {
    if (animated) return
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)))
    return () => cancelAnimationFrame(frame)
  }, [animated])

  const onTransitionEnd = () => {
    if (!loops) return
    if (position === 0) {
      setAnimated(false)
      setPosition(total)
    } else if (position === total + 1) {
      setAnimated(false)
      setPosition(1)
    }
  }

  const step = (direction: 1 | -1) => {
    setAnimated(true)
    setPosition((value) => Math.max(0, Math.min(total + 1, value + direction)))
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!loops) return
    drag.current = { startX: event.clientX, moved: false }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const offset = event.clientX - drag.current.startX
    if (Math.abs(offset) > 6) {
      drag.current.moved = true
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId)
      }
    }
    setDragOffset(offset)
  }
  const endDrag = () => {
    if (!drag.current) return
    if (dragOffset <= -SWIPE_THRESHOLD) step(1)
    else if (dragOffset >= SWIPE_THRESHOLD) step(-1)
    setDragOffset(0)
    // El click que sigue al arrastre no abre la promo
    const moved = drag.current.moved
    drag.current = moved ? { startX: 0, moved: true } : null
    if (moved) setTimeout(() => (drag.current = null), 0)
  }

  return (
    <section aria-roledescription="carrusel" aria-label="Promociones" className="grid gap-3">
      {/* Celular: carrusel */}
      <div className="overflow-hidden rounded-3xl md:hidden">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={(event) => {
            if (drag.current?.moved) event.preventDefault()
          }}
          onTransitionEnd={onTransitionEnd}
          className={cn('flex touch-pan-y', animated && dragOffset === 0 && 'transition-transform duration-500 ease-out')}
          style={{ transform: `translateX(calc(${-position * 100}% + ${dragOffset}px))` }}
        >
          {slides.map((promotion, index) => (
            <div
              key={`${promotion.slug}-${index}`}
              className="w-full shrink-0"
              aria-hidden={loops && (index === 0 || index === slides.length - 1) ? true : undefined}
              inert={loops && (index === 0 || index === slides.length - 1) ? true : undefined}
            >
              <PromoSlide promotion={promotion} index={(index - (loops ? 1 : 0) + total) % total} total={total} />
            </div>
          ))}
        </div>
      </div>

      {/* Tablet y compu: todas juntas */}
      <ul className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-1">
        {promos.map((promotion, index) => (
          <li key={promotion.slug}>
            <PromoSlide promotion={promotion} index={index} total={total} />
          </li>
        ))}
      </ul>

      {loops && (
        <div className="flex justify-center gap-2 md:hidden">
          {promos.map((promotion, index) => (
            <button
              key={promotion.slug}
              type="button"
              aria-label={`Ver promo ${index + 1}`}
              aria-current={index === current ? 'true' : undefined}
              onClick={() => {
                setAnimated(true)
                setPosition(index + 1)
              }}
              className="grid size-6 cursor-pointer place-items-center"
            >
              <span
                className={cn(
                  'block h-2 rounded-full transition-[width,background-color] duration-300',
                  index === current ? 'w-5 bg-accent-700' : 'w-2 bg-accent-200',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
