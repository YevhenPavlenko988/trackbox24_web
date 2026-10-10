import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ClientMoney } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

/**
 * What the client's parcels add up to, by currency: the backend splits our delivery price into paid,
 * owed (handed over without paying) and still to come. Cancelled parcels and parcels without a price are left out.
 * A representative never gets this field.
 */
export function ClientMoneyCard({ money }: { money?: ClientMoney[] }) {
  const { t } = useTranslation('clients')
  if (!money?.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('money.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {money.map((m) => (
          <div key={m.currency} className="flex flex-wrap gap-x-8 gap-y-3">
            <Figure label={t('money.total')} value={formatMoney(m.total, m.currency)} />
            <Figure label={t('money.paid')} value={formatMoney(m.paid, m.currency)} />
            <Figure label={t('money.debt')} value={formatMoney(m.debt, m.currency)} alarming={(m.debt ?? 0) > 0} />
            <Figure label={t('money.upcoming')} value={formatMoney(m.upcoming, m.currency)} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function Figure({ label, value, alarming }: { label: string; value: string; alarming?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={alarming ? 'text-lg font-semibold text-amber-700' : 'text-lg font-medium'}>{value}</span>
    </div>
  )
}
