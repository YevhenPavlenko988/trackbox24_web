import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ParcelResponse } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

/** Nova Poshta says the delivery is already paid (online, before pickup). */
export const isNpDeliveryPaid = (p: ParcelResponse) => p.npPaymentStatus === 'Payed'

/**
 * What is paid at the Nova Poshta branch on pickup. The parts come from the backend and always add up to
 * `npAmountToPay`, so nothing is recomputed here. Absent `npAmountToPay` = not known yet (never show 0).
 */
export function NpPaymentCard({ parcel: p }: { parcel: ParcelResponse }) {
  const { t } = useTranslation('parcels')
  const payer = p.npPayerType
  const deliveryLabel =
    payer === 'Recipient' ? t('np.deliveryRecipient', { method: p.npPaymentMethod ? t(`np.method.${p.npPaymentMethod}`) : '' }).trim() : t('np.delivery')
  // A zero says nothing on its own: the reason belongs next to it.
  const deliveryNote = isNpDeliveryPaid(p)
    ? t('np.paidOnline')
    : payer === 'Sender'
      ? t('np.paidBySender')
      : payer === 'ThirdPerson'
        ? t('np.paidByThirdPerson')
        : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('np.amountToPayTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-1.5 text-sm">
          <Row label={deliveryLabel} value={p.npDeliveryToPay != null ? formatMoney(p.npDeliveryToPay) : '—'} note={deliveryNote} />
          {p.npPreviousDeliveryToPay != null && <Row label={t('np.previousDelivery')} value={formatMoney(p.npPreviousDeliveryToPay)} />}
          <Row label={t('fields.npCodAmount')} value={formatMoney(p.npCodToPay ?? 0)} />
          <div className="mt-2 flex items-baseline justify-between border-t pt-2">
            <dt className="font-medium">{t('np.total')}</dt>
            <dd className="text-lg font-semibold">{p.npAmountToPay != null ? formatMoney(p.npAmountToPay) : t('np.unknown')}</dd>
          </div>
          {p.npState === 'RECEIVED' && <p className="text-xs text-muted-foreground">{t('np.settled')}</p>}
        </dl>
      </CardContent>
    </Card>
  )
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">
        {label}
        {note && <span className="ml-1 text-xs">· {note}</span>}
      </dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}

/** Compact version for the parcels table: NP delivery cost, who pays it, and what is still due at the branch. */
export function NpPaymentSummary({ parcel: p }: { parcel: ParcelResponse }) {
  const { t } = useTranslation('parcels')
  if (!p.npTtn) return <span className="text-muted-foreground">—</span>
  const payer = p.npPayerType
  const who = isNpDeliveryPaid(p)
    ? t('np.paidOnline')
    : payer === 'Sender'
      ? t('np.paidBySender')
      : payer === 'ThirdPerson'
        ? t('np.paidByThirdPerson')
        : payer === 'Recipient'
          ? `${t('np.recipientPays')}${p.npPaymentMethod ? `, ${t(`np.method.${p.npPaymentMethod}`)}` : ''}`
          : undefined
  const due = p.npAmountToPay
  const unpaid = !isNpDeliveryPaid(p) && payer === 'Recipient'
  return (
    <div className="flex flex-col">
      <span>{p.npDeliveryCost ? formatMoney(p.npDeliveryCost) : '—'}</span>
      {who && <span className={`text-xs ${unpaid ? 'text-amber-700' : 'text-emerald-700'}`}>{who}</span>}
      {(p.npCodToPay ?? 0) > 0 && (
        <span className="text-xs text-muted-foreground">
          {t('fields.npCodAmount')}: {formatMoney(p.npCodToPay)}
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
