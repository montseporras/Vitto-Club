import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { inputStyles, selectStyles } from '@/styles/ui'
import { Icon } from './Icon'
import { ICONS } from './icons'

type SelectProps = ComponentProps<'select'> & {
  options: { value: string; label: string }[]
}

/** Lista desplegable con la estética de los campos de texto. */
export function Select({ className, options, ...props }: SelectProps) {
  return (
    <div className={selectStyles.root}>
      <select
        className={cn(inputStyles, selectStyles.select, className)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon d={ICONS.chevronDown} className={selectStyles.chevron} />
    </div>
  )
}
