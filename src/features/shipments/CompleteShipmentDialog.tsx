import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { parseNumber } from '@/features/parcels/status'
import { useMutationError } from '@/lib/api/problem'
import type { ActualShipmentResponse } from '@/lib/api/types'
import { useCompleteActual } from './queries'

export function CompleteShipmentDialog({
  shipment,
  open,
  onOpenChange,
}: {
  shipment: ActualShipmentResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('shipments')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('actual.completeTitle')}</DialogTitle>
        </DialogHeader>
        {open && <CompleteForm shipment={shipment} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CompleteForm({ shipment, onClose }: { shipment: ActualShipmentResponse; onClose: () => void }) {
  const { t } = useTranslation(['shipments', 'common'])
  const complete = useCompleteActual(shipment.id!)
  const start = shipment.startOdometerKm
  const schema = z.object({
    endOdometerKm: z
      .string()
      .trim()
      .refine((s) => s === '' || /^\d+$/.test(s), 'number')
      .refine((s) => s === '' || start == null || Number(s) >= start, 'endOdometerLess'),
    notes: z.string().trim(),
  })
  type FormValues = z.infer<typeof schema>

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { endOdometerKm: '', notes: shipment.notes ?? '' },
  })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await complete.mutateAsync({ endOdometerKm: parseNumber(v.endOdometerKm), notes: v.notes || undefined })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      onError(e)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.endOdometerKm}>
          <FieldLabel htmlFor="cp-odo">{t('shipments:fields.endOdometerKm')}</FieldLabel>
          <Input id="cp-odo" inputMode="numeric" aria-invalid={!!errors.endOdometerKm} {...form.register('endOdometerKm')} />
          <FieldErrorText error={errors.endOdometerKm} />
        </Field>
        <Field data-invalid={!!errors.notes}>
          <FieldLabel htmlFor="cp-notes">{t('shipments:fields.notes')}</FieldLabel>
          <Textarea id="cp-notes" rows={3} {...form.register('notes')} />
          <FieldErrorText error={errors.notes} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('shipments:actual.actions.complete')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
