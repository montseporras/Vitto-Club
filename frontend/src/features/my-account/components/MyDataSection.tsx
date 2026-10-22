import { DOCUMENT_TYPES } from '@/domain/documents'
import { Button } from '@/shared/components/ui/Button'
import { DataList } from '@/shared/components/ui/DataList'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { formatArgentinaDate } from '@/shared/lib/dates'
import type { MyProfile } from '../types/my-account'
import { ProfileSection } from './ProfileSection'

/**
 * "Mis datos" (§3.10.3): solo lectura, como texto. La foto llega en el Sprint 4
 * (decisión #9): por ahora el avatar vacío y "Cambiar foto" deshabilitado.
 */
export function MyDataSection({ profile }: { profile: MyProfile }) {
  return (
    <ProfileSection title="Mis datos">
      <div className="flex flex-wrap items-center gap-3">
        <div
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-full border border-accent-200 bg-accent-50 text-accent-300"
        >
          <Icon d={ICONS.user} className="size-8" />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled
          title="Disponible en el próximo sprint"
        >
          Cambiar foto
        </Button>
        <span className="text-sm text-neutral-700">Disponible en el próximo sprint</span>
      </div>

      <DataList
        className="mt-5"
        items={[
          { label: 'Nombre y apellido', value: `${profile.firstName} ${profile.lastName}` },
          {
            label: 'Documento',
            value: `${DOCUMENT_TYPES[profile.documentType].label} ${profile.documentNumber}`,
          },
          { label: 'Fecha de alta', value: formatArgentinaDate(profile.createdAt) },
        ]}
      />

      <p className="mt-4 text-sm text-neutral-700">
        Para cambiar estos datos, comunicate con el restaurante.
      </p>
    </ProfileSection>
  )
}
