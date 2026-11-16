import { useRef, useState } from 'react'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { ActionsMenu } from '@/shared/components/ui/ActionsMenu'
import { AdminPanel } from '@/shared/components/ui/AdminPanel'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { DeleteButton } from '@/shared/components/ui/DeleteButton'
import { Modal } from '@/shared/components/ui/Modal'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
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
import { useUndoableAction } from '@/shared/hooks/useUndoableAction'
import { useClampPage } from '@/shared/hooks/useRowsThatFit'
import { TABLE_PAGE_SIZE } from '@/shared/lib/pagination'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { formatInteger } from '@/shared/lib/numbers'
import { useAdminRewards, useDeleteReward } from '../api/rewards.queries'
import { RewardCreateModal } from '../components/RewardCreateModal'
import { RewardImage } from '../components/RewardImage'
import type { Reward, RewardListOrder, RewardListStatus } from '../types/reward'

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'DISABLED', label: 'Deshabilitadas' },
  { value: 'INACTIVE', label: 'Inactivas' },
]

// Orden por fecha de alta (S5-45)
const ORDER_OPTIONS = [
  { value: 'RECENT', label: 'Más recientes' },
  { value: 'OLDEST', label: 'Más antiguas' },
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
  const [order, setOrder] = useState<RewardListOrder>('RECENT')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null)
  // Eliminar una recompensa con canjes confirmados pide confirmación: se rechazan
  const [confirmingDelete, setConfirmingDelete] = useState<Pick<Reward, 'id' | 'name' | 'confirmedCount'> | null>(null)
  // Recompensas eliminadas que esperan la ventana para deshacer: no se muestran
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<number>>(new Set())
  const deleteReward = useDeleteReward()
  const runUndoable = useUndoableAction()

  const deleteWithUndo = (reward: Pick<Reward, 'id'>) => {
    const { id } = reward
    setHiddenIds((current) => new Set(current).add(id))
    const show = () =>
      setHiddenIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    runUndoable({
      message: 'Recompensa eliminada',
      undoneMessage: 'Listo, la recompensa sigue en el catálogo',
      commit: () => deleteReward.mutateAsync(id),
      onUndo: show,
      onError: show,
    })
  }

  const requestDelete = (reward: Pick<Reward, 'id' | 'name' | 'confirmedCount'>) => {
    if ((reward.confirmedCount ?? 0) > 0) setConfirmingDelete(reward)
    else deleteWithUndo(reward)
  }
  const query = useDebounce(search.trim(), 300)

  // Filas por página: las que entran en la pantalla (ajustes S5-57)
  const areaRef = useRef<HTMLDivElement>(null)
  const pagerRef = useRef<HTMLElement>(null)
  const limit = TABLE_PAGE_SIZE

  const rewards = useAdminRewards({ q: query, status, order, page, limit })
  const data = rewards.data
  useClampPage(page, setPage, data?.total, data?.limit)

  return (
    <Page className="max-w-none">
      <AdminPanel
        title="Catálogo de recompensas"
        subtitle="Hacé clic en una recompensa para editarla, o usá ⋮ para duplicarla o eliminarla."
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
          <div className="flex min-w-0 flex-[1_1_180px] flex-col justify-center gap-0.5 border-l border-[#f6d0b1] px-3.5 py-2">
            <label
              htmlFor="reward-order"
              className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#7e3e20]"
            >
              Orden
            </label>
            <FilterSelect
              id="reward-order"
              variant="bar"
              value={order}
              options={ORDER_OPTIONS}
              onChange={(value) => {
                setOrder(value as RewardListOrder)
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
            query || status ? (
              <EmptyState
                icon={ICONS.search}
                title="No hay recompensas con esos filtros"
                description="Ninguna recompensa coincide con la búsqueda o el estado elegido."
                action={
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSearch('')
                      setStatus('')
                      setPage(1)
                    }}
                  >
                    Limpiar filtros
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ICONS.gift}
                title="Todavía no hay recompensas"
                description="Los clientes canjean sus puntos por lo que cargues acá. Empezá por algo simple, como un café."
                action={
                  <Button type="button" onClick={() => setCreating(true)}>
                    + Crear recompensa
                  </Button>
                }
              />
            )
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
                  <TableHeaderCell className="w-12">
                    <span className="sr-only">Acciones</span>
                  </TableHeaderCell>
                </tr>
              </TableHead>
              <tbody>
                {data.items.filter((reward) => !hiddenIds.has(reward.id)).map((reward) => (
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
                      <RewardImage photoUrl={reward.photoUrl} className="size-11 rounded-[10px]" />
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
                    <TableCell className="py-1">
                      <ActionsMenu
                        label={`Acciones de ${reward.name}`}
                        items={[
                          { label: 'Editar', icon: ICONS.pencil, onSelect: () => setEditingRewardId(reward.id) },
                          { label: 'Duplicar', icon: ICONS.copy, onSelect: () => setDuplicatingId(reward.id) },
                          { label: 'Eliminar', danger: true, onSelect: () => requestDelete(reward) },
                        ]}
                      />
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
      {duplicatingId !== null && (
        <RewardCreateModal duplicateFromId={duplicatingId} onClose={() => setDuplicatingId(null)} />
      )}
      {editingRewardId !== null && (
        <RewardCreateModal
          rewardId={editingRewardId}
          onClose={() => setEditingRewardId(null)}
          onDeleteRequested={deleteWithUndo}
        />
      )}
      {confirmingDelete && (
        <Modal title="Eliminar recompensa" onClose={() => setConfirmingDelete(null)} className="max-w-md">
          <p>
            ¿Eliminar <strong>{confirmingDelete.name}</strong>? Hay {confirmingDelete.confirmedCount}{' '}
            canjes confirmados que se van a rechazar. Si te equivocás, tenés unos segundos para
            deshacerlo.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Button type="button" variant="secondary" autoFocus onClick={() => setConfirmingDelete(null)}>
              Cancelar
            </Button>
            <DeleteButton
              type="button"
              variant="danger"
              onClick={() => {
                deleteWithUndo(confirmingDelete)
                setConfirmingDelete(null)
              }}
            />
          </div>
        </Modal>
      )}
    </Page>
  )
}
