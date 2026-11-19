import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

const MIN_ROWS = 3
const MAX_ROWS = 100
const FALLBACK_HEADER_HEIGHT = 44
const FALLBACK_ROW_HEIGHT = 56
const FALLBACK_PAGER_HEIGHT = 52
const SPACE_BELOW_PAGER = 22 + 32

type UseRowsThatFitOptions = {
  areaRef: RefObject<HTMLElement | null>
  pagerRef?: RefObject<HTMLElement | null>
  initial: number
  extraBelow?: number
}

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
