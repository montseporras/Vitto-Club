import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { FormField } from '@/shared/components/forms/FormField'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { useToast } from '@/shared/components/feedback/useToast'
import { todayIsoInTimeZone } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { modalStyles } from '@/styles/ui'
import type { ApiError } from '@/shared/api/ApiError'
import {
  useActivateReward,
  useAdminReward,
  useCreateReward,
  useDeleteReward,
  useDeactivateReward,
  useUpdateReward,
} from '../api/rewards.queries'
import {
  createRewardSchema,
  type CreateRewardFormInput,
  type CreateRewardFormOutput,
} from '../schemas/create-reward.schema'
import type { Reward } from '../types/reward'

const REWARD_FORM_FIELDS = ['name', 'description', 'points', 'stock', 'expiresAt'] as const
type RewardFormField = (typeof REWARD_FORM_FIELDS)[number]

function isRewardFormField(field: string): field is RewardFormField {
  return REWARD_FORM_FIELDS.some((candidate) => candidate === field)
}

type RewardCreateModalProps = {
  onClose: () => void
  rewardId?: number
}

function RewardDialog({
  title,
  onClose,
  className,
  children,
}: {
  title: string
  onClose: () => void
  className?: string
  children: ReactNode
}) {
  return createPortal(
    <div
      className={cn(modalStyles.overlay, 'z-[10000] bg-[#2d180e]/50', className)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          modalStyles.panel,
          'relative max-w-[600px] overflow-y-auto rounded-[22px] border-0 bg-white p-4 shadow-[0_30px_60px_-20px_rgba(45,24,14,0.55)]',
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar"
          className={modalStyles.closeIcon}
        >
          <Icon d={ICONS.close} className="size-5" />
        </button>
        <h3 className="pr-10 font-heading text-lg font-bold text-[#5a2a14]">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function rewardStatusLabel(reward: Reward) {
  if (reward.status === 'DISABLED') {
    return `Deshabilitada · ${reward.disabledReason === 'OUT_OF_STOCK' ? 'Agotada' : 'Vencida'}`
  }
  return reward.status === 'ACTIVE' ? 'Activa' : 'Inactiva'
}

function rewardStatusVariant(reward: Reward) {
  if (reward.status === 'ACTIVE') return 'success'
  if (reward.status === 'INACTIVE') return 'danger'
  return 'neutral'
}

export function RewardCreateModal({ onClose, rewardId }: RewardCreateModalProps) {
  const [serverError, setServerError] = useState<{ messages: string[] } | null>(null)
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const today = todayIsoInTimeZone('America/Argentina/Buenos_Aires')
  const isEditing = rewardId !== undefined
  const rewardQuery = useAdminReward(rewardId)
  const reward = rewardQuery.data
  const schema = useMemo(
    () =>
      createRewardSchema(today, {
        allowZeroStock: isEditing,
        confirmedCount: reward?.confirmedCount ?? 0,
      }),
    [today, isEditing, reward?.confirmedCount],
  )
  const createMutation = useCreateReward()
  const updateMutation = useUpdateReward()
  const activateMutation = useActivateReward()
  const deactivateMutation = useDeactivateReward()
  const deleteMutation = useDeleteReward()
  const showToast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateRewardFormInput, unknown, CreateRewardFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      points: '',
      stock: '',
      unlimitedStock: false,
      expiresAt: '',
      noExpiry: false,
    },
    mode: 'onTouched',
  })

  useEffect(() => {
    if (!reward) return
    reset({
      name: reward.name,
      description: reward.description ?? '',
      points: String(reward.points),
      stock: reward.stock === null ? '' : String(reward.stock),
      unlimitedStock: reward.stock === null,
      expiresAt: reward.expiresAt ?? '',
      noExpiry: reward.expiresAt === null,
    })
  }, [reward, reset])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (deleteDialogOpen) {
        setDeleteDialogOpen(false)
        setActionError(null)
      } else if (deactivateDialogOpen) {
        setDeactivateDialogOpen(false)
        setActionError(null)
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deactivateDialogOpen, deleteDialogOpen, onClose])

  const descriptionLength = useWatch({ control, name: 'description' })?.length ?? 0

  const onSubmit = (data: CreateRewardFormOutput) => {
    setServerError(null)
    const handleError = (error: ApiError) => {
      if (error.code === 'REWARD_NAME_IN_USE') {
        setError(
          'name',
          { message: 'Ya existe una recompensa con ese nombre.' },
          { shouldFocus: true },
        )
        return
      }
      if (error.code === 'STOCK_BELOW_CONFIRMED') {
        setError('stock', { message: error.messages[0] }, { shouldFocus: true })
        return
      }

      let mappedFieldError = false
      for (const detail of error.details) {
        if (isRewardFormField(detail.field)) {
          setError(detail.field, { message: detail.message })
          mappedFieldError = true
        }
      }
      if (!mappedFieldError) setServerError(error)
    }

    if (isEditing && rewardId !== undefined) {
      updateMutation.mutate(
        { id: rewardId, body: data },
        {
          onSuccess: ({ availabilityChange }) => {
            const availabilityMessage =
              availabilityChange === 'ENABLED'
                ? ' La recompensa volvió a estar disponible.'
                : availabilityChange === 'DISABLED'
                  ? ' La recompensa quedó deshabilitada porque no tiene stock o está vencida.'
                  : ''
            showToast(`Recompensa guardada.${availabilityMessage}`)
            onClose()
          },
          onError: handleError,
        },
      )
      return
    }

    createMutation.mutate(data, {
      onSuccess: () => {
        showToast('Recompensa guardada.')
        onClose()
      },
      onError: handleError,
    })
  }

  const activate = () => {
    if (rewardId === undefined) return
    setServerError(null)
    activateMutation.mutate(rewardId, {
      onSuccess: ({ reward: activatedReward }) => {
        showToast(
          activatedReward.status === 'DISABLED'
            ? 'Se activó, pero quedó deshabilitada porque no tiene stock o está vencida. Reponé el stock o extendé la fecha.'
            : 'Recompensa activada.',
        )
        onClose()
      },
      onError: setServerError,
    })
  }

  const confirmDeactivate = () => {
    if (rewardId === undefined) return
    setActionError(null)
    deactivateMutation.mutate(rewardId, {
      onSuccess: ({ rejectedRedemptions }) => {
        const rejectedMessage =
          rejectedRedemptions > 0
            ? ` Se rechazaron ${rejectedRedemptions} canjes confirmados.`
            : ''
        showToast(`Recompensa desactivada.${rejectedMessage}`)
        onClose()
      },
      onError: setActionError,
    })
  }

  const confirmDelete = () => {
    if (rewardId === undefined) return
    setActionError(null)
    deleteMutation.mutate(rewardId, {
      onSuccess: () => {
        showToast('Recompensa eliminada.')
        onClose()
      },
      onError: setActionError,
    })
  }

  const fieldProps = (field: RewardFormField) => ({
    id: `reward-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `reward-${field}-error` : undefined,
  })

  const formErrorMessages = serverError?.messages ?? []
  const unlimitedStock = useWatch({ control, name: 'unlimitedStock' })
  const noExpiry = useWatch({ control, name: 'noExpiry' })
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    deleteMutation.isPending
  const title = isEditing ? 'Editar recompensa' : 'Crear recompensa'

  if (isEditing && rewardQuery.isPending) {
    return (
      <RewardDialog title={title} onClose={onClose}>
        <StatusText>Cargando recompensa…</StatusText>
      </RewardDialog>
    )
  }

  if (isEditing && rewardQuery.isError) {
    return (
      <RewardDialog title={title} onClose={onClose}>
        <Alert variant="error">
          <AlertMessages messages={rewardQuery.error.messages} />
        </Alert>
      </RewardDialog>
    )
  }

  if (isEditing && !reward) {
    return (
      <RewardDialog title={title} onClose={onClose}>
        <StatusText>No existe la recompensa.</StatusText>
      </RewardDialog>
    )
  }

  return createPortal(
    <div
      className={cn(modalStyles.overlay, 'z-[10000] bg-[#2d180e]/50')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-modal-title"
    >
      <div
        className={cn(
          modalStyles.panel,
          'relative max-w-[600px] overflow-y-auto rounded-[22px] border-0 bg-white p-4 shadow-[0_30px_60px_-20px_rgba(45,24,14,0.55)]',
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar"
          className={modalStyles.closeIcon}
        >
          <Icon d={ICONS.close} className="size-5" />
        </button>
        <h3 id="reward-modal-title" className="pr-10 font-heading text-lg font-bold text-[#5a2a14]">
          {title}
        </h3>

        {isEditing && reward && (
          <div className="mt-1 mb-3 flex flex-wrap items-center gap-2 text-[13px] text-[#5c5249]">
            <span>Estado:</span>
            <Badge variant={rewardStatusVariant(reward)} className="normal-case tracking-normal">
              {rewardStatusLabel(reward)}
            </Badge>
            <span>
              · Canjes confirmados: <strong>{reward.confirmedCount ?? 0}</strong>
            </span>
          </div>
        )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-3 grid gap-3">
        {serverError && (
          <Alert variant="error">
            <AlertMessages messages={formErrorMessages} />
          </Alert>
        )}

        <fieldset className="grid gap-3 border-0 p-0">
          <legend className="mb-1 w-full border-b border-[#fbe6d4] pb-1 text-base font-bold text-[#7e3e20]">
            Recompensa
          </legend>

          <div className="grid gap-1.5">
            <p className="text-sm font-semibold text-[#3b2a20]">Foto que verán los clientes</p>
            <div className="flex flex-wrap items-center gap-3.5">
              <div
                role="img"
                aria-label="Imagen genérica"
                className="grid size-24 place-items-center rounded-[14px] bg-[#fbe6d4] text-[#a8532a]"
              >
                <Icon d={ICONS.gift} className="size-8" />
              </div>
              <div className="grid justify-items-start gap-1.5">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled
                    className="h-[34px] rounded-lg px-3.5 text-[13px]"
                  >
                    Elegir imagen
                  </Button>
                  <Badge
                    variant="accent"
                    className="px-3 text-[10px] normal-case tracking-normal"
                  >
                    Próximamente
                  </Badge>
                </div>
                <p className="text-[11px] text-[#7a6e63]">
                  La carga de imágenes llega en el Sprint 5. Mientras tanto, los clientes ven la
                  imagen genérica.
                </p>
              </div>
            </div>
          </div>

          <FormField
            id="reward-name"
            label="Nombre"
            hideRequiredMark
            error={errors.name?.message}
          >
            <Input
              {...register('name')}
              {...fieldProps('name')}
              autoFocus
              placeholder="Ej: Café + medialuna"
            />
          </FormField>

          <FormField
            id="reward-description"
            label="Descripción"
            optional
            error={errors.description?.message}
          >
            <Textarea
              {...register('description')}
              {...fieldProps('description')}
              placeholder="Ej: Café chico con una medialuna de manteca."
              rows={2}
              className="min-h-0 px-3 py-2.5"
            />
            <p className="text-right text-[11px] text-neutral-600">{descriptionLength}/255</p>
          </FormField>

          <FormField
            id="reward-points"
            label="Puntos"
            hideRequiredMark
            error={errors.points?.message}
          >
            <Input
              {...register('points')}
              {...fieldProps('points')}
              inputMode="numeric"
              placeholder="150"
              className="max-w-60"
            />
            {isEditing && (
              <p className="text-xs text-neutral-600">
                Los canjes ya confirmados mantienen los puntos con los que se pidieron.
              </p>
            )}
          </FormField>
        </fieldset>

        <fieldset className="grid gap-3 border-0 p-0">
          <legend className="mt-1 mb-1 w-full border-b border-[#fbe6d4] pb-1 text-base font-bold text-[#7e3e20]">
            Disponibilidad
          </legend>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-3">
            <FormField
              id="reward-stock"
              label="Stock (cantidad)"
              hideRequiredMark
              error={errors.stock?.message}
            >
              <Input
                {...register('stock')}
                {...fieldProps('stock')}
                inputMode="numeric"
                placeholder="20"
                disabled={unlimitedStock}
              />
              {isEditing && reward && (reward.confirmedCount ?? 0) > 0 && (
                <p className="text-xs text-neutral-600">
                  Hay {reward.confirmedCount} canjes confirmados. El stock no puede ser menor a{' '}
                  {reward.confirmedCount}.
                </p>
              )}
              <label
                htmlFor="reward-unlimited-stock"
                className="mt-1 flex cursor-pointer items-center gap-2 text-[13px] font-medium"
              >
                <input
                  id="reward-unlimited-stock"
                  type="checkbox"
                  {...register('unlimitedStock')}
                />
                Sin límite de stock
              </label>
            </FormField>

            <FormField
              id="reward-expiresAt"
              label="Vencimiento"
              hideRequiredMark
              error={errors.expiresAt?.message}
            >
              <Input
                {...register('expiresAt')}
                {...fieldProps('expiresAt')}
                type="date"
                min={today}
                disabled={noExpiry}
              />
              <label
                htmlFor="reward-no-expiry"
                className="mt-1 flex cursor-pointer items-center gap-2 text-[13px] font-medium"
              >
                <input id="reward-no-expiry" type="checkbox" {...register('noExpiry')} />
                No vence
              </label>
            </FormField>
          </div>
        </fieldset>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-[#fbe6d4] pt-3">
          {isEditing && reward ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => {
                  if (reward.status === 'INACTIVE') {
                    activate()
                  } else {
                    setServerError(null)
                    setActionError(null)
                    setDeactivateDialogOpen(true)
                  }
                }}
              >
                {reward.status === 'INACTIVE' ? 'Activar' : 'Desactivar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                className="text-[#b3261e]"
                onClick={() => {
                  setServerError(null)
                  setActionError(null)
                  setDeleteDialogOpen(true)
                }}
              >
                Eliminar
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
              className="h-10"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="h-10">
              {isPending
                ? 'Guardando…'
                : isEditing
                  ? 'Confirmar cambios'
                  : 'Guardar'}
            </Button>
          </div>
        </div>
      </form>
      </div>
      {deactivateDialogOpen && reward && (
        <RewardDialog
          title="Desactivar recompensa"
          onClose={() => {
            setDeactivateDialogOpen(false)
            setActionError(null)
          }}
          className="z-[10010]"
        >
          <div className="grid gap-4">
            <p className="text-[15px] text-[#3b2a20]">
              ¿Desactivar <strong>{reward.name}</strong>? Los clientes no la van a ver en el
              catálogo.
            </p>
            {(reward.confirmedCount ?? 0) > 0 && (
              <Alert variant="error">
                Hay {reward.confirmedCount} canjes confirmados de esta recompensa. Se van a
                rechazar automáticamente.
              </Alert>
            )}
            {actionError && (
              <Alert variant="error">
                <AlertMessages messages={actionError.messages} />
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={deactivateMutation.isPending}
                autoFocus
                onClick={() => {
                  setDeactivateDialogOpen(false)
                  setActionError(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={deactivateMutation.isPending}
                onClick={confirmDeactivate}
              >
                {deactivateMutation.isPending ? 'Desactivando…' : 'Desactivar'}
              </Button>
            </div>
          </div>
        </RewardDialog>
      )}
      {deleteDialogOpen && reward && (
        <RewardDialog
          title="Eliminar recompensa"
          onClose={() => {
            setDeleteDialogOpen(false)
            setActionError(null)
          }}
          className="z-[10010]"
        >
          <div className="grid gap-4">
            <p className="text-[15px] text-[#3b2a20]">
              ¿Eliminar <strong>{reward.name}</strong>? Va a dejar de aparecer en el catálogo y no
              se puede deshacer.
            </p>
            {(reward.confirmedCount ?? 0) > 0 && (
              <Alert variant="error">
                Hay {reward.confirmedCount} canjes confirmados de esta recompensa. Se van a
                rechazar automáticamente.
              </Alert>
            )}
            {actionError && (
              <Alert variant="error">
                <AlertMessages messages={actionError.messages} />
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={deleteMutation.isPending}
                autoFocus
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setActionError(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={confirmDelete}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </RewardDialog>
      )}
    </div>,
    document.body,
  )
}
