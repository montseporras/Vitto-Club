import { cn } from '@/shared/lib/utils'
import { deleteButtonStyles } from '@/styles/ui'
import { Button, type ButtonProps } from './Button'
import { Icon } from './Icon'
import { ICONS } from './icons'

/**
 * Botón "Eliminar" con un tachito chico. Al pasar el cursor, el tachito se va pintando de rojo de
 * izquierda a derecha. El texto sigue diciendo "Eliminar" (o lo que se pase como hijo).
 */
export function DeleteButton({ children = 'Eliminar', className, variant = 'secondary', ...props }: ButtonProps) {
  return (
    <Button variant={variant} className={cn(deleteButtonStyles.root, className)} {...props}>
      {!props.loading && <TrashIcon />}
      {children}
    </Button>
  )
}

/** Tachito que se pinta de rojo de izquierda a derecha al pasar el cursor por el elemento padre. */
export function TrashIcon({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn(deleteButtonStyles.icon, className)}>
      <Icon d={ICONS.trash} className={deleteButtonStyles.iconBase} />
      <Icon d={ICONS.trash} className={deleteButtonStyles.iconRed} />
    </span>
  )
}
