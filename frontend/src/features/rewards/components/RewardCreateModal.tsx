import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormField } from '@/shared/components/forms/FormField'
import { ImagePicker } from '@/shared/components/forms/ImagePicker'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { SubmitHint } from '@/shared/components/forms/SubmitHint'
import { Button } from '@/shared/components/ui/Button'
import { DeleteButton } from '@/shared/components/ui/DeleteButton'
import { Switch } from '@/shared/components/ui/Switch'
import { useMissingFields } from '@/shared/hooks/useMissingFields'
import { useUndoableAction } from '@/shared/hooks/useUndoableAction'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { DatePicker } from '@/shared/components/ui/DatePicker'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { useToast } from '@/shared/components/feedback/useToast'
import { todayIsoInTimeZone } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { modalStyles } from '@/styles/ui'
import { toApiError, type ApiError } from '@/shared/api/ApiError'
import {
  useActivateReward,
  useAdminReward,
  useCreateReward,
  useDeleteReward,
  useDeleteRewardPhoto,
  useDeactivateReward,
  useUpdateReward,
  useUploadRewardPhoto,
} from '../api/rewards.queries'
import {
  createRewardSchema,
  type CreateRewardFormInput,
  type CreateRewardFormOutput,
} from '../schemas/create-reward.schema'
import type { Reward } from '../types/reward'
import { RewardImage } from './RewardImage'

const REWARD_FORM_FIELDS = ['name', 'description', 'points', 'stock', 'expiresAt'] as const
type RewardFormField = (typeof REWARD_FORM_FIELDS)[number]

function isRewardFormField(field: string): field is RewardFormField {
  return REWARD_FORM_FIELDS.some((candidate) => candidate === field)
}

// La foto se aplica al guardar, como en el prototipo: una elegida para subir o la guardada para quitar
type PhotoChange = { kind: 'file'; file: File } | { kind: 'remove' } | null

// Contrato S5 §3.5.2
const PHOTO_NOT_UPLOADED = 'La recompensa se guardó, pero no se pudo subir la foto.'

