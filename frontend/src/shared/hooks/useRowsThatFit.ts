import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

// Filas por página que entran en el alto de la pantalla (ajustes S5-57): mínimo 3, y el
// backend acepta hasta 100 por `limit`.
const MIN_ROWS = 3
const MAX_ROWS = 100

// Alturas que se usan mientras todavía no hay una tabla dibujada para medir.
const FALLBACK_HEADER_HEIGHT = 44
const FALLBACK_ROW_HEIGHT = 56
const FALLBACK_PAGER_HEIGHT = 52

// Lo que queda debajo del paginado (que ya lleva sus 16 px de aire arriba): 22 px de margen
// interno del recuadro y 32 px entre el recuadro y el borde de la pantalla.
const SPACE_BELOW_PAGER = 22 + 32

type UseRowsThatFitOptions = {
  /** Contenedor de la tabla (encabezado + filas). Tiene que estar siempre en la pantalla. */
  areaRef: RefObject<HTMLElement | null>
  /** Paginado de abajo; si todavía no se dibujó, se usa una altura estimada. */
  pagerRef?: RefObject<HTMLElement | null>
  /** Cantidad de filas hasta que se pueda medir (la de antes de este ajuste). */
  initial: number
  /** Alto en px de lo que va entre la tabla y el paginado (ej. un botón debajo de la tabla). */
  extraBelow?: number
}

/**
 * Cuántas filas entran entre el comienzo de la tabla y el paginado, sin que el recuadro pase
 * el borde de abajo de la pantalla.
 *
 * Para que no oscile entre dos valores cuando las filas tienen distinto alto, se mide con la
 * fila más alta que se vio: si después aparece una más alta, el número baja y queda fijo hasta
 * el próximo cambio de tamaño de la ventana.
 */
export function useRowsThatFit({
  areaRef,
  pagerRef,
  initial,
  extraBelow = 0,
}: UseRowsThatFitOptions) {
  const [rows, setRows] = useState(initial)
  const tallestRow = useRef(0)

  const measure = useCallback(() => {
    const area = areaRef.current
    if (!area) return

    const top = area.getBoundingClientRect().top + window.scrollY
    const headerHeight =
      area.querySelector('thead')?.getBoundingClientRect().height || FALLBACK_HEADER_HEIGHT

    // Las filas que se abren (detalle de Auditoría) llevan data-fit-ignore y no cuentan.
    area.querySelectorAll('tbody > tr:not([data-fit-ignore])').forEach((row) => {
      tallestRow.current = Math.max(tallestRow.current, row.getBoundingClientRect().height)
    })
    const rowHeight = tallestRow.current || FALLBACK_ROW_HEIGHT

    const pagerHeight = pagerRef?.current?.getBoundingClientRect().height || FALLBACK_PAGER_HEIGHT
    const available =
      window.innerHeight - top - pagerHeight - SPACE_BELOW_PAGER - extraBelow

    const fit = Math.floor((available - headerHeight) / rowHeight)
    setRows(Math.min(MAX_ROWS, Math.max(MIN_ROWS, fit)))
  }, [areaRef, pagerRef, extraBelow])

  // Primera medida antes de pintar, para que no se vea un salto. Después, el ResizeObserver
  // de abajo vuelve a medir cada vez que cambia el tamaño de la tabla (llegan los datos,
  // cambia la cantidad de filas).
  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    const onResize = () => {
      tallestRow.current = 0
      measure()
    }
    window.addEventListener('resize', onResize)

    const area = areaRef.current
    const observer = area ? new ResizeObserver(measure) : null
    if (area) observer?.observe(area)

    return () => {
      window.removeEventListener('resize', onResize)
      observer?.disconnect()
    }
  }, [areaRef, measure])

  return rows
}

/**
 * Si al cambiar la cantidad de filas la página actual queda fuera del total, pasa a la última.
 * `total` y `limit` son los que devolvió el backend para esa página.
 */
export function useClampPage(
  page: number,
  setPage: (page: number) => void,
  total: number | undefined,
  limit: number | undefined,
) {
  useEffect(() => {
    if (total === undefined || !limit) return
    const lastPage = Math.max(1, Math.ceil(total / limit))
    if (page > lastPage) setPage(lastPage)
  }, [page, setPage, total, limit])
}
