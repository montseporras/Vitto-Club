import { useFormState, useWatch, type Control, type FieldValues, type Path } from 'react-hook-form'

/**
 * Campos obligatorios que faltan completar o que tienen un error, con su etiqueta, en el orden en
 * que se pasan. Sirve para apagar el botón principal y decir qué falta (SubmitHint).
 */
export function useMissingFields<T extends FieldValues, C = unknown, O = T>(
  control: Control<T, C, O>,
  /** Campo → etiqueta. Los obligatorios, más los opcionales que se quieran informar si tienen error. */
  fields: Partial<Record<Path<T>, string>>,
  /** Campos opcionales: solo cuentan si tienen un error, no si están vacíos. */
  optional: Path<T>[] = [],
): string[] {
  const names = Object.keys(fields) as Path<T>[]
  const values = useWatch({ control, name: names }) as unknown[]
  const { errors } = useFormState({ control, name: names })

  return names.flatMap((name, index) => {
    const value = values[index]
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value === 'number' && Number.isNaN(value))
    const hasError = Boolean(getError(errors, name))
    if (hasError || (empty && !optional.includes(name))) return [fields[name] as string]
    return []
  })
}

function getError(errors: Record<string, unknown>, name: string): unknown {
  return name.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[key]
    return undefined
  }, errors)
}
