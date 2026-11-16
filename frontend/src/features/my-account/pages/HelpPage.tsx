// Mi perfil → Ayuda (diseño V2): preguntas frecuentes sobre el programa, con las reglas del
// contrato, y cómo comunicarse con el local.
import { INSTAGRAM_URL } from '@/features/auth'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { ClientPageHeader } from '../components/client/ClientUI'
import { CUSTOMER_PATHS } from '../lib/paths'

const QUESTIONS = [
  {
    question: '¿Cómo sumo puntos?',
    answer:
      'Mostrá tu documento en la caja cada vez que consumís en La Vitto. El consumo queda registrado y sumás puntos según el monto.',
  },
  {
    question: '¿Cómo canjeo una recompensa?',
    answer:
      'Elegí una recompensa en Recompensas y tocá "Canjear recompensa". Recibís un código que dura 15 minutos: mostralo en la caja. Los puntos se descuentan recién cuando lo usás.',
  },
  {
    question: '¿Mis puntos vencen?',
    answer:
      'Sí, cada carga de puntos vence después de un tiempo. En Mi nivel ves los próximos vencimientos, y te avisamos por mail 7 días antes.',
  },
  {
    question: '¿Cómo subo de nivel?',
    answer:
      'Hay tres niveles: Bronce, Plata y Oro. Subís con los puntos que sumás con tus consumos; canjear no te baja de nivel.',
  },
  {
    question: '¿Qué son las misiones?',
    answer:
      'Son desafíos del mes, como venir a merendar cierta cantidad de veces. Si la misión tiene recompensa, al completarla sumás puntos extra.',
  },
]

export function HelpPage() {
  return (
    <div className={cn(clientStyles.page, 'md:max-w-2xl lg:max-w-2xl')}>
      <ClientPageHeader title="Ayuda" backTo={CUSTOMER_PATHS.profile} />

      <ul className="grid gap-3">
        {QUESTIONS.map((item) => (
          <li key={item.question}>
            <details className={cn(clientStyles.card, 'group overflow-hidden')}>
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 font-bold text-ink transition-colors hover:bg-accent-50 [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{item.question}</span>
                <Icon
                  d={ICONS.chevronDown}
                  className="size-5 shrink-0 text-accent-700 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="px-5 pb-4 text-neutral-700">{item.answer}</p>
            </details>
          </li>
        ))}
      </ul>

      <section className={cn(clientStyles.card, 'grid justify-items-center gap-3 rounded-3xl p-6 text-center')}>
        <p className="font-heading text-xl font-bold text-ink">¿Te quedó alguna duda?</p>
        <p className="text-sm text-neutral-600">Escribinos por Instagram o consultá en el local.</p>
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className={clientStyles.outlineLink}>
          <Icon d={ICONS.instagram} className="size-5" />
          Escribinos por Instagram
        </a>
      </section>
    </div>
  )
}
