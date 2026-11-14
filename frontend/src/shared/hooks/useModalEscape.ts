import { useEffect, useRef } from 'react'

// Modales abiertos que escuchan Escape, del más viejo al más nuevo. Solo responde el último: si hay
// un modal dentro de otro (por ejemplo, "Crear empleado" dentro de Configuración), Escape cierra
// únicamente el de arriba.
const openModals: symbol[] = []

/**
 * Escape cierra el modal (A4-13). `enabled = false` lo deja sin escuchar, por ejemplo mientras
 * se muestra otro diálogo encima que maneja Escape por su cuenta.
 */
export function useModalEscape(onEscape: () => void, enabled = true) {
  // La función cambia en cada render; si el efecto dependiera de ella, el modal se volvería a anotar
  // al final de la lista y pasaría a ser "el de arriba" aunque se hubiera abierto antes.
  const latest = useRef(onEscape)
  useEffect(() => {
    latest.current = onEscape
  })

  useEffect(() => {
    if (!enabled) return

    const id = Symbol('modal')
    openModals.push(id)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModals[openModals.length - 1] === id) latest.current()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      openModals.splice(openModals.indexOf(id), 1)
    }
  }, [enabled])
}
