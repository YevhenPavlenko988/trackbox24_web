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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useMutationError } from '@/lib/api/problem'
import { PAYMENT_METHODS } from '@/features/parcels/paymentMethod'
import type { ParcelResponse } from '@/lib/api/types'
import { formatMoney, fromDateTimeLocal } from '@/lib/format'
import { useSetParcelPayment } from './queries'

const schema = z.object({
  paidAt: z.string().refine((s) => s === '' || new Date(s).getTime() <= Date.now(), 'notFuture'),
  // Asked for every payment: the trip's takings are summed by method, and an unspecified one is reported apart.
  method: z.enum(PAYMENT_METHODS),
})

type FormValues = z.infer<typeof schema>

export function MarkPaidDialog({ parcel, open, onOpenChange }: { parcel: ParcelResponse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['parcels', 'common'])
  const setPayment = useSetParcelPayment(parcel.id!)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { paidAt: '', method: 'CASH' } })
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await setPayment.mutateAsync({ status: 'PAID', paidAt: fromDateTimeLocal(v.paidAt), method: v.method })
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
          <DialogTitle>
            {t('parcels:payment.markPaid')} — {formatMoney(parcel.deliveryPrice, parcel.deliveryPriceCurrency)}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <form onSubmit={submit} noValidate>
            <FieldGroup>
              <Controller
                control={form.control}
                name="method"
                render={({ field }) => (
                  <Field data-invalid={!!errors.method}>
                    <FieldLabel>{t('parcels:payment.method')}</FieldLabel>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-4">
                      {PAYMENT_METHODS.map((value) => (
                        <Label key={value} className="flex items-center gap-2 font-normal">
                          <RadioGroupItem value={value} />
                          {t(`common:paymentMethod.${value}`)}
                        </Label>
                      ))}
                    </RadioGroup>
                    <FieldErrorText error={errors.method} />
                  </Field>
                )}
              />
              <Field data-invalid={!!errors.paidAt}>
                <FieldLabel htmlFor="pay-at">{t('parcels:payment.paidAt')}</FieldLabel>
                <Input id="pay-at" type="datetime-local" aria-invalid={!!errors.paidAt} {...form.register('paidAt')} />
                <FieldDescription>{t('parcels:payment.paidAtHint')}</FieldDescription>
                <FieldErrorText error={errors.paidAt} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {t('parcels:payment.markPaid')}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
