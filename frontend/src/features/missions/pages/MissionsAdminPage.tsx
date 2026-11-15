import { useRef, useState } from 'react'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { FilterSelect } from '@/shared/components/ui/FilterSelect'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { AdminPanel } from '@/shared/components/ui/AdminPanel'
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
import { formatInteger } from '@/shared/lib/numbers'
import { useMissions } from '../api/missions.queries'
import { MISSIONS_PAGE_SIZE } from '../api/missions.api'
import { MissionCreateModal } from '../components/MissionCreateModal'
import { MissionDetailModal } from '../components/MissionDetailModal'
import {
  conditionLabel,
  missionPhaseLabel,
  missionPhaseVariant,
  missionValidityLabel,
  monthLabel,
  objectiveLabel,
} from '../lib/mission-presentation'
import type { MissionListOrder, MissionPhase } from '../types/mission'

const PHASE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'RUNNING', label: 'En curso' },
  { value: 'UPCOMING', label: 'Próximas' },
  { value: 'FINISHED', label: 'Finalizadas' },
]

const ORDER_OPTIONS = [
  { value: 'RECENT', label: 'Más recientes' },
  { value: 'OLDEST', label: 'Más antiguas' },
]

export function MissionsAdminPage() {
  const [search, setSearch] = useState('')
  const [phase, setPhase] = useState<MissionPhase | ''>('')
  const [order, setOrder] = useState<MissionListOrder>('RECENT')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [missionId, setMissionId] = useState<number | null>(null)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const detailTriggerRef = useRef<HTMLTableRowElement | null>(null)
  const query = useDebounce(search.trim(), 300)
  const areaRef = useRef<HTMLDivElement>(null)
  const pagerRef = useRef<HTMLElement>(null)
  const limit = useRowsThatFit({ areaRef, pagerRef, initial: MISSIONS_PAGE_SIZE })

  const missions = useMissions({ q: query, phase, order, page, limit })
  const data = missions.data
  useClampPage(page, setPage, data?.total, data?.limit)

  const closeCreate = () => {
    setCreating(false)
    window.requestAnimationFrame(() => createButtonRef.current?.focus())
  }

  const closeDetail = () => {
    setMissionId(null)
    window.requestAnimationFrame(() => detailTriggerRef.current?.focus())
  }

  return (
    <Page className="max-w-none">
      <AdminPanel
        title="Misiones mensuales"
        subtitle="Hacé clic en una misión para ver su detalle y quiénes la completaron."
        actions={
          <Button ref={createButtonRef} type="button" onClick={() => setCreating(true)}>
            + Crear misión mensual
          </Button>
        }
      >
        <div className="flex flex-wrap items-stretch rounded-xl border border-[#f6d0b1] bg-white">
          <div className="flex min-w-0 flex-[1.4_1_220px] flex-col justify-center gap-0.5 px-3.5 py-2">
            <label
              htmlFor="mission-search"
              className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#7e3e20]"
            >
              Buscar
            </label>
            <Input
              id="mission-search"
              type="search"
              maxLength={80}
              placeholder="Nombre de la misión"
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
              htmlFor="mission-phase"
              className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#7e3e20]"
            >
              Estado
            </label>
            <FilterSelect
              id="mission-phase"
              variant="bar"
              value={phase}
              options={PHASE_OPTIONS}
              onChange={(value) => {
                setPhase(value as MissionPhase | '')
                setPage(1)
              }}
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_180px] flex-col justify-center gap-0.5 border-l border-[#f6d0b1] px-3.5 py-2">
            <label
              htmlFor="mission-order"
              className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#7e3e20]"
            >
              Orden
            </label>
            <FilterSelect
              id="mission-order"
              variant="bar"
              value={order}
              options={ORDER_OPTIONS}
              onChange={(value) => {
                setOrder(value as MissionListOrder)
                setPage(1)
              }}
            />
          </div>
        </div>

        <div ref={areaRef} className="mt-5" aria-live="polite">
          {missions.isPending && <StatusText>Cargando misiones…</StatusText>}

          {missions.isError && (
            <Alert variant="error">
              No se pudieron cargar las misiones.
              <AlertMessages messages={missions.error.messages} />
            </Alert>
          )}

          {data && !missions.isError && data.items.length === 0 && (
            <StatusText className="mt-1 rounded-2xl border border-dashed border-[#f6d0b1] px-4 py-7 text-center text-base text-[#5c5249]">
              No hay misiones para los filtros seleccionados.
            </StatusText>
          )}

          {data && !missions.isError && data.items.length > 0 && (
            <Table variant="admin" className="min-w-[900px]">
              <TableHead>
                <tr>
                  <TableHeaderCell>Nombre</TableHeaderCell>
                  <TableHeaderCell>Objetivo</TableHeaderCell>
                  <TableHeaderCell>Recompensa</TableHeaderCell>
                  <TableHeaderCell>Vigencia</TableHeaderCell>
                  <TableHeaderCell className="text-right">Completadas este mes</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell className="w-7">
                    <span className="sr-only">Abrir misión</span>
                  </TableHeaderCell>
                </tr>
              </TableHead>
              <tbody>
                {data.items.map((mission) => {
                  const condition = conditionLabel(mission)
                  return (
                    <TableRow
                      key={mission.id}
                      interactive
                      tabIndex={0}
                      aria-label={`Abrir misión ${mission.name}`}
                      onClick={(event) => {
                        detailTriggerRef.current = event.currentTarget
                        setMissionId(mission.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          detailTriggerRef.current = event.currentTarget
                          setMissionId(mission.id)
                        }
                      }}
                    >
                      <TableCell className="min-w-[190px]">
                        <strong className="font-semibold">{mission.name}</strong>
                        {mission.description && (
                          <p className="line-clamp-2 max-w-[260px] text-xs leading-[1.4] text-[#7a6e63]">
                            {mission.description}
                          </p>
                        )}
                        {mission.pendingChanges && (
                          <Badge variant="neutral" className="mt-1 text-[10px]">
                            Cambios desde {monthLabel(mission.pendingChanges.appliesFrom)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[170px]">
                        {objectiveLabel(mission.objectiveType, mission.target)}
                        {condition && (
                          <p className="text-xs text-[#7a6e63]">{condition}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {mission.rewardPoints === null
                          ? 'Sin recompensa'
                          : `${formatInteger(mission.rewardPoints)} pts`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {missionValidityLabel(mission)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatInteger(mission.completedCount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={missionPhaseVariant(mission.phase)}
                          className="normal-case tracking-normal"
                        >
                          {missionPhaseLabel(mission.phase)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#a8532a]" aria-hidden="true">
                        <Icon d={ICONS.chevronRight} className="size-4" />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </tbody>
            </Table>
          )}
        </div>

        {data && !missions.isError && data.items.length > 0 && (
          <RangePagination
            ref={pagerRef}
            page={data.page}
            total={data.total}
            pageSize={data.limit}
            onChange={setPage}
            disabled={missions.isFetching}
          />
        )}
      </AdminPanel>

      {creating && <MissionCreateModal onClose={closeCreate} />}
      {missionId !== null && (
        <MissionDetailModal missionId={missionId} onClose={closeDetail} />
      )}
    </Page>
  )
}
