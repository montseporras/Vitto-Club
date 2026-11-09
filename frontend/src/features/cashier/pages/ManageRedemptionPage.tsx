// Canjes por código (US-41, contrato S4 §3.8 y prototipo CanjePorCodigo): el Cajero (o el
// Administrador desde Caja) busca un canje por el código que presenta el cliente. Aplicar y Rechazar
// abren las ventanas de US-42 y US-43.
import { useState, type FormEvent } from 'react'
import { DOCUMENT_TYPES } from '@/domain/documents'
import {
  expiresInText,
  isExpiringSoon,
  normalizeRedemptionCode,
  RedemptionStatusBadge,
  REDEMPTION_STATUSES,
  RegisterUseModal,
  RejectRedemptionModal,
  useExpiryRefetch,
  useRedemptionByCode,
  type Redemption,
} from '@/features/redemptions'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { FormField } from '@/shared/components/forms/FormField'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Page, PageCard } from '@/shared/components/ui/Page'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'

// Textos del contrato S4 §3.8 y §3.8.1
const EMPTY_CODE_MESSAGE = 'Ingresá el código del canje.'
const NOT_FOUND_MESSAGE = 'Código no encontrado.'
const EXPIRED_MESSAGE = 'El canje venció. El cliente tiene que pedirlo de nuevo.'

const cardStyles = 'rounded-2xl border border-accent-200 bg-accent-50/60 px-[18px] py-4'
const cardLabelStyles = 'text-xs font-bold uppercase tracking-wide text-accent-700'

export function ManageRedemptionPage() {
  const [input, setInput] = useState('')
  // Código que se está mostrando (ya normalizado); null: todavía no se buscó nada
  const [searched, setSearched] = useState<string | null>(null)
  const [emptyError, setEmptyError] = useState(false)
  // Canje al que se le está registrando el uso (US-42) o que se está por rechazar (US-43)
  const [using, setUsing] = useState<Redemption | null>(null)
  const [rejecting, setRejecting] = useState<Redemption | null>(null)

  const result = useRedemptionByCode(searched)
  const redemption = result.data && !result.isError ? result.data : null
  const now = useExpiryRefetch(redemption ? [redemption] : undefined, result.refetch)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const code = normalizeRedemptionCode(input)
    // CA-41.3: vacío no llama al backend
    if (!code) {
      setEmptyError(true)
      setSearched(null)
      return
    }
    setEmptyError(false)
    setInput(code)
    // Mismo código: se vuelve a pedir para no mostrar un estado viejo
    if (code === searched) void result.refetch()
    else setSearched(code)
  }

  const notFound = result.isError && result.error.status === 404
  const otherError = result.isError && !notFound
  const loading = searched !== null && result.isFetching && !redemption
  const inputError = emptyError ? EMPTY_CODE_MESSAGE : notFound ? NOT_FOUND_MESSAGE : undefined

  return (
    <Page className="max-w-4xl">
      <PageCard title="Canjes" variant="plain">
        <p className="-mt-4 font-heading text-base font-bold text-accent-700">Por código</p>
        <p className="mb-5 mt-3 text-sm text-neutral-600">
          Usalo cuando el cliente solo presenta el código, sin buscarlo por documento.
        </p>

        <form noValidate role="search" onSubmit={onSubmit} className="max-w-[440px]">
          <FormField id="redemption-code" label="Código de canje" error={inputError} hideRequiredMark>
            <div className="flex gap-2">
              <Input
                id="redemption-code"
                autoFocus
                autoComplete="off"
                maxLength={12}
                placeholder="K7MP2X"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value.toUpperCase())
                  setEmptyError(false)
                }}
                aria-invalid={inputError ? true : undefined}
                aria-describedby={inputError ? 'redemption-code-error' : undefined}
                className="uppercase tracking-[0.08em]"
              />
              <Button type="submit" size="lg" disabled={loading} className="shrink-0 px-5">
                <Icon d={ICONS.search} />
                Buscar
              </Button>
            </div>
          </FormField>
        </form>

        <div aria-live="polite">
          {loading && <StatusText className="mt-5">Buscando canje…</StatusText>}
          {otherError && (
            <StatusText className="mt-5">No se pudo buscar el canje. Intentá de nuevo.</StatusText>
          )}
          {redemption && (
            <RedemptionResult
              redemption={redemption}
              now={now}
              onApply={() => setUsing(redemption)}
              onReject={() => setRejecting(redemption)}
            />
          )}
        </div>
      </PageCard>

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

type RedemptionResultProps = {
  redemption: Redemption
  now: number
  onApply: () => void
  onReject: () => void
}

// Cliente, recompensa y, según el estado, "Vence en {n} min" con los botones (CA-41.1, 41.4, 41.5)
function RedemptionResult({ redemption, now, onApply, onReject }: RedemptionResultProps) {
  const { customer, reward, status } = redemption
  const confirmed = status === 'CONFIRMED'

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cardStyles}>
          <div className={cardLabelStyles}>Cliente</div>
          <div className="mt-1 font-heading text-lg font-bold text-ink">
            {customer.firstName} {customer.lastName}
          </div>
          <div className="text-sm text-neutral-600">
            {DOCUMENT_TYPES[customer.documentType].label} {customer.documentNumber}
          </div>
        </div>
        <div className={cardStyles}>
          <div className={cardLabelStyles}>Recompensa</div>
          <div className="mt-1 font-heading text-lg font-bold text-ink">{reward.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <span>{formatInteger(reward.points)} pts</span>
            <RedemptionStatusBadge status={status} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {confirmed && (
          <span
            className={cn(
              'text-[15px] font-bold text-ink',
              isExpiringSoon(redemption.expiresAt, now) && 'text-red-700',
            )}
          >
            {expiresInText(redemption.expiresAt, now)}
          </span>
        )}
        {status === 'EXPIRED' && <span className="text-[15px] font-bold text-ink">{EXPIRED_MESSAGE}</span>}
        {!confirmed && status !== 'EXPIRED' && (
          <span className="text-sm text-accent-700">
            El canje ya está en estado &quot;{REDEMPTION_STATUSES[status]}&quot;.
          </span>
        )}
      </div>

      {confirmed && (
        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-accent-100 pt-4">
          <Button type="button" variant="secondary" size="lg" onClick={onReject}>
            Rechazar
          </Button>
          <Button type="button" size="lg" onClick={onApply}>
            Aplicar
          </Button>
        </div>
      )}
    </div>
  )
}
