// Detalle de una promoción del local (diseño V2): ilustración, etiqueta, título, descripción y las
// condiciones con su ícono.
import { Navigate, useParams } from 'react-router'
import { Icon } from '@/shared/components/ui/Icon'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { ClientPageHeader } from '../components/client/ClientUI'
import { PromoArt } from '../components/client/PromoCarousel'
import { CUSTOMER_PATHS } from '../lib/paths'
import { findPromotion } from '../lib/promotions'

export function PromotionPage() {
  const { slug } = useParams()
  const promotion = findPromotion(slug)
  if (!promotion) return <Navigate to={CUSTOMER_PATHS.root} replace />

  return (
    <div className={cn(clientStyles.page, 'md:max-w-3xl lg:max-w-3xl')}>
      <ClientPageHeader title="Promoción" backTo={CUSTOMER_PATHS.root} />

      <article className="grid overflow-hidden rounded-3xl shadow-lg shadow-accent-900/15 sm:grid-cols-[42%_1fr]">
        <PromoArt promotion={promotion} className="min-h-52" />
        <div className="grid content-start gap-3 bg-gradient-to-br from-accent-800 to-[#4f2714] p-6 text-white">
          <span className="justify-self-start rounded-full bg-accent-200 px-3 py-1 text-sm font-bold text-accent-900">
            {promotion.tag}
          </span>
          <h2 className="font-heading text-3xl leading-tight font-bold">{promotion.title}</h2>
          <p className="text-white/90">{promotion.description}</p>
          <ul className="mt-1 grid gap-2.5">
            {promotion.details.map((detail) => (
              <li key={detail.text} className="flex items-center gap-2.5 text-sm font-semibold">
                <Icon d={detail.icon} className="size-5 shrink-0 text-accent-200" />
                {detail.text}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  )
}
