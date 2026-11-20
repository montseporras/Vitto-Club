import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { FormField } from '@/shared/components/forms/FormField'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { Select } from '@/shared/components/ui/Select'
import { Textarea } from '@/shared/components/ui/Textarea'
import { useToast } from '@/shared/components/feedback/useToast'
import { useModalEscape } from '@/shared/hooks/useModalEscape'
import { toApiError } from '@/shared/api/ApiError'
import {
  useCreateMission,
  useDeleteMission,
  useUpdateMission,
} from '../api/missions.queries'
import {
  addMonths,
  conditionLabel,
  monthKeyInArgentina,
  monthLabel,
  MISSION_WEEK_DAYS,
} from '../lib/mission-presentation'
import type { Mission, UpdateMissionBody } from '../types/mission'
import {
  createMissionSchema,
  type CreateMissionFormInput,
  type CreateMissionFormOutput,
} from '../schemas/create-mission.schema'

const DAY_OPTIONS = [
  { value: 1, title: 'lunes' },
  { value: 2, title: 'martes' },
  { value: 3, title: 'miércoles' },
  { value: 4, title: 'jueves' },
  { value: 5, title: 'viernes' },
  { value: 6, title: 'sábado' },
  { value: 7, title: 'domingo' },
]

function monthOptions(start: string) {
  return Array.from({ length: 12 }, (_, index) => {
    const value = addMonths(start, index)
    return { value, label: monthLabel(value, true) }
  })
}

function a11yError(id: string, message: string | undefined) {
  return {
    'aria-invalid': message ? true : undefined,
    'aria-describedby': message ? `${id}-error` : undefined,
  }
}

type MissionCreateModalProps = {
  onClose: () => void
  mission?: Mission
}

function missionFormValues(mission: Mission | null, currentMonth: string): CreateMissionFormInput {
  const pending = mission?.pendingChanges
  const objectiveType = pending ? pending.objectiveType : mission?.objectiveType
  const target = pending ? pending.target : mission?.target
  const daysOfWeek = pending ? pending.daysOfWeek : mission?.daysOfWeek
  const timeFrom = pending ? pending.timeFrom : mission?.timeFrom
  const timeTo = pending ? pending.timeTo : mission?.timeTo
  const rewardPoints = pending ? pending.rewardPoints : mission?.rewardPoints

  return {
    name: mission?.name ?? '',
    description: mission?.description ?? '',
    objectiveType: objectiveType ?? 'CONSUMPTION_COUNT',
    target: target === undefined ? '' : String(target),
    allDays: daysOfWeek === null || daysOfWeek === undefined,
    daysOfWeek: daysOfWeek ?? [],
    timeFrom: timeFrom ?? '',
    timeTo: timeTo ?? '',
    rewardPointsInput: rewardPoints === null || rewardPoints === undefined ? '' : String(rewardPoints),
    noReward: rewardPoints === null,
    startMonth: mission?.startMonth ?? currentMonth,
    endMonth: mission?.endMonth ?? '',
    repeats: mission?.endMonth === null || mission === null,
  }
}

function sameDays(left: number[] | null, right: number[] | null) {
  if (left === null || right === null) return left === right
  const sortedLeft = left.slice().sort((a, b) => a - b)
  const sortedRight = right.slice().sort((a, b) => a - b)
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((day, index) => day === sortedRight[index])
  )
}

function updateBodyFromForm(values: CreateMissionFormOutput, mission: Mission): UpdateMissionBody {
  const pending = mission.pendingChanges
  const current = {
    objectiveType: pending ? pending.objectiveType : mission.objectiveType,
    target: pending ? pending.target : mission.target,
    daysOfWeek: pending ? pending.daysOfWeek : mission.daysOfWeek,
    timeFrom: pending ? pending.timeFrom : mission.timeFrom,
    timeTo: pending ? pending.timeTo : mission.timeTo,
    rewardPoints: pending ? pending.rewardPoints : mission.rewardPoints,
  }
  const body: UpdateMissionBody = {}

  if (values.name !== mission.name) body.name = values.name
  if (values.description !== (mission.description ?? '')) body.description = values.description
  if (values.objectiveType !== current.objectiveType) body.objectiveType = values.objectiveType
  if (values.target !== current.target) body.target = values.target
  if (!sameDays(values.daysOfWeek, current.daysOfWeek)) body.daysOfWeek = values.daysOfWeek
  if (values.timeFrom !== current.timeFrom) body.timeFrom = values.timeFrom
  if (values.timeTo !== current.timeTo) body.timeTo = values.timeTo
  if (values.rewardPoints !== current.rewardPoints) body.rewardPoints = values.rewardPoints
  if (values.startMonth !== mission.startMonth) body.startMonth = values.startMonth
  if (values.endMonth !== mission.endMonth) body.endMonth = values.endMonth

  return body
}

