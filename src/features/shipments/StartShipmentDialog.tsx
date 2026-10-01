import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CarSelect } from '@/features/cars/CarSelect'
import { parseNumber } from '@/features/parcels/status'
import { UserSelect } from '@/features/users/UserSelect'
import { useMutationError } from '@/lib/api/problem'
import type { PlannedShipmentResponse } from '@/lib/api/types'
import { ParcelPickList } from './ParcelPickList'
import { useStartActual } from './queries'

const schema = z.object({
  carId: z.number({ error: 'required' }),
  driverId: z.number({ error: 'required' }),
  startOdometerKm: z.string().trim().refine((s) => s === '' || /^\d+$/.test(s), 'number'),
  notes: z.string().trim(),
  parcelIds: z.array(z.number()),
})

type FormValues = z.infer<typeof schema>

/** Starts a trip either from a CONFIRMED planned shipment (parcels come from it) or ad hoc with a parcel picker. */
export function StartShipmentDialog({
  open,
  onOpenChange,
  planned,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  planned?: PlannedShipmentResponse
}) {
  const { t } = useTranslation('shipments')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('actual.startTitle')}</DialogTitle>
          {planned && <DialogDescription>{t('planned.one', { id: planned.id })}</DialogDescription>}
        </DialogHeader>
        {open && <StartForm planned={planned} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function StartForm({ planned, onClose }: { planned?: PlannedShipmentResponse; onClose: () => void }) {
  const { t } = useTranslation(['shipments', 'common'])
  const navigate = useNavigate()
  const start = useStartActual()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { carId: planned?.carId, driverId: planned?.driverId, startOdometerKm: '', notes: '', parcelIds: [] },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      const trip = await start.mutateAsync({
        plannedShipmentId: planned?.id,
        carId: v.carId,
        driverId: v.driverId,
        startOdometerKm: parseNumber(v.startOdometerKm),
        notes: v.notes || undefined,
        parcelIds: planned ? undefined : v.parcelIds,
      })
      toast.success(t('common:common.saved'))
      onClose()
      navigate(`/shipments/${trip.id}`)
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
                <FieldLabel htmlFor="st-car">{t('shipments:fields.car')}</FieldLabel>
                <CarSelect id="st-car" value={field.value} onChange={field.onChange} invalid={!!errors.carId} />
                <FieldErrorText error={errors.carId} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="driverId"
            render={({ field }) => (
              <Field data-invalid={!!errors.driverId}>
                <FieldLabel htmlFor="st-driver">{t('shipments:fields.driver')}</FieldLabel>
                <UserSelect role="DRIVER" id="st-driver" className="w-full" value={field.value} onChange={field.onChange} invalid={!!errors.driverId} noneLabel={t('common:common.selectPlaceholder')} />
                <FieldErrorText error={errors.driverId} />
              </Field>
            )}
          />
        </div>
        <Field data-invalid={!!errors.startOdometerKm}>
          <FieldLabel htmlFor="st-odo">{t('shipments:fields.startOdometerKm')}</FieldLabel>
          <Input id="st-odo" inputMode="numeric" aria-invalid={!!errors.startOdometerKm} {...form.register('startOdometerKm')} />
          <FieldErrorText error={errors.startOdometerKm} />
        </Field>
        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="st-notes">{t('shipments:fields.notes')}</FieldLabel>
          <Textarea id="st-notes" rows={2} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
        </Field>
        {!planned && (
          <Controller
            control={form.control}
            name="parcelIds"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t('shipments:fields.parcels')}</FieldLabel>
                <ParcelPickList selected={field.value} onChange={field.onChange} />
              </Field>
            )}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('shipments:actual.actions.start')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
