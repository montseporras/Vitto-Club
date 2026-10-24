import { useState } from 'react'
import { Link } from 'react-router'
import { LogoutDialog, useSession } from '@/features/auth'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { buttonVariants } from '@/styles/ui'
import { useMyProfile } from '../api/my-account.queries'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { ContactForm } from '../components/ContactForm'
import { MyDataSection } from '../components/MyDataSection'
import { ProfileSection } from '../components/ProfileSection'
import { ProgramStatusSection } from '../components/ProgramStatusSection'

type MyProfilePageProps = {
  /** Adónde lleva "Volver": el Inicio del Cliente (§3.10.3). */
  homePath: string
}

/** Mi perfil del Cliente (§3.10.3 a §3.10.5 y §3.11.1). */
export function MyProfilePage({ homePath }: MyProfilePageProps) {
  const session = useSession()
  const profile = useMyProfile()
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={homePath}
          aria-label="Volver"
          title="Volver"
          className={buttonVariants({ variant: 'secondary', className: 'w-10 px-0' })}
        >
          <Icon d={ICONS.arrowLeft} className="size-4" />
        </Link>
        <h2 className="text-2xl leading-tight text-ink">Mi perfil</h2>
      </div>

      <div className="rounded-3xl border border-accent-200 bg-surface px-5 py-6 shadow-sm sm:px-8">
        {profile.isPending ? (
          <StatusText>Cargando…</StatusText>
        ) : profile.isError ? (
          <Alert variant="error">{profile.error.message}</Alert>
        ) : (
          <>
            <MyDataSection profile={profile.data} />
            <ContactForm profile={profile.data} />
            <ProgramStatusSection />
            <ProfileSection title="Cambiar contraseña">
              <ChangePasswordForm
                idPrefix="profile-password"
                email={session.user?.email ?? profile.data.email}
                documentNumber={profile.data.documentNumber}
                hints={{
                  newPassword:
                    'Entre 8 y 64 caracteres. No puede ser tu mail ni tu número de documento.',
                }}
              />
            </ProfileSection>
          </>
        )}

        {/* Al final del perfil (§3.10.3): se puede cerrar sesión aunque el perfil no cargue */}
        <div className="mt-7 border-t border-accent-100 pt-7">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setConfirmingLogout(true)}
          >
            <Icon d={ICONS.logOut} className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      {confirmingLogout && <LogoutDialog onCancel={() => setConfirmingLogout(false)} />}
    </div>
  )
}
