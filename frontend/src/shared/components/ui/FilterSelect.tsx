import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cn } from '@/shared/lib/utils'
import { Icon } from './Icon'
import { ICONS } from './icons'

type FilterSelectOption = { value: string; label: string; disabled?: boolean }

type FilterSelectProps = {
  /** id del botón; lo usa el <label> de la celda o del campo. */
  id: string
  value: string
  options: FilterSelectOption[]
  onChange: (value: string) => void
  /**
   * 'bar': plano, de 34 px, para las celdas de una barra de filtros (Canjes y Consumos).
   * 'field': con el aspecto de un campo de texto (Auditoría y Clientes).
   */
  variant?: 'bar' | 'field'
  disabled?: boolean
  className?: string
}

/**
 * Lista desplegable con la estética de la app (mismos colores que el calendario), en lugar del
 * desplegable que dibuja el navegador. Se maneja con el mouse y con el teclado: flechas, Enter,
 * Espacio y Escape.
 */
export function FilterSelect({
  id,
  value,
  options,
  onChange,
  variant = 'field',
  disabled,
  className,
}: FilterSelectProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  const openList = () => {
    const index = options.findIndex((option) => option.value === value)
    setActive(index >= 0 ? index : 0)
    setOpen(true)
  }

  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  // Salta las opciones deshabilitadas al moverse con las flechas
  const move = (step: 1 | -1) => {
    let next = active
    for (let tries = 0; tries < options.length; tries += 1) {
      next = (next + step + options.length) % options.length
      if (!options[next].disabled) break
    }
    setActive(next)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openList()
      else move(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(active)
      else openList()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-2 text-left outline-none disabled:cursor-not-allowed',
          variant === 'bar'
            ? 'h-[34px] border-0 bg-transparent p-0 text-[13px] text-[#2b1a10]'
            : 'h-[42px] rounded-xl border border-[#ecd3bd] bg-white px-3 text-sm text-[#3b2a20] focus-visible:border-[#a9532b] focus-visible:ring-[3px] focus-visible:ring-[#f5d6bf] disabled:bg-[#fbf3ea] disabled:opacity-60',
        )}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <Icon
          d={ICONS.chevronDown}
          className={cn('size-4 shrink-0 text-[#7e3e20] transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute top-[calc(100%+6px)] left-0 z-60 max-h-64 min-w-full overflow-auto rounded-[14px] border border-[#f6d0b1] bg-white p-1.5 shadow-[0_20px_25px_-5px_rgba(126,62,32,0.15),0_8px_10px_-6px_rgba(126,62,32,0.12)]"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => !option.disabled && setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={cn(
                'cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] whitespace-nowrap text-[#2b1a10]',
                index === active && 'bg-[#fdf0e4]',
                option.value === value && 'bg-[#fbe6d4] font-bold',
                option.disabled && 'cursor-not-allowed text-[#b8a799]',
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
