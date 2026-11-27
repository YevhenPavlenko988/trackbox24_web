import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/features/auth/access'
import { parseNumber } from '@/features/parcels/status'
import { showApiError } from '@/lib/api/problem'
import type { CompanyPriceResponse } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { formatEur } from './format'
import { useSetCompanyPrice } from './queries'

/** The tariff of one client: the general price of each item, and the one agreed with it where there is one. */
export function CompanyPricesCard({ companyId, prices }: { companyId: number; prices: CompanyPriceResponse[] }) {
  const { t } = useTranslation('billing')
  const { isAdmin } = useAccess()
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t('companyPrices.title')}</CardTitle>
        <CardDescription>{t(isAdmin ? 'companyPrices.hint' : 'companyPrices.readOnly')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-x-8 lg:grid-cols-2">
          {prices.map((p) => (
            <PriceRow key={p.code} companyId={companyId} price={p} editable={isAdmin} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function PriceRow({ companyId, price, editable }: { companyId: number; price: CompanyPriceResponse; editable: boolean }) {
  const { t } = useTranslation(['billing', 'common'])
  const save = useSetCompanyPrice(companyId)
  const [value, setValue] = useState(price.ownEur != null ? String(price.ownEur).replace('.', ',') : '')
  const amount = parseNumber(value)
  const own = price.ownEur != null
  const changed = value.trim() !== '' && amount != null && amount >= 0 && amount !== price.ownEur

  const persist = async (amountEur: number | null) => {
    try {
      await save.mutateAsync({ code: price.code!, amountEur })
      if (amountEur == null) setValue('')
      toast.success(t(amountEur == null ? 'billing:companyPrices.reset' : 'billing:toasts.priceSaved'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <li className="flex min-h-12 items-center gap-3 border-b py-1.5 last:border-b-0 lg:[&:nth-last-child(2)]:border-b-0" data-testid={`company-price-${price.code}`}>
      <span className="flex-1">
        {price.label}
        {own && (
          <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            {t('billing:companyPrices.own')}
          </Badge>
        )}
      </span>
      <span className={cn('text-sm tabular-nums text-muted-foreground', own && 'line-through')} title={t('billing:companyPrices.general')}>
        {formatEur(price.generalEur)}
      </span>
      {editable ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (changed) persist(amount!)
          }}
        >
          <div className="relative w-24">
            <Input
              aria-label={t('billing:companyPrices.ownFor', { item: price.label })}
              inputMode="decimal"
              className="h-8 pr-6 text-right tabular-nums"
              placeholder="—"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
          </div>
          <Button type="submit" size="sm" variant={changed ? 'default' : 'outline'} disabled={!changed || save.isPending}>
            {t('common:actions.save')}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className={own ? undefined : 'invisible'}
            aria-label={t('billing:companyPrices.toGeneral')}
            title={t('billing:companyPrices.toGeneral')}
            disabled={save.isPending}
            onClick={() => persist(null)}
          >
            <RotateCcw />
          </Button>
        </form>
      ) : (
        <span className="w-20 text-right font-medium tabular-nums">{formatEur(price.amountEur)}</span>
      )}
    </li>
  )
}
