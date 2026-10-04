import type { UseFormRegisterReturn } from 'react-hook-form'
import { segmentedStyles } from '@/styles/ui'

type Option = { value: string; label: string }

type SegmentedRadioProps = {
  legend: string
  options: Option[]
  field: UseFormRegisterReturn
  /** Muestra la opción elegida pero no deja cambiarla. */
  disabled?: boolean
}

/** Grupo de radios con forma de control segmentado: cómodo de tocar en caja. */
export function SegmentedRadio({
  legend,
  options,
  field,
  disabled,
}: SegmentedRadioProps) {
  return (
    <fieldset className={segmentedStyles.root} disabled={disabled}>
      <legend className={segmentedStyles.legend}>{legend}</legend>
      <div className={segmentedStyles.group}>
        {options.map((option) => (
          <label key={option.value} className={segmentedStyles.label}>
            <input
              type="radio"
              value={option.value}
              className="peer sr-only"
              {...field}
            />
            <span className={segmentedStyles.option}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
