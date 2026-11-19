// Mi perfil → Mis datos (§3.10.3 a §3.10.5 y §3.11.1): los datos fijos, el contacto editable y
// el cambio de contraseña, con el diseño V2.
import { useSession } from '@/features/auth'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { useMyProfile } from '../api/my-account.queries'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { ClientPageHeader } from '../components/client/ClientUI'
import { ContactForm } from '../components/ContactForm'
import { MyDataSection } from '../components/MyDataSection'
import { ProfileSection } from '../components/ProfileSection'
import { CUSTOMER_PATHS } from '../lib/paths'

export function ProfileDataPage() {
  const session = useSession()
  const profile = useMyProfile()

  return (
    <div className={cn(clientStyles.page, 'md:max-w-2xl lg:max-w-2xl')}>
      <ClientPageHeader title="Mis datos" backTo={CUSTOMER_PATHS.profile} />

      <div className={cn(clientStyles.card, 'rounded-3xl px-5 py-6 sm:px-8')}>
        {profile.isPending ? (
          <StatusText>Cargando…</StatusText>
        ) : profile.isError ? (
          <Alert variant="error">{profile.error.message}</Alert>
        ) : (
          <>
            <MyDataSection profile={profile.data} />
            <ContactForm profile={profile.data} />
            <ProfileSection title="Cambiar contraseña">
              <ChangePasswordForm
                idPrefix="profile-password"
                email={session.user?.email ?? profile.data.email}
                documentNumber={profile.data.documentNumber}
              />
            </ProfileSection>
          </>
        )}
      </div>
    </div>
  )
}
