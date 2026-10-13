import { useState, type ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { passwordInputStyles } from '@/styles/ui'
import { Icon } from './Icon'
import { ICONS } from './icons'
import { Input } from './Input'

/** Campo de contraseña con un botón para ver lo que se escribió. */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={passwordInputStyles.root}>
      <Input
        type={visible ? 'text' : 'password'}
        className={cn(passwordInputStyles.input, className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className={passwordInputStyles.toggle}
      >
        <Icon d={visible ? ICONS.eyeOff : ICONS.eye} />
      </button>
    </div>
  )
}
