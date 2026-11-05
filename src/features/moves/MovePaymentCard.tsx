import { Banknote } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoGroup } from '@/components/common/InfoGroup'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccess } from '@/features/auth/access'
import type { ParcelResponse } from '@/lib/api/types'
import { formatDate, formatMoney, rateLine } from '@/lib/format'
import { useMoveBill } from './billApi'
import { ClientPaymentDialog } from './MoveBillDialogs'

/**
 * «Оплата» of a move: the summary of its bill — total, paid, due, every payment of the client with who took it.
 * The client pays for the whole move (transport, loaders, storage), so the payment is entered in one place, the bill.
 */
export function MovePaymentCard({ parcel }: { parcel: ParcelResponse }) {
  const { t } = useTranslation(['moves', 'parcels'])
  const { canEditMoves: canEdit } = useAccess()
  const query = useMoveBill(parcel.id!)
  const [paying, setPaying] = useState(false)

  if (query.isPending) return <Skeleton className="h-32 w-full" />
  const bill = query.data
  if (!bill) return null
  const money = (v?: number) => formatMoney(v, bill.currency)
  const total = bill.total ?? 0
  const paid = bill.paid ?? 0
  const status = total > 0 && (bill.due ?? 0) <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID'
  const payments = bill.payments ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle>{t('parcels:payment.title')}</CardTitle>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setPaying(true)}>
            <Banknote />
            {t('moves:bill.addPayment')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <InfoGroup
          rows={[
            {
              label: t('parcels:payment.status'),
              value: (
                <Badge
                  variant="outline"
                  className={status === 'PAID' ? 'border-transparent bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300' : status === 'PARTIAL' ? 'text-sky-700 dark:text-sky-300' : 'text-amber-700 dark:text-amber-300'}
                >
                  {t(`moves:bill.status.${status}`)}
                </Badge>
              ),
            },
            { label: t('moves:bill.total'), value: money(bill.total) },
            { label: t('moves:bill.paidTotal'), value: money(bill.paid) },
            { label: t('moves:bill.due'), value: <span className="text-base font-bold">{money(bill.due)}</span> },
          ]}
        />
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('moves:bill.payments')}</h3>
          {payments.length === 0 && <p className="text-sm text-muted-foreground">{t('moves:bill.noPayments')}</p>}
          {payments.map((p, i) => (
            <div key={p.id ?? `own-${i}`} className="flex items-start justify-between gap-3 border-b py-1.5 text-sm last:border-b-0">
              <span className="min-w-0">
                <span>
                  {formatDate(p.paidOn)} · {p.methodLabel ?? '—'}
                  {p.note && <> · {p.note}</>}
                </span>
                {/* who took the money */}
                {p.by && <span className="block text-xs text-muted-foreground">{t('moves:bill.takenBy', { name: p.by })}</span>}
              </span>
              <span className="font-medium whitespace-nowrap tabular-nums">
                {/* paid in another currency: what the client gave → what it counts in the move's currency */}
                {p.paidCurrency && (
                  <span className="mr-1 text-xs font-normal text-muted-foreground">
                    {t('moves:bill.paidAtRate', { paid: formatMoney(p.paidAmount, p.paidCurrency), rate: rateLine(p.paidCurrency, bill.currency!, p.paidRate) })} →
                  </span>
                )}
                {money(p.amount)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      {paying && <ClientPaymentDialog parcelId={parcel.id!} billCurrency={bill.currency} onClose={() => setPaying(false)} />}
    </Card>
  )
}
