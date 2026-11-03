import { useTranslation } from 'react-i18next'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCurrentCompany } from '@/features/companies/queries'
import type { Currency, PaymentMethod } from '@/lib/api/types'
import { CURRENCY_SYMBOL, formatMoney, MONEY_ORDER, rateLine } from '@/lib/format'
import { convertRate, useRates } from './queries'

/** A foreign card does not pay in hryvnias; cash and a Ukrainian card take any currency. */
export function paidCurrencies(method?: PaymentMethod | ''): Currency[] {
  return method === 'FOREIGN_CARD' ? MONEY_ORDER.filter((c) => c !== 'UAH') : MONEY_ORDER
}

/** What the payment is in by default: a Ukrainian card — hryvnias; otherwise the price's currency (a foreign card — euros instead of hryvnias). */
export function defaultPaidCurrency(method: PaymentMethod | '' | undefined, price: Currency): Currency {
  if (method === 'UA_CARD') return 'UAH'
  if (method === 'FOREIGN_CARD' && price === 'UAH') return 'EUR'
  return price
}

const round = (v: number) => Math.round(v * 100) / 100

/**
 * The price in every currency and the currency the client pays in, with what it comes to at the company's rate now
 * («Курси валют» only; without the module nothing is shown and the payment stays in the price's currency).
 */
export function PaidCurrencyField({
  price,
  priceCurrency,
  method,
  value,
  onChange,
}: {
  price?: number
  priceCurrency: Currency
  method?: PaymentMethod | ''
  value: Currency
  onChange: (c: Currency) => void
}) {
  const { t } = useTranslation('currency')
  const multi = useCurrentCompany().data?.currencyEnabled === true
  const rates = useRates(multi).data
  if (!multi || price == null) return null
  const k = convertRate(rates, priceCurrency, value)
  return (
    <Field>
      <FieldLabel>{t('paidIn')}</FieldLabel>
      {/* each currency with what the price comes to in it: choosing the currency is choosing the sum */}
      <RadioGroup value={value} onValueChange={(c) => onChange(c as Currency)} className="flex flex-wrap gap-x-5 gap-y-2" aria-label={t('paidIn')}>
        {paidCurrencies(method).map((c) => {
          const r = convertRate(rates, priceCurrency, c)
          return (
            <Label key={c} className="flex items-center gap-2 font-normal tabular-nums">
              <RadioGroupItem value={c} disabled={r == null} />
              {r == null ? CURRENCY_SYMBOL[c] : formatMoney(round(price * r), c)}
            </Label>
          )
        })}
      </RadioGroup>
      {value !== priceCurrency && (
        <FieldDescription>{k == null ? t('noRateYet') : t('atRate', { rate: rateLine(priceCurrency, value, k) })}</FieldDescription>
      )}
    </Field>
  )
}

/** «1 552,79 грн за курсом 1 € = 51,76 грн» for a parcel paid in another currency; nothing otherwise. */
export function paidInLine(
  t: (k: string, o?: Record<string, unknown>) => string,
  p: { paidCurrency?: Currency; paidAmount?: number; paidRate?: number; deliveryPriceCurrency?: Currency },
): string | undefined {
  if (!p.paidCurrency || !p.deliveryPriceCurrency) return undefined
  return t('currency:paidLine', { amount: formatMoney(p.paidAmount, p.paidCurrency), rate: rateLine(p.deliveryPriceCurrency, p.paidCurrency, p.paidRate) })
}
