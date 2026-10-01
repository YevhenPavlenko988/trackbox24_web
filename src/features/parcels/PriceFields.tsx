import { Controller, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Currency } from '@/lib/api/types'

export const CURRENCIES: Currency[] = ['UAH', 'EUR']

type PriceValues = { deliveryPrice: string; deliveryPriceCurrency: Currency }

/** "Our" delivery price + currency; only managers may send these (others get 403). */
export function PriceFields<T extends FieldValues & PriceValues>({ form, idPrefix = '' }: { form: UseFormReturn<T>; idPrefix?: string }) {
  const { t } = useTranslation('parcels')
  const errors = form.formState.errors as Partial<Record<keyof PriceValues, { message?: string }>>
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field data-invalid={!!errors.deliveryPrice}>
        <FieldLabel htmlFor={`${idPrefix}deliveryPrice`}>{t('payment.price')}</FieldLabel>
        <Input id={`${idPrefix}deliveryPrice`} inputMode="decimal" aria-invalid={!!errors.deliveryPrice} {...form.register('deliveryPrice' as Path<T>)} />
        <FieldErrorText error={errors.deliveryPrice} />
      </Field>
      <Controller
        control={form.control}
        name={'deliveryPriceCurrency' as Path<T>}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={`${idPrefix}currency`}>{t('payment.currency')}</FieldLabel>
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger id={`${idPrefix}currency`} className="w-full">
                <SelectValue>{field.value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
    </div>
  )
}