type RewardCreateModalProps = {
  onClose: () => void
  rewardId?: number
  /** Duplicar: abre "Crear" con los datos de esta recompensa (sin la foto) y el nombre "(copia)". */
  duplicateFromId?: number
  /**
   * Eliminar: la pantalla del listado oculta la recompensa y ofrece "Deshacer" antes de mandar la
   * baja. Si no se pasa, se elimina al confirmar.
   */
  onDeleteRequested?: (reward: Reward) => void
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

export function RewardCreateModal({
  onClose,
  rewardId,
  duplicateFromId,
  onDeleteRequested,
}: RewardCreateModalProps) {
  const [serverError, setServerError] = useState<{ messages: string[] } | null>(null)
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [photoChange, setPhotoChange] = useState<PhotoChange>(null)
  // Error de la foto que devuelve el backend (400 INVALID_IMAGE), debajo del selector
  const [photoError, setPhotoError] = useState<string | null>(null)
  // Si al crear falla la foto, el modal sigue abierto en modo Editar (decisión de Melisa)
  const [createdId, setCreatedId] = useState<number | undefined>(undefined)
  const today = todayIsoInTimeZone('America/Argentina/Buenos_Aires')
  const currentId = rewardId ?? createdId
  const isEditing = currentId !== undefined
  const rewardQuery = useAdminReward(currentId)
  const reward = rewardQuery.data
  const sourceQuery = useAdminReward(isEditing ? undefined : duplicateFromId)
  const source = sourceQuery.data
  const runUndoable = useUndoableAction()
  // El interruptor cambia al instante; mientras se confirma (o se puede deshacer) manda este valor
  const [optimisticActive, setOptimisticActive] = useState<boolean | null>(null)
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
  const uploadPhotoMutation = useUploadRewardPhoto()
  const deletePhotoMutation = useDeleteRewardPhoto()
  const showToast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
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
    mode: 'onChange',
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

  // Duplicar: los datos de la recompensa original, con "(copia)" en el nombre. La foto no se copia.
  useEffect(() => {
    if (!source) return
    reset({
      name: `${source.name} (copia)`.slice(0, 80),
      description: source.description ?? '',
      points: String(source.points),
      stock: source.stock === null ? '' : String(source.stock),
      unlimitedStock: source.stock === null,
      expiresAt: source.expiresAt ?? '',
      noExpiry: source.expiresAt === null,
    })
  }, [source, reset])

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

  const onSubmit = async (data: CreateRewardFormOutput) => {
    setServerError(null)
    setPhotoError(null)
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

    // Sube o quita la foto pendiente (S5 §3.5.2). Devuelve el error, si falló.
    const change = photoChange
    const applyPhoto = async (id: number): Promise<ApiError | null> => {
      if (!change) return null
      try {
        if (change.kind === 'file') {
          await uploadPhotoMutation.mutateAsync({ id, file: change.file })
        } else {
          await deletePhotoMutation.mutateAsync(id)
        }
        setPhotoChange(null)
        return null
      } catch (error) {
        return toApiError(error)
      }
    }

    // Si la foto falla (decisión de Melisa, opción a): el INVALID_IMAGE va debajo del selector; si
    // los datos ya se guardaron y no se pudo subir, el aviso del contrato; si no, el mensaje del
    // backend, sin textos nuevos.
    const showPhotoFailure = (error: ApiError, dataSaved: boolean) => {
      const invalidImage = error.code === 'INVALID_IMAGE'
      if (invalidImage) setPhotoError(error.messages[0] ?? null)
      if (change?.kind === 'file' && dataSaved) {
        setServerError({ messages: [PHOTO_NOT_UPLOADED] })
      } else if (!invalidImage) {
        setServerError(error)
      }
    }

    if (isEditing && currentId !== undefined) {
      let availabilityMessage = ''
      let dataSaved = false
      // Si solo cambió la foto, no se manda el PATCH (no deja un "Modificó recompensa" vacío)
      if (isDirty || !change) {
        try {
          const { availabilityChange } = await updateMutation.mutateAsync({
            id: currentId,
            body: data,
          })
          availabilityMessage =
            availabilityChange === 'ENABLED'
              ? ' La recompensa volvió a estar disponible.'
              : availabilityChange === 'DISABLED'
                ? ' La recompensa quedó deshabilitada porque no tiene stock o está vencida.'
                : ''
          dataSaved = true
        } catch (error) {
          handleError(toApiError(error))
          return
        }
      }
      const photoFailure = await applyPhoto(currentId)
      if (photoFailure) {
        showPhotoFailure(photoFailure, dataSaved)
        return
      }
      showToast(`Recompensa guardada.${availabilityMessage}`)
      onClose()
      return
    }

    // Al crear, la foto se sube después del POST, con el id nuevo (S5 §3.5.2)
    let created: Reward
    try {
      created = await createMutation.mutateAsync(data)
    } catch (error) {
      handleError(toApiError(error))
      return
    }
    const photoFailure = await applyPhoto(created.id)
    if (photoFailure) {
      setCreatedId(created.id)
      showPhotoFailure(photoFailure, true)
      return
    }
    showToast('Recompensa guardada.')
    onClose()
  }

  // Interruptor encendido: se activa al instante, sin "Guardar"
  const activate = () => {
    if (currentId === undefined) return
    setServerError(null)
    setOptimisticActive(true)
    activateMutation.mutate(currentId, {
      onSuccess: ({ reward: activatedReward }) => {
        setOptimisticActive(null)
        showToast(
          activatedReward.status === 'DISABLED'
            ? 'Recompensa activada, pero sin stock o vencida: los clientes no la ven hasta que la repongas.'
            : 'Recompensa activada',
        )
      },
      onError: (error) => {
        setOptimisticActive(null)
        setServerError(error)
      },
    })
  }

  // Interruptor apagado: se ve al instante y hay unos segundos para deshacer antes de mandarlo
  const deactivateWithUndo = () => {
    if (currentId === undefined) return
    const id = currentId
    setServerError(null)
    setOptimisticActive(false)
    runUndoable({
      message: 'Recompensa desactivada',
      undoneMessage: 'La recompensa sigue activa',
      commit: async () => {
        const { rejectedRedemptions } = await deactivateMutation.mutateAsync(id)
        setOptimisticActive(null)
        if (rejectedRedemptions > 0) {
          showToast(`Recompensa desactivada. Se rechazaron ${rejectedRedemptions} canjes confirmados.`)
        }
      },
      onUndo: () => setOptimisticActive(null),
      onError: () => setOptimisticActive(null),
    })
  }

  const onToggleActive = (next: boolean) => {
    if (!reward) return
    if (next) {
      activate()
    } else if ((reward.confirmedCount ?? 0) > 0) {
      // Desactivar rechaza los canjes confirmados: eso se avisa antes
      setActionError(null)
      setDeactivateDialogOpen(true)
    } else {
      deactivateWithUndo()
    }
  }

  const confirmDeactivate = () => {
    setDeactivateDialogOpen(false)
    deactivateWithUndo()
  }

  const confirmDelete = () => {
    if (currentId === undefined) return
    setActionError(null)
    if (onDeleteRequested && reward) {
      setDeleteDialogOpen(false)
      onDeleteRequested(reward)
      onClose()
      return
    }
    deleteMutation.mutate(currentId, {
      onSuccess: () => {
        showToast('Recompensa eliminada')
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
  // Qué falta para poder guardar: el stock y el vencimiento solo si no se marcó "sin límite" / "no vence"
  const missing = useMissingFields(
    control,
    { name: 'Nombre', description: 'Descripción', points: 'Puntos', stock: 'Stock', expiresAt: 'Vencimiento' },
    ['description', ...(unlimitedStock ? (['stock'] as const) : []), ...(noExpiry ? (['expiresAt'] as const) : [])],
  )
  const isActiveOn = optimisticActive ?? reward?.status !== 'INACTIVE'
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    deleteMutation.isPending ||
    uploadPhotoMutation.isPending ||
    deletePhotoMutation.isPending
  const title = isEditing
    ? 'Editar recompensa'
    : duplicateFromId !== undefined
      ? 'Duplicar recompensa'
      : 'Crear recompensa'

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
            {/* Mientras el interruptor espera (o se puede deshacer), el estado ya muestra el cambio */}
            {optimisticActive === null ? (
              <Badge variant={rewardStatusVariant(reward)} className="normal-case tracking-normal">
                {rewardStatusLabel(reward)}
              </Badge>
            ) : (
              <Badge variant={optimisticActive ? 'success' : 'danger'} className="normal-case tracking-normal">
                {optimisticActive ? 'Activa' : 'Inactiva'}
              </Badge>
            )}
            <span>
              · Canjes confirmados: <strong>{reward.confirmedCount ?? 0}</strong>
            </span>
            {/* Activar o desactivar se aplica al instante, sin el botón "Guardar" */}
            <Switch
              className="ml-auto"
              checked={isActiveOn}
              onChange={onToggleActive}
              label={`Recompensa ${reward.name} activa`}
              onText="Activa"
              offText="Inactiva"
              pending={activateMutation.isPending}
            />
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

          {/* US-34: foto con vista previa, "Elegir imagen" y "Quitar" (S5 §3.5.2) */}
          <ImagePicker
            label="Foto que ven los clientes"
            photoUrl={reward?.photoUrl ?? null}
            previewAlt="Foto de la recompensa"
            placeholder={
              <RewardImage
                photoUrl={null}
                className="size-24 rounded-[14px]"
                iconClassName="size-7"
                genericLabel="Imagen genérica"
              />
            }
            hint="JPG, PNG o WebP de hasta 2 MB. Sin foto, los clientes ven la imagen genérica."
            error={photoError}
            disabled={isPending}
            onSelect={(file) => {
              setPhotoError(null)
              setPhotoChange({ kind: 'file', file })
            }}
            onRemove={() => {
              setPhotoError(null)
              // Una elegida y no subida solo se descarta; la guardada se quita al guardar
              setPhotoChange(reward?.photoUrl ? { kind: 'remove' } : null)
            }}
          />

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
              {/* Calendario con el formato de Consumos; se abre hacia arriba porque el campo está al pie */}
              <Controller
                control={control}
                name="expiresAt"
                render={({ field }) => (
                  <DatePicker
                    id="reward-expiresAt"
                    value={field.value}
                    onChange={field.onChange}
                    min={today}
                    disabled={noExpiry}
                    invalid={Boolean(errors.expiresAt)}
                    aria-describedby={errors.expiresAt ? 'reward-expiresAt-error' : undefined}
                    placement="top"
                  />
                )}
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
            <DeleteButton
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setServerError(null)
                setActionError(null)
                setDeleteDialogOpen(true)
              }}
            />
          ) : (
            <span />
          )}
          {missing.length > 0 && <SubmitHint id="reward-missing" missing={missing} />}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isPending}
              disabled={isPending || missing.length > 0}
              aria-describedby={missing.length > 0 ? 'reward-missing' : undefined}
            >
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
                loading={deactivateMutation.isPending}
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
              ¿Eliminar <strong>{reward.name}</strong>? Va a dejar de aparecer en el catálogo. Si te
              equivocás, tenés unos segundos para deshacerlo.
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
              <DeleteButton
                loading={deleteMutation.isPending}
                type="button"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={confirmDelete}
              />
            </div>
          </div>
        </RewardDialog>
      )}
    </div>,
    document.body,
  )
}
