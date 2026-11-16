import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { submitHintStyles } from '@/styles/ui'

type SubmitHintProps = {
  /** Etiquetas de los campos obligatorios que faltan o tienen un error. */
  missing: string[]
  id?: string
}

/**
 * Explica por qué el botón principal está apagado: "Para continuar, completá: Email, Teléfono".
 * Un botón gris sin explicación parece un error de la página.
 */
export function SubmitHint({ missing, id }: SubmitHintProps) {
  if (missing.length === 0) return null
  return (
    <p id={id} role="status" className={submitHintStyles.root}>
      <Icon d={ICONS.warning} className={submitHintStyles.icon} />
      <span>
        Para continuar, completá o corregí: <strong>{joinLabels(missing)}</strong>.
      </span>
    </p>
  )
}

function joinLabels(labels: string[]) {
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)}`
}
