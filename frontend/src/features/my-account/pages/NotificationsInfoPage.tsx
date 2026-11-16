// Mi perfil → Notificaciones (diseño V2). Los avisos del programa llegan solo por correo (S5-10):
// esta pantalla cuenta cuáles son y a qué mail llegan. El contrato no tiene preferencias del
// Cliente para apagarlos, así que no hay interruptores.
import { Link } from 'react-router'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { useMyProfile } from '../api/my-account.queries'
import { ClientPageHeader, RowIcon } from '../components/client/ClientUI'
import { CUSTOMER_PATHS } from '../lib/paths'

// Los cuatro tipos del contrato (S5 §2.4), contados para el Cliente
const NOTICES = [
  {
    icon: ICONS.clock,
    title: 'Vencimiento de puntos',
    text: 'Te avisamos 7 días antes de que venzan tus puntos, para que los aproveches.',
  },
  {
    icon: ICONS.gift,
    title: 'Cumpleaños',
    text: 'El día de tu cumpleaños te mandamos un saludo. Cargá tu fecha de nacimiento en Mis datos.',
  },
  { icon: ICONS.sparkles, title: 'Promociones', text: 'Las novedades y promos de La Vitto.' },
  { icon: ICONS.target, title: 'Misiones', text: 'Avisos sobre tus misiones del mes.' },
]

export function NotificationsInfoPage() {
  const profile = useMyProfile()

  return (
    <div className={cn(clientStyles.page, 'md:max-w-2xl lg:max-w-2xl')}>
      <ClientPageHeader title="Notificaciones" backTo={CUSTOMER_PATHS.profile} />

      <div className={cn(clientStyles.card, 'flex items-center gap-3 rounded-3xl p-4')}>
        <RowIcon icon={ICONS.mail} />
        <p className="min-w-0 flex-1 text-sm">
          Te avisamos por mail a{' '}
          {profile.data ? (
            <strong className="break-all">{profile.data.email}</strong>
          ) : (
            <StatusText className="inline">tu correo</StatusText>
          )}
          .{' '}
          <Link to={CUSTOMER_PATHS.profileData} className="font-semibold text-accent-800 underline underline-offset-2">
            Cambiar mail
          </Link>
        </p>
      </div>

      <ul className={clientStyles.list}>
        {NOTICES.map((notice) => (
          <li key={notice.title} className={cn(clientStyles.row, 'items-start py-4')}>
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700">
              <Icon d={notice.icon} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{notice.title}</p>
              <p className="text-sm text-neutral-600">{notice.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
