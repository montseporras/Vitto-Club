// Pantalla Canjes del Administrador (US-45, contrato §3.12.3 y prototipo GestionCanjes): filtros
// que se aplican con "Filtrar", tabla paginada con las filas que entran en la pantalla y modal con el detalle de cada canje.
import { useRef, useState } from 'react'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { AdminPanel } from '@/shared/components/ui/AdminPanel'
import { Page } from '@/shared/components/ui/Page'
import { RangePagination } from '@/shared/components/ui/Pagination'
import { useClampPage, useRowsThatFit } from '@/shared/hooks/useRowsThatFit'
import { REDEMPTIONS_PAGE_SIZE } from '../api/redemptions.api'
import { useRedemptions } from '../api/redemptions.queries'
import { AdminRedemptionFilters } from '../components/AdminRedemptionFilters'
import { AdminRedemptionsTable } from '../components/AdminRedemptionsTable'
import { RedemptionDetailModal } from '../components/RedemptionDetailModal'
import { RegisterUseModal } from '../components/RegisterUseModal'
import { RejectRedemptionModal } from '../components/RejectRedemptionModal'
import { emptyDraftFilters, type DraftRedemptionFilters } from '../lib/draft-filters'
import { useExpiryRefetch } from '../lib/use-expiry-refetch'
import type { Redemption, RedemptionFilters } from '../types/redemption'

// Del formulario a los parámetros de GET /canjes. Un día elegido filtra ese día (fromDate = toDate).
function toFilters(draft: DraftRedemptionFilters): RedemptionFilters {
  const documentNumber = draft.documentNumber.trim()
  const code = draft.code.trim()
  const rewardName = draft.rewardName.trim()
  return {
    ...(documentNumber ? { documentType: draft.documentType, documentNumber } : {}),
    ...(code ? { code } : {}),
    ...(rewardName ? { rewardName } : {}),
    ...(draft.status ? { status: draft.status } : {}),
    ...(draft.fromDate ? { fromDate: draft.fromDate, toDate: draft.toDate || draft.fromDate } : {}),
    order: draft.order,
  }
}

export function RedemptionsAdminPage() {
  const [draft, setDraft] = useState<DraftRedemptionFilters>(emptyDraftFilters)
  const [applied, setApplied] = useState<DraftRedemptionFilters>(emptyDraftFilters)
  const [filters, setFilters] = useState<RedemptionFilters>(toFilters(emptyDraftFilters))
  const [page, setPage] = useState(1)
  // Código del canje abierto en el modal; se busca en la lista para que se refresque con ella
  const [openCode, setOpenCode] = useState<string | null>(null)
  // Canje al que se le está registrando el uso (ventana de US-42)
  const [using, setUsing] = useState<Redemption | null>(null)
  // Canje que se está por rechazar (ventana de US-43)
  const [rejecting, setRejecting] = useState<Redemption | null>(null)
  // Filas por página: las que entran en la pantalla (ajustes S5-57)
  const areaRef = useRef<HTMLDivElement>(null)
  const pagerRef = useRef<HTMLElement>(null)
  const limit = useRowsThatFit({ areaRef, pagerRef, initial: REDEMPTIONS_PAGE_SIZE })
  const result = useRedemptions(filters, page, limit)
  useClampPage(page, setPage, result.data?.total, result.data?.limit)
  const now = useExpiryRefetch(result.data?.items, result.refetch)

  const hasPending = JSON.stringify(draft) !== JSON.stringify(applied)
  const data = result.data
  const opened = data?.items.find((item) => item.code === openCode)

  const applyFilters = () => {
    setFilters(toFilters(draft))
    setApplied(draft)
    setPage(1)
  }

  // Aplicar cierra el modal y abre "Registrar uso" (US-42); Rechazar lo cierra y abre "Rechazar
  // canje" (US-43)
  const applyRedemption = (redemption: Redemption) => {
    setOpenCode(null)
    setUsing(redemption)
  }
  const rejectRedemption = (redemption: Redemption) => {
    setOpenCode(null)
    setRejecting(redemption)
  }

  return (
    <Page className="max-w-none">
      <AdminPanel
        title="Canjes"
        subtitle="Hacé clic en un canje para ver el detalle y aplicarlo o rechazarlo."
      >
        <AdminRedemptionFilters
          draft={draft}
          onChange={setDraft}
          hasPending={hasPending}
          busy={result.isFetching}
          onSubmit={applyFilters}
        />

        <div ref={areaRef} className="mt-5">
          {result.isLoading && <StatusText>Cargando canjes…</StatusText>}

          {result.isError && (
            <Alert variant="error">
              <AlertMessages messages={result.error.messages} />
            </Alert>
          )}

          {data && !result.isError && data.items.length > 0 && (
            <AdminRedemptionsTable
              items={data.items}
              now={now}
              onOpen={(redemption) => setOpenCode(redemption.code)}
            />
          )}

          {data && !result.isError && data.items.length === 0 && (
            <StatusText className="mt-1 rounded-2xl border border-dashed border-[#f6d0b1] px-4 py-7 text-center text-base text-[#5c5249]">
              No hay canjes para los filtros seleccionados.
            </StatusText>
          )}
        </div>

        {data && !result.isError && data.items.length > 0 && (
          <RangePagination
            ref={pagerRef}
            page={data.page}
            total={data.total}
            pageSize={data.limit}
            onChange={setPage}
            disabled={result.isFetching}
          />
        )}
      </AdminPanel>

      {opened && (
        <RedemptionDetailModal
          redemption={opened}
          now={now}
          onClose={() => setOpenCode(null)}
          onApply={applyRedemption}
          onReject={rejectRedemption}
        />
      )}

      {using && (
        <RegisterUseModal
          redemption={using}
          customer={using.customer}
          onClose={() => setUsing(null)}
          // "Rechazar canje" (saldo insuficiente o recompensa no disponible) sigue con US-43
          onReject={() => setRejecting(using)}
        />
      )}

      {rejecting && (
        <RejectRedemptionModal
          redemption={rejecting}
          customer={rejecting.customer}
          onClose={() => setRejecting(null)}
        />
      )}
    </Page>
  )
}
