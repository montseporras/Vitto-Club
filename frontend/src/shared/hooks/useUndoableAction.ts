import { useCallback } from 'react'
import { useToast } from '@/shared/components/feedback/useToast'

/** Cuánto tiempo hay para tocar "Deshacer" antes de que la acción se mande al servidor. */
export const UNDO_WINDOW_MS = 5000

type UndoableAction = {
  /** Aviso que se muestra con el botón "Deshacer" (en presente: "Recompensa eliminada"). */
  message: string
  /** Lo que se manda al servidor si nadie deshace. */
  commit: () => Promise<unknown> | void
  /** Se llama al tocar "Deshacer" (ej. volver a mostrar la fila que se ocultó). */
  onUndo?: () => void
  /** Se llama si el servidor rechaza la acción (ej. para volver a mostrar la fila). */
  onError?: (error: unknown) => void
  /** Aviso al deshacer. */
  undoneMessage?: string
}

// Acciones que esperan su turno: si se cierra la pestaña, se mandan igual
const pending = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    for (const flush of pending) flush()
    pending.clear()
  })
}

/**
 * Acción que se puede deshacer. La pantalla refleja el cambio al instante, pero el pedido al
 * servidor sale recién cuando pasa la ventana para deshacer. Ningún endpoint del contrato revierte
 * acciones: deshacer es, en realidad, no mandar el pedido.
 */
export function useUndoableAction() {
  const showToast = useToast()

  return useCallback(
    ({ message, commit, onUndo, onError, undoneMessage = 'Acción deshecha' }: UndoableAction) => {
      let done = false
      const run = () => {
        if (done) return
        done = true
        pending.delete(run)
        Promise.resolve()
          .then(commit)
          .catch((error: unknown) => {
            onError?.(error)
            showToast('No pudimos completar la acción. Probá de nuevo.')
          })
      }
      const timer = setTimeout(run, UNDO_WINDOW_MS)
      pending.add(run)

      showToast(message, {
        duration: UNDO_WINDOW_MS,
        action: {
          label: 'Deshacer',
          onClick: () => {
            if (done) return
            done = true
            clearTimeout(timer)
            pending.delete(run)
            onUndo?.()
            showToast(undoneMessage)
          },
        },
      })
    },
    [showToast],
  )
}