export function MissionCreateModal({ onClose, mission: initialMission }: MissionCreateModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [serverMessages, setServerMessages] = useState<string[] | null>(null)
  const [deleteMessages, setDeleteMessages] = useState<string[] | null>(null)
  const [currentMission, setCurrentMission] = useState<Mission | null>(initialMission ?? null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deferredNotice, setDeferredNotice] = useState<string | null>(null)
  const currentMonth = monthKeyInArgentina()
  const lockedStartMonth =
    currentMission && currentMission.startMonth <= currentMonth
      ? currentMission.startMonth
      : null
  const schema = useMemo(
    () => createMissionSchema(currentMonth, lockedStartMonth),
    [currentMonth, lockedStartMonth],
  )
  const createMutation = useCreateMission()
  const updateMutation = useUpdateMission()
  const deleteMutation = useDeleteMission()
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    reset,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateMissionFormInput, unknown, CreateMissionFormOutput>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: missionFormValues(currentMission, currentMonth),
  })
  const allDays = useWatch({ control, name: 'allDays' })
  const daysOfWeek = useWatch({ control, name: 'daysOfWeek' })
  const objectiveType = useWatch({ control, name: 'objectiveType' })
  const noReward = useWatch({ control, name: 'noReward' })
  const repeats = useWatch({ control, name: 'repeats' })
  const startMonth = useWatch({ control, name: 'startMonth' })
  const description = useWatch({ control, name: 'description' })
  const timeFrom = useWatch({ control, name: 'timeFrom' })
  const timeTo = useWatch({ control, name: 'timeTo' })
  const startOptions = useMemo(() => monthOptions(currentMonth), [currentMonth])
  const availableStartOptions = useMemo(() => {
    if (
      currentMission &&
      currentMission.startMonth < currentMonth &&
      !startOptions.some((option) => option.value === currentMission.startMonth)
    ) {
      return [
        {
          value: currentMission.startMonth,
          label: monthLabel(currentMission.startMonth, true),
        },
        ...startOptions,
      ]
    }
    return startOptions
  }, [currentMission, currentMonth, startOptions])
  const endOptions = useMemo(() => monthOptions(startMonth || currentMonth), [currentMonth, startMonth])

  const closeModal = () => {
    if (confirmingDelete) {
      setConfirmingDelete(false)
      return
    }
    onClose()
  }

  useModalEscape(closeModal)

  const goToRewardStep = async () => {
    setServerMessages(null)
    const valid = await trigger([
      'name',
      'objectiveType',
      'target',
      'allDays',
      'daysOfWeek',
      'timeFrom',
      'timeTo',
    ])
    if (valid) setStep(2)
  }

  const save = async (data: CreateMissionFormOutput) => {
    setServerMessages(null)
    try {
      if (currentMission) {
        const result = await updateMutation.mutateAsync({
          id: currentMission.id,
          body: updateBodyFromForm(data, currentMission),
        })
        setCurrentMission(result.mission)
        reset(missionFormValues(result.mission, currentMonth))
        if (result.appliesFrom) {
          setDeferredNotice(
            `Los cambios del objetivo y la recompensa se aplican desde ${monthLabel(result.appliesFrom)}. Este mes sigue igual para los clientes.`,
          )
          toast('Misión guardada.')
          return
        }
      } else {
        await createMutation.mutateAsync(data)
      }
      toast('Misión guardada.')
      onClose()
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.code === 'MISSION_NAME_IN_USE') {
        setStep(1)
        setError(
          'name',
          { message: 'Ya existe una misión con ese nombre.' },
          { shouldFocus: true },
        )
        return
      }

      let mappedFieldError = false
      for (const detail of apiError.details) {
        if (
          detail.field === 'name' ||
          detail.field === 'description' ||
          detail.field === 'target' ||
          detail.field === 'daysOfWeek' ||
          detail.field === 'timeFrom' ||
          detail.field === 'timeTo' ||
          detail.field === 'rewardPoints' ||
          detail.field === 'startMonth' ||
          detail.field === 'endMonth'
        ) {
          setError(
            detail.field === 'rewardPoints' ? 'rewardPointsInput' : detail.field,
            { message: detail.message },
          )
          mappedFieldError = true
        }
      }
      if (!mappedFieldError) setServerMessages(apiError.messages)
    }
  }

  const deleteMission = async () => {
    if (!currentMission) return
    setDeleteMessages(null)
    try {
      await deleteMutation.mutateAsync(currentMission.id)
      toast('Misión eliminada.')
      onClose()
    } catch (error) {
      setDeleteMessages(toApiError(error).messages)
    }
  }

  const onInvalid = () => {
    if (
      errors.name ||
      errors.target ||
      errors.daysOfWeek ||
      errors.timeFrom ||
      errors.timeTo
    ) {
      setStep(1)
    }
  }

  return (
    <Modal
      title={
        confirmingDelete
          ? 'Eliminar misión'
          : currentMission
            ? 'Editar misión'
            : 'Crear misión mensual'
      }
      onClose={closeModal}
      className={`${confirmingDelete ? 'max-w-[460px]' : 'max-w-[640px]'} overflow-y-auto`}
      bodyClassName="space-y-4"
    >
      {confirmingDelete ? (
        <div className="space-y-4">
          {deleteMessages && (
            <Alert variant="error">
              No se pudo eliminar la misión.
              <AlertMessages messages={deleteMessages} />
            </Alert>
          )}
          <p className="text-[15px]">
            ¿Eliminar la misión &quot;<strong>{currentMission?.name}</strong>&quot;? Los clientes que
            la tienen en progreso este mes la pierden. Los que ya la completaron reciben su
            recompensa.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={deleteMutation.isPending} onClick={deleteMission}>
              Eliminar
            </Button>
          </div>
        </div>
      ) : (
        <>
      {deferredNotice && (
        <div
          role="status"
          className="rounded-xl border border-[#f6d0b1] bg-[#fffaf5] px-3 py-2 text-sm text-[#5c5249]"
        >
          {deferredNotice}
        </div>
      )}
      <div
        className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#7e3e20]"
        aria-label={`Paso ${step} de 2`}
      >
        <span
          className={`grid size-[22px] place-items-center rounded-full ${step === 1 ? 'bg-[#a8532a] text-white' : 'bg-[#fbe6d4]'}`}
        >
          1
        </span>
        <span>Objetivo</span>
        <span className="h-0.5 w-7 bg-[#f6d0b1]" aria-hidden="true" />
        <span
          className={`grid size-[22px] place-items-center rounded-full ${step === 2 ? 'bg-[#a8532a] text-white' : 'bg-[#fbe6d4]'}`}
        >
          2
        </span>
        <span>Recompensa y vigencia</span>
      </div>

      {serverMessages && (
        <Alert variant="error">
          No se pudo guardar la misión.
          <AlertMessages messages={serverMessages} />
        </Alert>
      )}

      <form onSubmit={handleSubmit(save, onInvalid)} noValidate>
        {step === 1 ? (
          <div className="space-y-4">
            <FormField id="mission-name" label="Nombre" error={errors.name?.message}>
              <Input
                id="mission-name"
                maxLength={80}
                autoFocus
                {...a11yError('mission-name', errors.name?.message)}
                {...register('name')}
                placeholder="Ej: Vení 3 veces este mes"
              />
            </FormField>

            <FormField
              id="mission-description"
              label="Descripción"
              optional
              error={errors.description?.message}
            >
              <Textarea
                id="mission-description"
                maxLength={255}
                {...a11yError('mission-description', errors.description?.message)}
                {...register('description')}
                placeholder="Ej: Sumá 3 consumos en el mes y ganá 50 puntos."
              />
              <p className="mt-1 text-right text-[11px] text-[#7a6e63]">
                {description.length}/255
              </p>
            </FormField>

            <fieldset className="space-y-2">
              <legend className="flex items-center gap-2 text-sm font-semibold text-[#3b2a20]">
                Tipo de objetivo
                <span className="group relative inline-grid size-5 place-items-center rounded-full border border-[#d9804f] bg-white text-xs font-bold text-[#a8532a] focus-within:outline-2 focus-within:outline-[#a9532b]">
                  <button
                    type="button"
                    className="size-full rounded-full"
                    aria-label="Ayuda sobre los tipos de objetivo"
                    aria-describedby="mission-objective-help"
                  >
                    ?
                  </button>
                  <span
                    id="mission-objective-help"
                    role="tooltip"
                    className="invisible absolute top-[calc(100%+8px)] left-0 z-10 w-80 max-w-[80vw] rounded-xl border border-[#f6d0b1] bg-[#fffaf5] p-3 text-left text-[13px] leading-5 font-normal text-[#5c5249] opacity-0 shadow-xl group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                  >
                    <strong>Cantidad de consumos:</strong> cuenta cuántos consumos hace el cliente en
                    el mes que cumplen los días y el horario elegidos. Ej.: objetivo 3 → tiene que
                    venir 3 veces.
                    <br />
                    <strong>Monto acumulado:</strong> suma el monto en $ de esos consumos. Ej.:
                    objetivo $ 20.000 → sus consumos del mes tienen que sumar $ 20.000, en una o
                    varias visitas.
                  </span>
                </span>
              </legend>
              <div role="group" aria-label="Tipo de objetivo" className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={objectiveType === 'CONSUMPTION_COUNT' ? 'primary' : 'secondary'}
                  aria-pressed={objectiveType === 'CONSUMPTION_COUNT'}
                  onClick={() => {
                    clearErrors('target')
                    setValue('objectiveType', 'CONSUMPTION_COUNT', { shouldValidate: true })
                  }}
                >
                  Cantidad de consumos
                </Button>
                <Button
                  type="button"
                  variant={objectiveType === 'CONSUMPTION_AMOUNT' ? 'primary' : 'secondary'}
                  aria-pressed={objectiveType === 'CONSUMPTION_AMOUNT'}
                  onClick={() => {
                    clearErrors('target')
                    setValue('objectiveType', 'CONSUMPTION_AMOUNT', { shouldValidate: true })
                  }}
                >
                  Monto acumulado
                </Button>
              </div>
            </fieldset>

            <FormField
              id="mission-target"
              label={
                objectiveType === 'CONSUMPTION_AMOUNT'
                  ? 'Objetivo (monto en $)'
                  : 'Objetivo (cantidad de consumos)'
              }
              error={errors.target?.message}
            >
              <Input
                id="mission-target"
                inputMode={objectiveType === 'CONSUMPTION_AMOUNT' ? 'decimal' : 'numeric'}
                {...a11yError('mission-target', errors.target?.message)}
                {...register('target')}
                placeholder={objectiveType === 'CONSUMPTION_AMOUNT' ? '20.000' : '3'}
              />
            </FormField>

            <fieldset
              className="space-y-2"
              aria-describedby={errors.daysOfWeek ? 'mission-days-error' : undefined}
            >
              <legend className="text-sm font-semibold text-[#3b2a20]">Días</legend>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#3b2a20]">
                <input
                  type="checkbox"
                  {...register('allDays')}
                  onChange={(event) => {
                    register('allDays').onChange(event)
                    if (event.target.checked) {
                      clearErrors('daysOfWeek')
                    }
                  }}
                />
                Todos los días
              </label>
              {!allDays && (
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => {
                    const selected = daysOfWeek.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={day.title}
                        title={day.title}
                        onClick={() => {
                          const next = selected
                            ? daysOfWeek.filter((value) => value !== day.value)
                            : [...daysOfWeek, day.value]
                          clearErrors('daysOfWeek')
                          setValue('allDays', false)
                          setValue('daysOfWeek', next, { shouldValidate: true })
                        }}
                        className={`grid size-10 place-items-center rounded-full border font-heading text-sm font-bold focus-visible:outline-2 focus-visible:outline-[#a9532b] ${selected ? 'border-[#a8532a] bg-[#a8532a] text-white' : 'border-[#f6d0b1] bg-white text-[#7e3e20]'}`}
                      >
                        {MISSION_WEEK_DAYS[day.value]}
                      </button>
                    )
                  })}
                </div>
              )}
              {errors.daysOfWeek?.message && (
                <p id="mission-days-error" className="text-sm text-red-700">
                  {errors.daysOfWeek.message}
                </p>
              )}
            </fieldset>

            <fieldset
              className="space-y-2"
              aria-describedby={errors.timeFrom ? 'mission-time-error' : undefined}
            >
              <legend className="text-sm font-semibold text-[#3b2a20]">
                Horario <span className="font-normal text-[#7a6e63]">(opcional)</span>
              </legend>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="mission-time-from" className="mb-1 block text-xs text-[#5c5249]">
                    Desde
                  </label>
                  <Input
                    id="mission-time-from"
                    type="time"
                    className="w-36"
                    {...a11yError('mission-time', errors.timeFrom?.message)}
                    {...register('timeFrom')}
                  />
                </div>
                <div>
                  <label htmlFor="mission-time-to" className="mb-1 block text-xs text-[#5c5249]">
                    Hasta
                  </label>
                  <Input
                    id="mission-time-to"
                    type="time"
                    className="w-36"
                    {...a11yError('mission-time', errors.timeFrom?.message)}
                    {...register('timeTo')}
                  />
                </div>
                {(timeFrom || timeTo) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      clearErrors(['timeFrom', 'timeTo'])
                      setValue('timeFrom', '')
                      setValue('timeTo', '')
                    }}
                  >
                    Quitar horario
                  </Button>
                )}
              </div>
              {errors.timeFrom?.message && (
                <p id="mission-time-error" className="text-sm text-red-700">
                  {errors.timeFrom.message}
                </p>
              )}
            </fieldset>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={goToRewardStep}>
                Siguiente
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <MissionSummary control={control} />

            <section aria-labelledby="mission-reward-heading" className="space-y-3">
              <h4 id="mission-reward-heading" className="border-b border-[#fbe6d4] pb-2 font-bold text-[#7e3e20]">
                Recompensa
              </h4>
              <FormField
                id="mission-reward-points"
                label="Puntos"
                error={errors.rewardPointsInput?.message}
              >
                <Input
                  id="mission-reward-points"
                  inputMode="numeric"
                  disabled={noReward}
                  {...a11yError('mission-reward-points', errors.rewardPointsInput?.message)}
                  {...register('rewardPointsInput')}
                  placeholder={noReward ? 'Sin recompensa' : '50'}
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-[#3b2a20]">
                  <input
                    type="checkbox"
                    {...register('noReward')}
                    onChange={(event) => {
                      register('noReward').onChange(event)
                      if (event.target.checked) clearErrors('rewardPointsInput')
                    }}
                  />
                  Sin recompensa
                </label>
              </FormField>
              <p className="text-xs text-[#7a6e63]">
                Los puntos de una misión no cuentan para el nivel del cliente.
              </p>
            </section>

            <section aria-labelledby="mission-validity-heading" className="space-y-3">
              <h4 id="mission-validity-heading" className="border-b border-[#fbe6d4] pb-2 font-bold text-[#7e3e20]">
                Vigencia
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  id="mission-start-month"
                  label="Mes de inicio"
                  error={errors.startMonth?.message}
                >
                  <Select
                    id="mission-start-month"
                    options={availableStartOptions}
                    disabled={lockedStartMonth !== null}
                    {...a11yError('mission-start-month', errors.startMonth?.message)}
                    {...register('startMonth', {
                      onChange: () => clearErrors('endMonth'),
                    })}
                  />
                  {lockedStartMonth && (
                    <p className="mt-1 text-xs text-[#7a6e63]">
                      La misión ya empezó: no se puede cambiar el mes de inicio.
                    </p>
                  )}
                </FormField>
                <FormField
                  id="mission-end-month"
                  label="Mes de fin"
                  hideRequiredMark
                  error={errors.endMonth?.message}
                >
                  <Select
                    id="mission-end-month"
                    disabled={repeats}
                    options={endOptions}
                    {...a11yError('mission-end-month', errors.endMonth?.message)}
                    {...register('endMonth')}
                  />
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-[#3b2a20]">
                    <input
                      type="checkbox"
                      {...register('repeats')}
                      onChange={(event) => {
                        register('repeats').onChange(event)
                        if (event.target.checked) clearErrors('endMonth')
                      }}
                    />
                    Se repite todos los meses
                  </label>
                </FormField>
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {currentMission && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mr-auto"
                  onClick={() => {
                    setDeleteMessages(null)
                    setConfirmingDelete(true)
                  }}
                >
                  Eliminar
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
              >
                Guardar misión
              </Button>
            </div>
          </div>
        )}
      </form>
        </>
      )}
    </Modal>
  )
}

