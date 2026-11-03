import { ArrowRight, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LinkButton } from '@/components/common/LinkButton'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CURRENCY_SYMBOL, formatDateTime } from '@/lib/format'
import { useRates } from './queries'

const short = (v?: number) => (v == null ? '—' : v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

/**
 * The company's rates at a glance in the header of every page («Курси валют» only): «€ 51,76 · $ 46,06 · zł 11,72»;
 * a click shows where each comes from and leads to the rates page.
 */
export function RatesChip() {
  const { t } = useTranslation('currency')
  const rates = useRates().data
  if (!rates?.length) return null
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-2 font-normal tabular-nums" aria-label={t('title')}>
            <Coins className="text-emerald-600" />
            {rates.map((r, i) => (
              <span key={r.currency} className={i > 0 ? 'hidden sm:inline' : undefined}>
                {CURRENCY_SYMBOL[r.currency!]} {short(r.rate)}
              </span>
            ))}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 p-3">
        <div className="flex flex-col gap-2 text-sm">
          <div className="font-medium">{t('chipTitle')}</div>
          {rates.map((r) => (
            <div key={r.currency} className="flex items-baseline justify-between gap-3">
              <span>
                1 {CURRENCY_SYMBOL[r.currency!]}
                <span className="ml-1 text-xs text-muted-foreground">{t(r.source === 'COMPANY' ? 'fromCompany' : 'fromBank')}</span>
              </span>
              <span className="font-semibold tabular-nums">{short(r.rate)} грн</span>
            </div>
          ))}
          <div className="text-xs text-muted-foreground">{t('chipSource', { source: rates[0].bankSourceLabel ?? '—', at: formatDateTime(rates[0].bankAt) })}</div>
          <LinkButton variant="outline" size="sm" to="/rates">
            {t('chipOpen')}
            <ArrowRight />
          </LinkButton>
        </div>
      </PopoverContent>
    </Popover>
  )
}
