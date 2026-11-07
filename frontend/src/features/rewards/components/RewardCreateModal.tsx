import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { FormField } from '@/shared/components/forms/FormField'
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
import { useCreateReward } from '../api/rewards.queries'
import {
  createRewardSchema,
  type CreateRewardFormInput,
  type CreateRewardFormOutput,
} from '../schemas/create-reward.schema'

const REWARD_FORM_FIELDS = ['name', 'description', 'points', 'stock', 'expiresAt'] as const
type RewardFormField = (typeof REWARD_FORM_FIELDS)[number]

function isRewardFormField(field: string): field is RewardFormField {
  return REWARD_FORM_FIELDS.some((candidate) => candidate === field)
}

type RewardCreateModalProps = {
  onClose: () => void
}

export function RewardCreateModal({ onClose }: RewardCreateModalProps) {
  const [serverError, setServerError] = useState<{ messages: string[] } | null>(null)
  const today = todayIsoInTimeZone('America/Argentina/Buenos_Aires')
  const schema = useMemo(() => createRewardSchema(today), [today])
  const createMutation = useCreateReward()
  const showToast = useToast()
  const {
    register,
    handleSubmit,
    setError,
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const descriptionLength = useWatch({ control, name: 'description' })?.length ?? 0

  const onSubmit = (data: CreateRewardFormOutput) => {
    setServerError(null)
    createMutation.mutate(data, {
      onSuccess: () => {
        showToast('Recompensa guardada.')
        onClose()
      },
      onError: (error) => {
        if (error.code === 'REWARD_NAME_IN_USE') {
          setError(
            'name',
            { message: 'Ya existe una recompensa con ese nombre.' },
            { shouldFocus: true },
          )
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
      },
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

  return createPortal(
    <div
      className={cn(modalStyles.overlay, 'z-[10000] bg-[#2d180e]/50')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-reward-title"
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
        <h3
          id="create-reward-title"
          className="pr-10 font-heading text-lg font-bold text-[#5a2a14]"
        >
          Crear recompensa
        </h3>

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

        <div className="mt-1 flex flex-wrap justify-end gap-2 border-t border-[#fbe6d4] pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="h-10"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending} className="h-10">
            {createMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
      </div>
    </div>,
    document.body,
  )
}
