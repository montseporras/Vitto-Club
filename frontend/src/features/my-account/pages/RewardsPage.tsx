// Recompensas del Cliente (US-39, diseño V2): el catálogo completo, una fila por recompensa, con un
// buscador (por nombre o descripción) y un panel de filtros simple. Cada fila abre el detalle.
import { useMemo, useState } from 'react'
import { useMyCatalog, type CatalogFilter, type CatalogReward } from '@/features/rewards'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { ClientPageHeader, FiltersToggle } from '../components/client/ClientUI'
import { RewardRow } from '../components/client/RewardCards'

// Qué se muestra. "Vencen pronto" y "Más canjeadas" los resuelve el backend (S4 §2.5); "Me
// alcanzan" compara con el saldo ya cargado (decisión S4-2) y "Más recientes" ordena por alta.
type Show = 'ALL' | 'AFFORDABLE' | 'EXPIRING_SOON' | 'MOST_REDEEMED' | 'RECENT'

const SHOW_OPTIONS: { value: Show; label: string; icon: string }[] = [
  { value: 'ALL', label: 'Todas', icon: ICONS.gift },
  { value: 'AFFORDABLE', label: 'Me alcanzan los puntos', icon: ICONS.coins },
  { value: 'EXPIRING_SOON', label: 'Vencen pronto', icon: ICONS.clock },
  { value: 'MOST_REDEEMED', label: 'Más canjeadas', icon: ICONS.star },
  { value: 'RECENT', label: 'Más recientes', icon: ICONS.sparkles },
]

const API_FILTER: Record<Show, CatalogFilter> = {
  ALL: 'ALL',
  AFFORDABLE: 'ALL',
  EXPIRING_SOON: 'EXPIRING_SOON',
  MOST_REDEEMED: 'MOST_REDEEMED',
  RECENT: 'ALL',
}

// Para buscar sin importar tildes ni mayúsculas
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function RewardsPage() {
  const [query, setQuery] = useState('')
  const [show, setShow] = useState<Show>('ALL')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const catalog = useMyCatalog(API_FILTER[show])

  const visible = useMemo(() => {
    if (!catalog.data) return []
    const { balance, items } = catalog.data
    let list: CatalogReward[] = items
    if (show === 'AFFORDABLE') list = list.filter((reward) => reward.status === 'ACTIVE' && reward.points <= balance)
    // Sin fecha de alta en el catálogo, el id (creciente) marca cuál es más nueva
    if (show === 'RECENT') list = [...list].sort((a, b) => b.id - a.id)
    const term = normalize(query.trim())
    if (term) {
      list = list.filter((reward) =>
        normalize(`${reward.name} ${reward.description ?? ''}`).includes(term),
      )
    }
    return list
  }, [catalog.data, show, query])

  const clear = () => {
    setQuery('')
    setShow('ALL')
  }

  return (
    <div className={clientStyles.page}>
      <ClientPageHeader title="Recompensas" />

      {catalog.isError ? (
        <Alert variant="error">
          <AlertMessages messages={catalog.error.messages} />
        </Alert>
      ) : (
        <>
          <div className="grid gap-3">
            {catalog.data && (
              <p className="text-sm text-neutral-600">
                Tenés{' '}
                <strong className="text-accent-800 tabular-nums">
                  {catalog.data.balance < 0 && '−'}
                  {formatInteger(Math.abs(catalog.data.balance))} pts
                </strong>{' '}
                para canjear
              </p>
            )}

            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Buscar recompensas</span>
                <Icon
                  d={ICONS.search}
                  className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar recompensa"
                  maxLength={80}
                  className="h-11 w-full rounded-xl border border-accent-200 bg-surface pr-3 pl-11 text-base shadow-xs placeholder:text-neutral-500 focus:border-accent-700 focus:shadow-[0_0_0_1px_var(--color-accent-700)] focus:outline-none"
                />
              </label>
              <FiltersToggle
                open={filtersOpen}
                activeCount={show === 'ALL' ? 0 : 1}
                controls="rewards-filters"
                onToggle={() => setFiltersOpen((current) => !current)}
              />
            </div>

            {filtersOpen && (
              <fieldset id="rewards-filters" className={cn(clientStyles.card, 'grid gap-2 p-3')}>
                <legend className="sr-only">Mostrar</legend>
                <p className="px-1 text-xs font-bold tracking-wide text-accent-800 uppercase">Mostrar</p>
                <div className="flex flex-wrap gap-2">
                  {SHOW_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={show === option.value}
                      onClick={() => setShow(option.value)}
                      className={cn(
                        'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
                        show === option.value
                          ? 'border-accent-700 bg-accent-700 text-white'
                          : 'border-accent-200 bg-surface text-accent-800 hover:bg-accent-50',
                      )}
                    >
                      <Icon d={option.icon} className="size-4" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          {catalog.isPending ? (
            <StatusText className="py-6 text-center">Cargando…</StatusText>
          ) : catalog.data.items.length === 0 && show === 'ALL' ? (
            <EmptyState
              icon={ICONS.gift}
              title="El catálogo está vacío por ahora"
              description="Seguí sumando puntos con cada consumo: cuando haya recompensas, las vas a ver acá."
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={ICONS.search}
              title="No encontramos recompensas"
              description={
                show === 'AFFORDABLE'
                  ? 'Todavía no te alcanzan los puntos para ninguna. ¡Seguí sumando!'
                  : 'Ninguna coincide con la búsqueda o el filtro. Probá con otra palabra.'
              }
              action={
                <Button type="button" variant="secondary" onClick={clear}>
                  Ver todas
                </Button>
              }
            />
          ) : (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
              {visible.map((reward) => (
                <li key={reward.id}>
                  <RewardRow reward={reward} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-center text-xs text-neutral-600">
            Al canjear recibís un código que dura 15 minutos. Los puntos se descuentan recién cuando lo
            usás en el local.
          </p>
        </>
      )}
    </div>
  )
}
