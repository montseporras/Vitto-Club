import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { PASSWORD_MAX_BYTES, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/shared/lib/password'
import { cn } from '@/shared/lib/utils'
import { passwordChecklistStyles as styles } from '@/styles/ui'

type PasswordChecklistProps = {
  id?: string
  password: string
  /** Email de la cuenta: la contraseña no puede ser igual. */
  email?: string
  /** Contraseña actual (en un cambio): la nueva tiene que ser distinta. */
  currentPassword?: string
  /** Documento del cliente: la contraseña no puede ser igual. */
  documentNumber?: string
}

// Igual que normalizeDocumentNumber del backend
const normalizeDocument = (value: string) => value.replace(/[\s.-]/g, '').toUpperCase()

/**
 * Requisitos de la contraseña, visibles antes de escribir: arrancan con una cruz y cada uno pasa a
 * una tilde verde apenas se cumple. Son las reglas del contrato (§3.11), ni una más.
 */
export function PasswordChecklist({ id, password, email, currentPassword, documentNumber }: PasswordChecklistProps) {
  const filled = password.length > 0
  const tooManyBytes = new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES
  const rules = [
    {
      label: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
      done: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    },
    // Solo aparece si se pasa: los emojis y algunos símbolos ocupan más de un byte
    ...(tooManyBytes ? [{ label: 'Menos emojis o símbolos especiales (ocupan más lugar)', done: false }] : []),
    ...(email !== undefined
      ? [{ label: 'Distinta de tu email', done: filled && password !== email.trim() }]
      : []),
    ...(documentNumber
      ? [{ label: 'Distinta de tu número de documento', done: filled && password !== normalizeDocument(documentNumber) }]
      : []),
    ...(currentPassword !== undefined
      ? [{ label: 'Distinta de tu contraseña actual', done: filled && password !== currentPassword }]
      : []),
  ]

  return (
    <ul id={id} className={styles.root} aria-label="Requisitos de la contraseña">
      {rules.map((rule) => (
        <li key={rule.label} className={cn(styles.item, rule.done ? styles.done : styles.pending)}>
          <span className={cn(styles.iconWrap, rule.done ? styles.iconDone : styles.iconPending)}>
            <Icon d={rule.done ? ICONS.check : ICONS.close} className={styles.icon} strokeWidth={3} />
          </span>
          {rule.label}
          <span className="sr-only">{rule.done ? '(cumplido)' : '(pendiente)'}</span>
        </li>
      ))}
    </ul>
  )
}
