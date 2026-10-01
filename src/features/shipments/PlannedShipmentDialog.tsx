import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CarSelect } from '@/features/cars/CarSelect'
import { UserSelect } from '@/features/users/UserSelect'
import { useMutationError } from '@/lib/api/problem'
import type { PlannedShipmentRequest, PlannedShipmentResponse } from '@/lib/api/types'
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

export function PlannedShipmentDialog({
  open,
  onOpenChange,
  shipment,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment?: PlannedShipmentResponse
  onSubmit: (body: PlannedShipmentRequest) => Promise<unknown>
}) {
  const { t } = useTranslation('shipments')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{shipment ? t('planned.editTitle') : t('planned.createTitle')}</DialogTitle>
        </DialogHeader>
        {open && <PlannedForm shipment={shipment} onSubmit={onSubmit} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PlannedForm({
  shipment,
  onSubmit,
  onClose,
}: {
  shipment?: PlannedShipmentResponse
  onSubmit: (body: PlannedShipmentRequest) => Promise<unknown>
  onClose: () => void
}) {
  const { t } = useTranslation(['shipments', 'common'])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      carId: shipment?.carId,
      driverId: shipment?.driverId,
      plannedDepartureAt: toDateTimeLocal(shipment?.plannedDepartureAt),
      plannedArrivalAt: toDateTimeLocal(shipment?.plannedArrivalAt),
      origin: shipment?.origin ?? '',
      destination: shipment?.destination ?? '',
      notes: shipment?.notes ?? '',
    },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await onSubmit({
        carId: v.carId,
        driverId: v.driverId,
        plannedDepartureAt: fromDateTimeLocal(v.plannedDepartureAt)!,
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
                <FieldLabel htmlFor="ps-car">{t('shipments:fields.car')}</FieldLabel>
                <CarSelect id="ps-car" value={field.value} onChange={field.onChange} />
                <FieldErrorText error={errors.carId} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="driverId"
            render={({ field }) => (
              <Field data-invalid={!!errors.driverId}>
                <FieldLabel htmlFor="ps-driver">{t('shipments:fields.driver')}</FieldLabel>
                <UserSelect role="DRIVER" id="ps-driver" className="w-full" value={field.value} onChange={field.onChange} noneLabel={t('common:common.selectPlaceholder')} />
                <FieldErrorText error={errors.driverId} />
              </Field>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.plannedDepartureAt}>
            <FieldLabel htmlFor="ps-departure">{t('shipments:fields.plannedDepartureAt')}</FieldLabel>
            <Input id="ps-departure" type="datetime-local" aria-invalid={!!errors.plannedDepartureAt} {...form.register('plannedDepartureAt')} />
            <FieldErrorText error={errors.plannedDepartureAt} />
          </Field>
          <Field data-invalid={!!errors.plannedArrivalAt}>
            <FieldLabel htmlFor="ps-arrival">{t('shipments:fields.plannedArrivalAt')}</FieldLabel>
            <Input id="ps-arrival" type="datetime-local" aria-invalid={!!errors.plannedArrivalAt} {...form.register('plannedArrivalAt')} />
            <FieldErrorText error={errors.plannedArrivalAt} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.origin}>
            <FieldLabel htmlFor="ps-origin">{t('shipments:fields.origin')}</FieldLabel>
            <Input id="ps-origin" {...form.register('origin')} />
            <FieldErrorText error={errors.origin} />
          </Field>
          <Field data-invalid={!!errors.destination}>
            <FieldLabel htmlFor="ps-destination">{t('shipments:fields.destination')}</FieldLabel>
            <Input id="ps-destination" {...form.register('destination')} />
            <FieldErrorText error={errors.destination} />
          </Field>
        </div>
        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="ps-notes">{t('shipments:fields.notes')}</FieldLabel>
          <Textarea id="ps-notes" rows={2} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {shipment ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
