import type { ComponentProps } from 'react'
import { maskDate } from '@/shared/lib/dates'
import { Input } from './Input'

/**
 * Fecha como texto 'DD/MM/AAAA'. Reemplaza al input type="date": ese campo
 * corrige solo lo que se tipea (00/00/1990 pasa a 01/01/1990) y descarta sin
 * avisar las fechas incompletas, y cada navegador lo hace distinto.
 */
export function DateInput({
  onChange,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/AAAA"
      maxLength={10}
      autoComplete="off"
      onChange={(event) => {
        event.target.value = maskDate(event.target.value)
        onChange?.(event)
      }}
      {...props}
    />
  )
}
