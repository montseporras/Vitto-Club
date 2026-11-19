import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { buttonLoadingStyles, buttonVariants, type ButtonVariants } from '@/styles/ui'

export type ButtonProps = ComponentProps<'button'> &
  ButtonVariants & {
    /**
     * La acción está en curso (guardar, recargar, cambiar una configuración): el botón muestra la
     * ruedita de carga y se va oscureciendo de izquierda a derecha, y no acepta otro click.
     */
    loading?: boolean
  }

export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      aria-busy={loading || undefined}
      disabled={disabled && !loading}
      {...props}
    >
      {loading && (
        <>
          <span aria-hidden="true" className={buttonLoadingStyles.fill} />
          <span aria-hidden="true" className={buttonLoadingStyles.spinner} />
        </>
      )}
      {children}
    </button>
  )
}
