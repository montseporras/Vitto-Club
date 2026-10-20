import type { UseFormRegisterReturn } from 'react-hook-form'
import { cn } from '@/shared/lib/utils'
import { segmentedStyles } from '@/styles/ui'

type Option = { value: string; label: string }

type SegmentedRadioProps = {
  legend: string
  options: Option[]
  field: UseFormRegisterReturn
  /** Muestra la opción elegida pero no deja cambiarla. */
  disabled?: boolean
  /** Más bajo, a la altura de los campos compactos (registro). */
  compact?: boolean
}

/** Grupo de radios con forma de control segmentado: cómodo de tocar en caja. */
export function SegmentedRadio({
  legend,
  options,
  field,
  disabled,
  compact,
}: SegmentedRadioProps) {
  return (
    <fieldset
      className={cn(segmentedStyles.root, compact && segmentedStyles.rootCompact)}
      disabled={disabled}
    >
      <legend
        className={cn(segmentedStyles.legend, compact && segmentedStyles.legendCompact)}
      >
        {legend}
      </legend>
      <div className={segmentedStyles.group}>
        {options.map((option) => (
          <label key={option.value} className={segmentedStyles.label}>
            <input
              type="radio"
              value={option.value}
              className="peer sr-only"
              {...field}
            />
            <span
              className={cn(
                segmentedStyles.option,
                compact && segmentedStyles.optionCompact,
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
