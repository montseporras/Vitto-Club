/** Página de un listado de la API: `{ items, total, page, limit }` (contrato §5). */
export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  limit: number
}