function MissionSummary({
  control,
}: {
  control: Control<CreateMissionFormInput, unknown, CreateMissionFormOutput>
}) {
  const name = useWatch({ control, name: 'name' })
  const objectiveType = useWatch({ control, name: 'objectiveType' })
  const target = useWatch({ control, name: 'target' })
  const allDays = useWatch({ control, name: 'allDays' })
  const daysOfWeek = useWatch({ control, name: 'daysOfWeek' })
  const timeFrom = useWatch({ control, name: 'timeFrom' })
  const timeTo = useWatch({ control, name: 'timeTo' })
  const objective =
    objectiveType === 'CONSUMPTION_AMOUNT'
      ? `$ ${target || '0'} en consumos`
      : `${target || '0'} ${target === '1' ? 'consumo' : 'consumos'}`
  const condition = conditionLabel({
    daysOfWeek: allDays ? null : daysOfWeek,
    timeFrom: timeFrom || null,
    timeTo: timeTo || null,
  })

  return (
    <div className="rounded-xl border border-[#f6d0b1] bg-[#fffaf5] px-3.5 py-2.5 text-sm text-[#5c5249]">
      <strong className="text-[#2b1a10]">{name}</strong> · {objective}
      {condition ? `, ${condition}` : ', todos los días'}
    </div>
  )
}
