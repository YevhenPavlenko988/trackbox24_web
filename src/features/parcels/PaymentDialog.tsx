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
import { defaultPaidCurrency, PaidCurrencyField } from '@/features/currency/PaidCurrency'
import type { Currency, ParcelResponse, PaymentMethod } from '@/lib/api/types'
import { useCurrentCompany } from '@/features/companies/queries'
import { useRedeemInfo } from '@/features/referral/queries'
import { formatMoney, fromDateTimeLocal } from '@/lib/format'
import { useSetParcelPayment } from './queries'

const schema = z.object({
  paidAt: z.string().refine((s) => s === '' || new Date(s).getTime() <= Date.now(), 'notFuture'),
  // Asked for every payment: the trip's takings are summed by method, and an unspecified one is reported apart.
  method: z.enum(PAYMENT_METHODS),
  currency: z.string(),
  points: z.string(),
})

type FormValues = z.infer<typeof schema>

export function MarkPaidDialog({ parcel, open, onOpenChange }: { parcel: ParcelResponse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['parcels', 'common'])
  const setPayment = useSetParcelPayment(parcel.id!)
  const priceCurrency = (parcel.deliveryPriceCurrency ?? 'UAH') as Currency
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paidAt: '', method: 'CASH', currency: defaultPaidCurrency('CASH', priceCurrency), points: '' },
  })
  // «Реферальна програма»: the points of the parcel's client (our client) come off «до сплати»
  const referral = useCurrentCompany().data?.referralEnabled === true && parcel.kind !== 'MOVE' && parcel.clientId != null
  const redeem = useRedeemInfo(parcel.id!, referral && open).data
  const points = Math.min(Math.max(0, Math.floor(Number(form.watch('points') || 0))), redeem?.maxPoints ?? 0)
  const pointsValue = Math.round(points * (redeem?.pointValue ?? 0) * 100) / 100
  const due = parcel.dueAmount ?? parcel.deliveryPrice
  const toPay = due == null ? undefined : Math.max(0, Math.round((due - pointsValue) * 100) / 100)
  const { errors, isSubmitting } = form.formState
  const onError = useMutationError(form)

  const submit = form.handleSubmit(async (v) => {
    try {
      await setPayment.mutateAsync({
        status: 'PAID',
        paidAt: fromDateTimeLocal(v.paidAt),
        method: v.method,
        currency: v.currency !== priceCurrency ? (v.currency as Currency) : undefined,
        pointsToRedeem: referral && points > 0 ? points : undefined,
      })
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
            {t('parcels:payment.markPaid')} — {formatMoney(due, parcel.deliveryPriceCurrency)}
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
                    <RadioGroup
                      value={field.value}
                      onValueChange={(m) => {
                        field.onChange(m)
                        // the method decides the usual currency: a Ukrainian card pays in hryvnias, a foreign one not
                        form.setValue('currency', defaultPaidCurrency(m as PaymentMethod, priceCurrency))
                      }}
                      className="flex flex-wrap gap-4"
                    >
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
              {referral && redeem && (
                <Field>
                  <FieldLabel htmlFor="pay-points">{t('parcels:payment.points')}</FieldLabel>
                  {redeem.maxPoints ? (
                    <>
                      <Input id="pay-points" inputMode="numeric" className="w-32" placeholder="0" {...form.register('points')} />
                      <FieldDescription>
                        {t('parcels:payment.pointsHint', {
                          balance: redeem.balance,
                          max: redeem.maxPoints,
                          value: formatMoney(redeem.pointValue, redeem.currency),
                        })}
                        {points > 0 && toPay != null && <> · −{formatMoney(pointsValue, priceCurrency)} → {formatMoney(toPay, priceCurrency)}</>}
                      </FieldDescription>
                    </>
                  ) : (
                    <FieldDescription>{t('parcels:payment.pointsNone', { reason: redeem.reason })}</FieldDescription>
                  )}
                </Field>
              )}
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <PaidCurrencyField
                    price={toPay}
                    priceCurrency={priceCurrency}
                    method={form.watch('method')}
                    value={field.value as Currency}
                    onChange={field.onChange}
                  />
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
