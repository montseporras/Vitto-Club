import { useEffect } from 'react'

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
