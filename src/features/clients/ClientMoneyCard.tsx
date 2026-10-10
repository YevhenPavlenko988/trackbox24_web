import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ClientMoney } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

type Figure = 'paid' | 'debt' | 'upcoming'

/**
 * Two different questions, so two blocks: what the client has brought in since the beginning, and what is
 * outstanding right now. Mixing them in one row reads as a single total, which it is not.
 *
 * A representative never gets this field. Cancelled parcels and parcels without our price are not counted.
 */
export function ClientMoneyCard({ money }: { money?: ClientMoney[] }) {
  const { t } = useTranslation('clients')
  if (!money?.length) return null

  // Only the currencies that actually have something; a row of zeroes in every currency says nothing.
  const amounts = (key: Figure) => money.filter((m) => (m[key] ?? 0) > 0).map((m) => formatMoney(m[key], m.currency))
  const earned = amounts('paid')
  const debt = amounts('debt')
  const upcoming = amounts('upcoming')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('money.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Figure label={t('money.earned')} hint={t('money.earnedHint')} amounts={earned} />
        <Separator />
        <div className="flex flex-wrap gap-x-12 gap-y-4">
          <Figure label={t('money.debt')} hint={t('money.debtHint')} amounts={debt} alarming={debt.length > 0} />
          <Figure label={t('money.upcoming')} hint={t('money.upcomingHint')} amounts={upcoming} />
        </div>
      </CardContent>
    </Card>
  )
}

function Figure({ label, hint, amounts, alarming }: { label: string; hint: string; amounts: string[]; alarming?: boolean }) {
  const { t } = useTranslation('clients')
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={alarming ? 'text-xl font-semibold text-amber-700' : 'text-xl font-medium'}>
        {amounts.length ? amounts.join(' · ') : t('money.none')}
      </span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}
