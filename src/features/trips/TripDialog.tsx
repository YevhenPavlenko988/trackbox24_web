import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CarSelect } from '@/features/cars/CarSelect'
import { UserSelect } from '@/features/users/UserSelect'
import { useMutationError } from '@/lib/api/problem'
import type { TripRequest, TripResponse } from '@/lib/api/types'
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/format'

const schema = z
  .object({
    carId: z.number().optional(),
    driverId: z.number().optional(),
    plannedDepartureAt: z.string().min(1, 'required'),
    plannedArrivalAt: z.string(),
    origin: z.string().trim(),
    destination: z.string().trim(),
    notes: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.plannedArrivalAt && v.plannedArrivalAt < v.plannedDepartureAt) {
      ctx.addIssue({ code: 'custom', path: ['plannedArrivalAt'], message: 'arrivalBeforeDeparture' })
    }
  })

type FormValues = z.infer<typeof schema>

export function TripDialog({
  open,
  onOpenChange,
  trip,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip?: TripResponse
  onSubmit: (body: TripRequest) => Promise<unknown>
}) {
  const { t } = useTranslation('trips')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{trip ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>
        {open && <TripForm trip={trip} onSubmit={onSubmit} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function TripForm({ trip, onSubmit, onClose }: { trip?: TripResponse; onSubmit: (body: TripRequest) => Promise<unknown>; onClose: () => void }) {
  const { t } = useTranslation(['trips', 'common'])
  // Car and driver are frozen once loading has started (backend rejects changes in PREPARING).
  const carDriverLocked = trip?.status === 'PREPARING'
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      carId: trip?.carId,
      driverId: trip?.driverId,
      plannedDepartureAt: toDateTimeLocal(trip?.plannedDepartureAt),
      plannedArrivalAt: toDateTimeLocal(trip?.plannedArrivalAt),
      origin: trip?.origin ?? '',
      destination: trip?.destination ?? '',
      notes: trip?.notes ?? '',
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await onSubmit({
        carId: carDriverLocked ? trip?.carId : v.carId,
        driverId: carDriverLocked ? trip?.driverId : v.driverId,
        plannedDepartureAt: fromDateTimeLocal(v.plannedDepartureAt),
        plannedArrivalAt: fromDateTimeLocal(v.plannedArrivalAt),
        origin: v.origin || undefined,
        destination: v.destination || undefined,
        notes: v.notes || undefined,
      })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="carId"
            render={({ field }) => (
              <Field data-invalid={!!errors.carId}>
                <FieldLabel htmlFor="tr-car">{t('trips:fields.car')}</FieldLabel>
                <CarSelect id="tr-car" value={field.value} onChange={field.onChange} disabled={carDriverLocked} />
                <FieldErrorText error={errors.carId} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="driverId"
            render={({ field }) => (
              <Field data-invalid={!!errors.driverId}>
                <FieldLabel htmlFor="tr-driver">{t('trips:fields.driver')}</FieldLabel>
                <UserSelect role="DRIVER" id="tr-driver" className="w-full" value={field.value} onChange={field.onChange} disabled={carDriverLocked} noneLabel={t('common:common.selectPlaceholder')} />
                <FieldErrorText error={errors.driverId} />
              </Field>
            )}
          />
        </div>
        {carDriverLocked && <FieldDescription>{t('trips:actions.carDriverLocked')}</FieldDescription>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.plannedDepartureAt}>
            <FieldLabel htmlFor="tr-departure">{t('trips:fields.plannedDepartureAt')}</FieldLabel>
            <Input id="tr-departure" type="datetime-local" aria-invalid={!!errors.plannedDepartureAt} {...form.register('plannedDepartureAt')} />
            <FieldErrorText error={errors.plannedDepartureAt} />
          </Field>
          <Field data-invalid={!!errors.plannedArrivalAt}>
            <FieldLabel htmlFor="tr-arrival">{t('trips:fields.plannedArrivalAt')}</FieldLabel>
            <Input id="tr-arrival" type="datetime-local" aria-invalid={!!errors.plannedArrivalAt} {...form.register('plannedArrivalAt')} />
            <FieldErrorText error={errors.plannedArrivalAt} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.origin}>
            <FieldLabel htmlFor="tr-origin">{t('trips:fields.origin')}</FieldLabel>
            <Input id="tr-origin" {...form.register('origin')} />
            <FieldErrorText error={errors.origin} />
          </Field>
          <Field data-invalid={!!errors.destination}>
            <FieldLabel htmlFor="tr-destination">{t('trips:fields.destination')}</FieldLabel>
            <Input id="tr-destination" {...form.register('destination')} />
            <FieldErrorText error={errors.destination} />
          </Field>
        </div>
        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="tr-notes">{t('trips:fields.notes')}</FieldLabel>
          <Textarea id="tr-notes" rows={2} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {trip ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
