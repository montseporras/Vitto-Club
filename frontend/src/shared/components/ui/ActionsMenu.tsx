import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/utils'
import { actionsMenuStyles, deleteButtonStyles } from '@/styles/ui'
import { TrashIcon } from './DeleteButton'
import { Icon } from './Icon'
import { ICONS } from './icons'

export type ActionsMenuItem = {
  label: string
  onSelect: () => void
  /** Ícono del sistema (./icons.ts). "Eliminar" lleva el tachito que se pinta de rojo. */
  icon?: string
  danger?: boolean
  disabled?: boolean
}

type ActionsMenuProps = {
  items: ActionsMenuItem[]
  /** Nombre accesible del botón (ej. "Acciones de Café con medialuna"). */
  label: string
  className?: string
}

const MENU_WIDTH = 176

/**
 * Botón de tres puntos que abre un menú flotante (popover) al lado. No bloquea la pantalla y se
 * cierra con un click afuera o con Escape. Va en un portal para que no lo recorte el scroll de
 * la tabla.
 */
export function ActionsMenu({ items, label, className }: ActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = (focusTrigger = false) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }

  // Ubica el menú debajo del botón, alineado a la derecha (o arriba si no entra)
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const place = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const height = menuRef.current?.offsetHeight ?? 0
      const below = rect.bottom + 6
      const top = below + height > window.innerHeight - 8 ? rect.top - height - 6 : below
      const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
      setPosition({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  // Click afuera y Escape cierran; al abrir, el foco va a la primera opción
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close(true)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  // Flechas arriba y abajo recorren las opciones
  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Tab') return
    const options = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
    )
    if (event.key === 'Tab') {
      close()
      return
    }
    event.preventDefault()
    const index = options.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1
    options[(next + options.length) % options.length]?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title="Más acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(actionsMenuStyles.trigger, open && actionsMenuStyles.triggerOpen, className)}
        onClick={(event) => {
          // Dentro de una fila clickeable: el menú no abre la fila
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Icon d={ICONS.moreVertical} className="size-5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className={actionsMenuStyles.menu}
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width: MENU_WIDTH,
            }}
            onKeyDown={onMenuKeyDown}
            onClick={(event) => event.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  actionsMenuStyles.item,
                  item.danger && cn(actionsMenuStyles.itemDanger, deleteButtonStyles.root),
                )}
                onClick={() => {
                  close(true)
                  item.onSelect()
                }}
              >
                {item.danger ? (
                  <TrashIcon />
                ) : item.icon ? (
                  <Icon d={item.icon} className="size-4" />
                ) : null}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
