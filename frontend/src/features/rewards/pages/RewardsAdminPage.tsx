import { useRef, useState } from 'react'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { AdminPanel } from '@/shared/components/ui/AdminPanel'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Page } from '@/shared/components/ui/Page'
import { RangePagination } from '@/shared/components/ui/Pagination'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useClampPage, useRowsThatFit } from '@/shared/hooks/useRowsThatFit'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { REWARDS_PAGE_SIZE } from '../api/rewards.api'
import { useAdminRewards } from '../api/rewards.queries'
import { RewardCreateModal } from '../components/RewardCreateModal'
import type { RewardListStatus } from '../types/reward'

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'DISABLED', label: 'Deshabilitadas' },
  { value: 'INACTIVE', label: 'Inactivas' },
]

function rewardStatusLabel(
  status: 'ACTIVE' | 'DISABLED' | 'INACTIVE',
  disabledReason: 'OUT_OF_STOCK' | 'EXPIRED' | null,
) {
  if (status === 'DISABLED') {
    return `Deshabilitada · ${disabledReason === 'OUT_OF_STOCK' ? 'Agotada' : 'Vencida'}`
  }
  return status === 'ACTIVE' ? 'Activa' : 'Inactiva'
}

function rewardStatusVariant(status: 'ACTIVE' | 'DISABLED' | 'INACTIVE') {
  if (status === 'ACTIVE') return 'success'
  if (status === 'INACTIVE') return 'danger'
  return 'neutral'
}

export function RewardsAdminPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<RewardListStatus | ''>('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null)
  const query = useDebounce(search.trim(), 300)

  // Filas por página: las que entran en la pantalla (ajustes S5-57)
  const areaRef = useRef<HTMLDivElement>(null)
  const pagerRef = useRef<HTMLElement>(null)
  const limit = useRowsThatFit({ areaRef, pagerRef, initial: REWARDS_PAGE_SIZE })

  const rewards = useAdminRewards({ q: query, status, page, limit })
  const data = rewards.data
  useClampPage(page, setPage, data?.total, data?.limit)

  return (
    <Page className="max-w-none">
      <AdminPanel
        title="Catálogo de recompensas"
        subtitle="Hacé clic en una recompensa para editarla, desactivarla o eliminarla."
        actions={
          <Button type="button" onClick={() => setCreating(true)}>
            + Crear recompensa
          </Button>
        }
      >
        <div className="flex flex-wrap items-stretch rounded-xl border border-[#f6d0b1] bg-white">
          <div className="flex min-w-0 flex-[1.4_1_220px] flex-col justify-center gap-0.5 px-3.5 py-2">
            <label
              htmlFor="reward-search"
              className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#7e3e20]"
            >
              Buscar
            </label>
            <Input
              id="reward-search"
              type="search"
              maxLength={80}
              placeholder="Nombre de la recompensa"
              value={search}
              className="h-[34px] rounded-none border-0 bg-transparent px-0 text-[13px] shadow-none hover:border-0 focus-visible:border-0 focus-visible:ring-0"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_180px] flex-col justify-center gap-0.5 border-l border-[#f6d0b1] px-3.5 py-2">
            <label
              htmlFor="reward-status"
              className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#7e3e20]"
            >
              Estado
            </label>
            <FilterSelect
              id="reward-status"
              variant="bar"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => {
  setStatus(value as RewardListStatus | '')
  setPage(1)
}}
            />
          </div>
        </div>

        <div ref={areaRef} className="mt-5" aria-live="polite">
          {rewards.isPending && <StatusText>Cargando recompensas…</StatusText>}

          {rewards.isError && (
            <Alert variant="error">
              No se pudo cargar el catálogo de recompensas.
              <AlertMessages messages={rewards.error.messages} />
            </Alert>
          )}

          {data && !rewards.isError && data.items.length === 0 && (
            <StatusText className="mt-1 rounded-2xl border border-dashed border-[#f6d0b1] px-4 py-7 text-center text-base text-[#5c5249]">
              No hay recompensas para los filtros seleccionados.
            </StatusText>
          )}

          {data && !rewards.isError && data.items.length > 0 && (
            <Table variant="admin" className="min-w-[900px]">
              <TableHead>
                <tr>
                  <TableHeaderCell className="w-14">Foto</TableHeaderCell>
                  <TableHeaderCell>Nombre</TableHeaderCell>
                  <TableHeaderCell className="text-right">Puntos</TableHeaderCell>
                  <TableHeaderCell className="text-right">Stock</TableHeaderCell>
                  <TableHeaderCell>Vencimiento</TableHeaderCell>
                  <TableHeaderCell className="text-right">Canjes confirmados</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell className="w-7">
                    <span className="sr-only">Abrir recompensa</span>
                  </TableHeaderCell>
                </tr>
              </TableHead>
              <tbody>
                {data.items.map((reward) => (
                  <TableRow
                    key={reward.id}
                    interactive
                    tabIndex={0}
                    aria-label={`Editar recompensa ${reward.name}`}
                    onClick={() => setEditingRewardId(reward.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setEditingRewardId(reward.id)
                      }
                    }}
                  >
                    <TableCell>
                      <div
                        aria-hidden="true"
                        className="grid size-11 place-items-center rounded-[10px] bg-[#fbe6d4] text-[#a8532a]"
                      >
                        <Icon d={ICONS.gift} className="size-5" />
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[190px]">
                      <strong className="font-semibold">{reward.name}</strong>
                      {reward.description && (
                        <p className="line-clamp-2 max-w-[260px] text-xs leading-[1.4] text-[#7a6e63]">
                          {reward.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatInteger(reward.points)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {reward.stock === null ? 'Sin límite' : formatInteger(reward.stock)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {reward.expiresAt ? isoToDisplayDate(reward.expiresAt) : 'No vence'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInteger(reward.confirmedCount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rewardStatusVariant(reward.status)}
                        className="normal-case tracking-normal"
                      >
                        {rewardStatusLabel(reward.status, reward.disabledReason)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#a8532a]" aria-hidden="true">
                      <Icon d={ICONS.chevronRight} className="size-4" />
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {data && !rewards.isError && data.items.length > 0 && (
          <RangePagination
            ref={pagerRef}
            page={data.page}
            total={data.total}
            pageSize={data.limit}
            onChange={setPage}
            disabled={rewards.isFetching}
          />
        )}
      </AdminPanel>

      {creating && <RewardCreateModal onClose={() => setCreating(false)} />}
      {editingRewardId !== null && (
        <RewardCreateModal
          rewardId={editingRewardId}
          onClose={() => setEditingRewardId(null)}
        />
      )}
    </Page>
  )
}
