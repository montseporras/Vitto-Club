import { useState } from 'react'
import { NavLink } from 'react-router'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { cn } from '@/shared/lib/utils'
import { sideNavStyles, sideNavVariants } from '@/styles/ui'

export type SideNavItem = {
  id: string
  label: string
  /** Trazo del ícono (ver ICONS). */
  icon: string
} & (
  | { to: string }
  | { active: boolean; onSelect: () => void }
)

type SideNavProps = {
  /** Nombre accesible del menú. */
  label: string
  /** Título visible arriba de las opciones. */
  title?: string
  items: SideNavItem[]
  /** Clave para recordar si el usuario lo dejó contraído. */
  storageKey: string
  /** Ancho expandido: md para espacios chicos (modales), lg para la app. */
  size?: 'md' | 'lg'
  /** Media query desde la que se puede contraer; sin ella, siempre. */
  collapsibleFrom?: string
  className?: string
}

function readCollapsed(key: string) {
  try {
    return localStorage.getItem(key) === 'collapsed'
  } catch {
    return false
  }
}

function saveCollapsed(key: string, collapsed: boolean) {
  try {
    localStorage.setItem(key, collapsed ? 'collapsed' : 'expanded')
  } catch {
    // Sin almacenamiento el menú igual funciona; solo no se recuerda.
  }
}

/**
 * Menú lateral desplegable. Contraído muestra solo los íconos, y al pasar el
 * cursor (o enfocar con teclado) cada ícono muestra su nombre en un recuadro.
 */
export function SideNav({
  label,
  title = 'Menú',
  items,
  storageKey,
  size = 'lg',
  collapsibleFrom,
  className,
}: SideNavProps) {
  const [collapsedPref, setCollapsedPref] = useState(() =>
    readCollapsed(storageKey),
  )
  const matches = useMediaQuery(collapsibleFrom ?? 'all')
  const canCollapse = collapsibleFrom ? matches : true
  const collapsed = canCollapse && collapsedPref

  const toggle = () => {
    setCollapsedPref(!collapsed)
    saveCollapsed(storageKey, !collapsed)
  }

  const itemContent = (item: SideNavItem) => (
    <>
      <Icon d={item.icon} className={sideNavStyles.icon} />
      <span className={cn(sideNavStyles.label, collapsed && sideNavStyles.labelCollapsed)}>
        {item.label}
      </span>
    </>
  )

  return (
    <nav
      aria-label={label}
      className={cn(sideNavVariants({ size, collapsed }), className)}
    >
      <div className={cn(sideNavStyles.header, collapsed && sideNavStyles.headerCollapsed)}>
        <p className={cn(sideNavStyles.title, collapsed && sideNavStyles.titleCollapsed)}>
          {title}
        </p>
        {canCollapse && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className={sideNavStyles.toggle}
          >
            <Icon d={collapsed ? ICONS.panelOpen : ICONS.panelClose} />
          </button>
        )}
      </div>

      <ul className={sideNavStyles.list}>
        {items.map((item) => (
          <li key={item.id} className={sideNavStyles.entry}>
            {'to' in item ? (
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    sideNavStyles.item,
                    isActive ? sideNavStyles.itemActive : sideNavStyles.itemIdle,
                  )
                }
              >
                {itemContent(item)}
              </NavLink>
            ) : (
              <button
                type="button"
                onClick={item.onSelect}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  sideNavStyles.item,
                  item.active ? sideNavStyles.itemActive : sideNavStyles.itemIdle,
                )}
              >
                {itemContent(item)}
              </button>
            )}

            {collapsed && (
              <span aria-hidden="true" className={sideNavStyles.tooltip}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
