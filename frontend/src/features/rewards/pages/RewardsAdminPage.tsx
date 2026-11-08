import { useState } from 'react'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Page } from '@/shared/components/ui/Page'
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { useAdminRewards } from '../api/rewards.queries'
import { REWARDS_PAGE_SIZE } from '../api/rewards.api'
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
  const rewards = useAdminRewards({ q: query, status, page })
  const data = rewards.data
  const totalPages = data ? Math.ceil(data.total / REWARDS_PAGE_SIZE) : 0
  const start = data?.total ? (data.page - 1) * data.limit + 1 : 0
  const end = data ? Math.min(data.page * data.limit, data.total) : 0

  return (
    <Page className="max-w-7xl">
      <div className="w-full rounded-3xl border border-[#f6d0b1] bg-white p-5 shadow-[0_20px_25px_-5px_rgba(126,62,32,0.1),0_8px_10px_-6px_rgba(126,62,32,0.1)] sm:p-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold leading-tight text-[#2b1a10]">
              Catálogo de recompensas
            </h2>
            <p className="mt-1 text-[13px] text-[#7a6e63]">
              Hacé clic en una recompensa para editarla, desactivarla o eliminarla.
            </p>
          </div>
          <Button type="button" onClick={() => setCreating(true)}>
            + Crear recompensa
          </Button>
        </header>

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
            <select
              id="reward-status"
              value={status}
              className="h-[34px] w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-[13px] text-[#2b1a10] outline-none"
              onChange={(event) => {
                setStatus(event.target.value as RewardListStatus | '')
                setPage(1)
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6" aria-live="polite">
          {rewards.isPending && <StatusText>Cargando recompensas…</StatusText>}

          {rewards.isError && (
            <Alert variant="error">
              No se pudo cargar el catálogo de recompensas.
              <AlertMessages messages={rewards.error.messages} />
            </Alert>
          )}

          {data && !rewards.isError && data.items.length === 0 && (
            <StatusText className="mt-6 rounded-2xl border border-dashed border-[#f6d0b1] px-4 py-7 text-center text-base text-[#5c5249]">
              No hay recompensas para los filtros seleccionados.
            </StatusText>
          )}

          {data && !rewards.isError && data.items.length > 0 && (
            <>
              <Table className="min-w-[900px]">
                <TableHead className="bg-[#fdf0e4]">
                  <tr>
                    <TableHeaderCell className="w-14 border-b border-[#f0d9c4] px-3 py-2.5 text-[13px] tracking-[0.04em] text-[#7a3a1d]">
                      Foto
                    </TableHeaderCell>
                    <TableHeaderCell className="border-b border-[#f0d9c4] px-3 py-2.5 text-[13px] tracking-[0.04em] text-[#7a3a1d]">
                      Nombre
                    </TableHeaderCell>
                    <TableHeaderCell className="border-b border-[#f0d9c4] px-3 py-2.5 text-right text-[13px] tracking-[0.04em] text-[#7a3a1d]">
                      Puntos
                    </TableHeaderCell>
                    <TableHeaderCell className="border-b border-[#f0d9c4] px-3 py-2.5 text-right text-[13px] tracking-[0.04em] text-[#7a3a1d]">
                      Stock
                    </TableHeaderCell>
                    <TableHeaderCell className="border-b border-[#f0d9c4] px-3 py-2.5 text-[13px] tracking-[0.04em] text-[#7a3a1d]">
                      Vencimiento
                    </TableHeaderCell>
                    <TableHeaderCell className="border-b border-[#f0d9c4] px-3 py-2.5 text-right text-[13px] tracking-[0.04em] text-[#7a3a1d]">
                      Canjes confirmados
                    </TableHeaderCell>
                    <TableHeaderCell className="border-b border-[#f0d9c4] px-3 py-2.5 text-[13px] tracking-[0.04em] text-[#7a3a1d]">
                      Estado
                    </TableHeaderCell>
                    <TableHeaderCell className="w-7 border-b border-[#f0d9c4] px-3 py-2.5">
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
                      <TableCell className="border-b border-[#f5e6d8] px-3 py-2.5 text-sm text-[#3b2a20]">
                        <div
                          aria-hidden="true"
                          className="grid size-11 place-items-center rounded-[10px] bg-[#fbe6d4] text-[#a8532a]"
                        >
                          <Icon d={ICONS.gift} className="size-5" />
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[190px] border-b border-[#f5e6d8] px-3 py-2.5 text-sm text-[#3b2a20]">
                        <strong className="font-semibold">{reward.name}</strong>
                        {reward.description && (
                          <p className="line-clamp-2 max-w-[260px] text-xs leading-[1.4] text-[#7a6e63]">
                            {reward.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap border-b border-[#f5e6d8] px-3 py-2.5 text-right text-sm tabular-nums text-[#3b2a20]">
                        {formatInteger(reward.points)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap border-b border-[#f5e6d8] px-3 py-2.5 text-right text-sm tabular-nums text-[#3b2a20]">
                        {reward.stock === null ? 'Sin límite' : formatInteger(reward.stock)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap border-b border-[#f5e6d8] px-3 py-2.5 text-sm text-[#3b2a20]">
                        {reward.expiresAt ? isoToDisplayDate(reward.expiresAt) : 'No vence'}
                      </TableCell>
                      <TableCell className="border-b border-[#f5e6d8] px-3 py-2.5 text-right text-sm tabular-nums text-[#3b2a20]">
                        {formatInteger(reward.confirmedCount)}
                      </TableCell>
                      <TableCell className="border-b border-[#f5e6d8] px-3 py-2.5 text-sm text-[#3b2a20]">
                        <Badge
                          variant={rewardStatusVariant(reward.status)}
                          className="normal-case tracking-normal"
                        >
                          {rewardStatusLabel(reward.status, reward.disabledReason)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="border-b border-[#f5e6d8] px-3 py-2.5 text-[#a8532a]"
                        aria-hidden="true"
                      >
                        <Icon d={ICONS.chevronRight} className="size-4" />
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p aria-live="polite" className="text-sm text-[#5c5249]">
                  Mostrando {start}–{end} de {data.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={data.page <= 1 || rewards.isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={data.page >= totalPages || rewards.isFetching}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      <div className="mt-5 rounded-xl border border-dashed border-[#d9804f] bg-[#fffaf3] px-3.5 py-2.5 text-[13px] text-[#6b5446]">
        <strong className="text-[#7a3a1d]">Nota del prototipo:</strong> US-34 · RF-038
        (crear), US-35 · RF-039 (editar), US-36 · RF-040 (activar / desactivar), US-37 · RF-041
        (el Sistema la deshabilita sin stock o vencida y la vuelve a habilitar al reponer stock o
        extender la fecha) y US-38 · RF-042 (eliminar: queda &quot;Dada de baja&quot;). Las dadas
        de baja no se listan. La foto de la recompensa queda para el Sprint 5.
      </div>

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
