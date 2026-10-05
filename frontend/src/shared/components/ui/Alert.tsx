import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import {
  alertIconStyles,
  alertListStyles,
  alertVariants,
  type AlertVariants,
} from '@/styles/ui'
import { Icon } from './Icon'
import { ICONS } from './icons'

const VARIANT_ICONS = {
  success: ICONS.check,
  error: ICONS.warning,
} as const

export type AlertProps = ComponentProps<'div'> & AlertVariants

export function Alert({
  className,
  variant = 'error',
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={variant === 'success' ? 'status' : 'alert'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon d={VARIANT_ICONS[variant ?? 'error']} className={alertIconStyles} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Detalle de mensajes (ej. los que devuelve el backend) dentro de un Alert. */
export function AlertMessages({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <ul className={alertListStyles}>
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}
