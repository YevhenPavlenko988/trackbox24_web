import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ParcelResponse } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

/**
 * What is paid at the Nova Poshta branch on pickup: delivery (when the recipient pays), the unpaid delivery of the
 * original waybill after a redirect, and cash on delivery. `npAmountToPay` absent = not known yet (never show 0).
 */
export function NpPaymentCard({ parcel: p }: { parcel: ParcelResponse }) {
  const { t } = useTranslation('parcels')
  const payer = p.npPayerType
  const deliveryLabel = payer === 'Recipient' ? t('np.deliveryRecipient', { method: p.npPaymentMethod ? t(`np.method.${p.npPaymentMethod}`) : '' }).trim() : t('np.delivery')
  const deliveryValue =
    payer === 'Sender' ? t('np.paidBySender') : payer === 'ThirdPerson' ? t('np.paidByThirdPerson') : payer === 'Recipient' ? formatMoney(p.npDeliveryCost ?? 0) : '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('np.amountToPayTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-1.5 text-sm">
          <Row label={deliveryLabel} value={deliveryValue} />
          {p.npPreviousDeliveryCost != null && <Row label={t('np.previousDelivery')} value={formatMoney(p.npPreviousDeliveryCost)} />}
          <Row label={t('fields.npCodAmount')} value={formatMoney(p.npCodAmount ?? 0)} />
          <div className="mt-2 flex items-baseline justify-between border-t pt-2">
            <dt className="font-medium">{t('np.total')}</dt>
            <dd className="text-lg font-semibold">{p.npAmountToPay != null ? formatMoney(p.npAmountToPay) : t('np.unknown')}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}

/** Compact version for the parcels table: NP delivery cost, who pays it, and what is still due at the branch. */
export function NpPaymentSummary({ parcel: p }: { parcel: ParcelResponse }) {
  const { t } = useTranslation('parcels')
  if (!p.npTtn) return <span className="text-muted-foreground">—</span>
  const payer = p.npPayerType
  const who =
    payer === 'Sender'
      ? t('np.paidBySender')
      : payer === 'ThirdPerson'
        ? t('np.paidByThirdPerson')
        : payer === 'Recipient'
          ? `${t('np.recipientPays')}${p.npPaymentMethod ? `, ${t(`np.method.${p.npPaymentMethod}`)}` : ''}`
          : undefined
  const due = p.npAmountToPay
  return (
    <div className="flex flex-col">
      <span>{p.npDeliveryCost ? formatMoney(p.npDeliveryCost) : '—'}</span>
      {who && <span className={`text-xs ${payer === 'Recipient' ? 'text-amber-700' : 'text-emerald-700'}`}>{who}</span>}
      {(p.npCodAmount ?? 0) > 0 && (
        <span className="text-xs text-muted-foreground">
          {t('fields.npCodAmount')}: {formatMoney(p.npCodAmount)}
        </span>
      )}
      {due != null && due > 0 && (
        <span className="text-xs font-medium">
          {t('np.dueShort')}: {formatMoney(due)}
        </span>
      )}
    </div>
  )
}
