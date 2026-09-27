import type { UseFormRegisterReturn } from 'react-hook-form'

type Option = { value: string; label: string }

type SegmentedRadioProps = {
  legend: string
  options: Option[]
  field: UseFormRegisterReturn
}

/** Grupo de radios con forma de control segmentado: cómodo de tocar en caja. */
export function SegmentedRadio({
  legend,
  options,
  field,
}: SegmentedRadioProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold text-ink">
        {legend}
      </legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-accent-200 bg-accent-50 p-1">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              value={option.value}
              className="peer sr-only"
              {...field}
            />
            <span
              className={[
                'block rounded-lg px-3 py-2.5 text-center text-base font-semibold text-accent-800 transition-colors',
                'hover:bg-accent-100',
                'peer-checked:bg-accent-700 peer-checked:text-white peer-checked:shadow-sm',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-700',
              ].join(' ')}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
