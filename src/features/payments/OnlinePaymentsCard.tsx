import { BellRing, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showApiError } from '@/lib/api/problem'
import type { OnlinePaymentResponse, ParcelResponse } from '@/lib/api/types'
import { formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDecideOnlinePayment, useOnlinePayments } from './queries'

const TONE: Partial<Record<NonNullable<OnlinePaymentResponse['status']>, string>> = {
  SUCCESS: 'border-transparent bg-emerald-100 text-emerald-900',
  CONFIRMED: 'border-transparent bg-emerald-100 text-emerald-900',
  CLAIMED: 'border-transparent bg-amber-100 text-amber-900',
  FAILURE: 'text-red-700',
  REJECTED: 'text-red-700',
  REVERSED: 'text-red-700',
  EXPIRED: 'text-muted-foreground',
}

/**
 * What the client did on the tracking page to pay: invoices at the carrier's provider and «Я оплатив» for requisites.
 * A claimed transfer waits for the manager here — the money came or it did not. Hidden while there is nothing.
 */
export function OnlinePaymentsCard({ parcel, canDecide }: { parcel: ParcelResponse; canDecide: boolean }) {
  const { t } = useTranslation('parcels')
  const query = useOnlinePayments(parcel.id!)
  const decide = useDecideOnlinePayment(parcel.id!)
  const payments = query.data ?? []
  if (payments.length === 0) return null
  const claimed = payments.find((p) => p.status === 'CLAIMED')
  const move = parcel.kind === 'MOVE'

  const answer = async (id: number, confirm: boolean) => {
    try {
      await decide.mutateAsync({ id, confirm })
      toast.success(t(confirm ? 'online.confirmed' : 'online.rejected'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Card className={cn(claimed && 'border-amber-300 dark:border-amber-800')}>
      <CardHeader>
        <CardTitle>{t('online.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {claimed && (
          <div className="flex flex-col gap-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
            <p className="flex items-start gap-2 font-medium">
              <BellRing className="mt-0.5 size-4 shrink-0 text-amber-700" />
              {t('online.claimed')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(move ? 'online.claimedMoveHint' : 'online.claimedHint', { amount: formatMoney(claimed.amount, claimed.currency) })}
            </p>
            {canDecide && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={decide.isPending} onClick={() => answer(claimed.id!, true)}>
                  <Check />
                  {t('online.confirm')}
                </Button>
                <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => answer(claimed.id!, false)}>
                  <X />
                  {t('online.reject')}
                </Button>
              </div>
            )}
          </div>
        )}
        <ul className="divide-y text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="w-32 shrink-0 text-muted-foreground tabular-nums">{formatDateTime(p.paidAt ?? p.createdAt)}</span>
              <span className="min-w-0 flex-1">
                {t(`online.provider.${p.provider}`)} · <span className="font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                {p.decidedBy && <span className="text-muted-foreground"> · {p.decidedBy}</span>}
                {p.note && <span className="block text-xs text-amber-700">{p.note}</span>}
              </span>
              <Badge variant="outline" className={cn(TONE[p.status!])}>
                {t(`online.status.${p.status}`)}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
