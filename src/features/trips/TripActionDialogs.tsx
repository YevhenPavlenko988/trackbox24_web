import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { parseNumber } from '@/features/parcels/status'
import { useMoveParcelsToWarehouse } from '@/features/warehouses/queries'
import { WarehouseSelect } from '@/features/warehouses/WarehouseSelect'
import { isApiError, showApiError, useMutationError } from '@/lib/api/problem'
import type { ParcelResponse, TripPayments, TripResponse } from '@/lib/api/types'
import { useCancelTrip, useCompleteTrip, useDepartTrip } from './queries'
import { TripPaymentsSummary } from './TripPaymentsSummary'

const odometer = z.string().trim().refine((s) => s === '' || /^\d+$/.test(s), 'number')

// ----- depart -----

export function DepartDialog({ trip, open, onOpenChange }: { trip: TripResponse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['trips', 'common'])
  const depart = useDepartTrip(trip.id!)
  const schema = z.object({ startOdometerKm: odometer })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { startOdometerKm: '' } })
  const onError = useMutationError(form)
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (v) => {
    try {
      await depart.mutateAsync({ startOdometerKm: parseNumber(v.startOdometerKm) })
      toast.success(t('common:common.saved'))
      onOpenChange(false)
    } catch (e) {
      onError(e)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('trips:departDialog.title')}</DialogTitle>
          <DialogDescription>{t('trips:departDialog.description')}</DialogDescription>
        </DialogHeader>
        {open && (
          <form onSubmit={submit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.startOdometerKm}>
                <FieldLabel htmlFor="dp-odo">{t('trips:fields.startOdometerKm')}</FieldLabel>
                <Input id="dp-odo" inputMode="numeric" aria-invalid={!!errors.startOdometerKm} {...form.register('startOdometerKm')} />
                <FieldErrorText error={errors.startOdometerKm} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {t('trips:actions.depart')}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ----- complete (handles 409 "parcels left in the car") -----

export function CompleteDialog({ trip, open, onOpenChange }: { trip: TripResponse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['trips', 'common'])
  const complete = useCompleteTrip(trip.id!)
  const move = useMoveParcelsToWarehouse()
  const [undelivered, setUndelivered] = useState<ParcelResponse[]>([])
  const [warehouseId, setWarehouseId] = useState<number | undefined>()
  // The 409 carries a fresher count than the trip loaded into this page.
  const [payments, setPayments] = useState<TripPayments | undefined>(trip.payments)
  const start = trip.startOdometerKm
  const schema = z.object({
    endOdometerKm: odometer.refine((s) => s === '' || start == null || Number(s) >= start, 'endOdometerLess'),
    notes: z.string().trim(),
  })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { endOdometerKm: '', notes: trip.notes ?? '' } })
  const onError = useMutationError(form)
  const { errors, isSubmitting } = form.formState

  const body = (v: z.infer<typeof schema>) => ({ endOdometerKm: parseNumber(v.endOdometerKm), notes: v.notes || undefined })

  const submit = form.handleSubmit(async (v) => {
    try {
      await complete.mutateAsync(body(v))
      toast.success(t('common:common.saved'))
      onOpenChange(false)
    } catch (e) {
      if (isApiError(e) && e.status === 409 && Array.isArray(e.extensions.undeliveredParcels)) {
        setUndelivered(e.extensions.undeliveredParcels as ParcelResponse[])
        if (e.extensions.payments) setPayments(e.extensions.payments as TripPayments)
        return
      }
      onError(e)
    }
  })

  const moveAndRetry = form.handleSubmit(async (v) => {
    if (!warehouseId) return
    try {
      await move.mutateAsync({ warehouseId, parcelIds: undelivered.map((p) => p.id!), comment: t('trips:completeDialog.title') })
      await complete.mutateAsync(body(v))
      toast.success(t('common:common.saved'))
      onOpenChange(false)
    } catch (e) {
      showApiError(e)
    }
  })

  const close = (o: boolean) => {
    if (!o) {
      setUndelivered([])
      setPayments(trip.payments)
    }
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('trips:completeDialog.title')}</DialogTitle>
        </DialogHeader>
        {open && (
          <form onSubmit={undelivered.length ? moveAndRetry : submit} noValidate>
            <FieldGroup>
              {!!(payments?.received?.length || payments?.notReceived?.length) && (
                <div className="rounded-md border p-3">
                  <TripPaymentsSummary payments={payments} />
                </div>
              )}
              <Field data-invalid={!!errors.endOdometerKm}>
                <FieldLabel htmlFor="cp-odo">{t('trips:fields.endOdometerKm')}</FieldLabel>
                <Input id="cp-odo" inputMode="numeric" aria-invalid={!!errors.endOdometerKm} {...form.register('endOdometerKm')} />
                <FieldErrorText error={errors.endOdometerKm} />
              </Field>
              <Field data-invalid={!!errors.notes}>
                <FieldLabel htmlFor="cp-notes">{t('trips:fields.notes')}</FieldLabel>
                <Textarea id="cp-notes" rows={2} {...form.register('notes')} />
                <FieldErrorText error={errors.notes} />
              </Field>

              {undelivered.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>{t('trips:completeDialog.undelivered')}</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 list-disc pl-4 font-mono text-xs">
                      {undelivered.map((p) => (
                        <li key={p.id}>
                          {p.barcode} {p.clientName && <span className="font-sans">· {p.clientName}</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <WarehouseSelect id="cp-warehouse" value={warehouseId} onChange={setWarehouseId} />
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => close(false)}>
                  {t('common:actions.cancel')}
                </Button>
                {undelivered.length > 0 ? (
                  <Button type="submit" disabled={!warehouseId || isSubmitting || move.isPending}>
                    {t('trips:completeDialog.moveAndRetry')}
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {t('trips:actions.complete')}
                  </Button>
                )}
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ----- cancel -----

export function CancelTripDialog({ trip, open, onOpenChange }: { trip: TripResponse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['trips', 'common'])
  const cancel = useCancelTrip(trip.id!)
  const [mode, setMode] = useState<'representative' | 'warehouse'>('representative')
  const [warehouseId, setWarehouseId] = useState<number | undefined>()
  const hasLoaded = trip.status === 'PREPARING' || trip.status === 'IN_PROGRESS'

  const confirm = async () => {
    try {
      await cancel.mutateAsync(mode === 'warehouse' ? warehouseId : undefined)
      toast.success(t('common:common.saved'))
      onOpenChange(false)
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('trips:cancelDialog.title')}</DialogTitle>
          {hasLoaded && <DialogDescription>{t('trips:cancelDialog.description')}</DialogDescription>}
        </DialogHeader>
        {hasLoaded && (
          <FieldGroup>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="flex flex-col gap-2">
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="representative" />
                {t('trips:cancelDialog.toRepresentative')}
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="warehouse" />
                {t('trips:cancelDialog.toWarehouse')}
              </Label>
            </RadioGroup>
            {mode === 'warehouse' && <WarehouseSelect id="cn-warehouse" value={warehouseId} onChange={setWarehouseId} />}
          </FieldGroup>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="destructive" disabled={cancel.isPending || (mode === 'warehouse' && !warehouseId)} onClick={confirm}>
            {t('trips:actions.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
