import { useTranslation } from 'react-i18next'
import type { TripPaymentLine, TripPayments } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

/**
 * What the trip brought in, by currency and payment method, and what was handed over without payment.
 * The backend counts only parcels with our own price, and hides the whole block from representatives.
 */
export function TripPaymentsSummary({ payments }: { payments?: TripPayments }) {
  const { t } = useTranslation(['trips', 'common'])
  const received = payments?.received ?? []
  const notReceived = payments?.notReceived ?? []
  if (!received.length && !notReceived.length) return null

  const line = (l: TripPaymentLine, label: string, key: string) => (
    <div key={key} className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="whitespace-nowrap">
        <span className="font-medium">{formatMoney(l.amount, l.currency)}</span>
        <span className="text-muted-foreground"> · {t('trips:payments.parcels', { count: l.parcels ?? 0 })}</span>
      </span>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 text-sm">
      {received.length > 0 && (
        <div>
          <div className="mb-1 font-medium">{t('trips:payments.received')}</div>
          {received.map((l, i) =>
            line(l, l.method ? t(`common:paymentMethod.${l.method}`) : t('trips:payments.methodUnknown'), `r${i}`),
          )}
        </div>
      )}
      {notReceived.length > 0 && (
        <div>
          <div className="mb-1 font-medium text-amber-700">{t('trips:payments.notReceived')}</div>
          {notReceived.map((l, i) => line(l, t('trips:payments.delivered'), `n${i}`))}
        </div>
      )}
    </div>
  )
}
