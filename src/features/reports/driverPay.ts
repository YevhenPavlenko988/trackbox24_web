import type { Currency, DriverPayRateResponse } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'

export const PARTS = ['perTrip', 'perKm', 'revenuePercent', 'perDay', 'monthly'] as const
export type Part = (typeof PARTS)[number]

/** «50 € за рейс · 10 % виручки · 20 € за день»: the parts a rate has. */
export function rateSummary(t: (k: string, o?: Record<string, unknown>) => string, rate?: DriverPayRateResponse): string {
  if (!rate) return t('reports:drivers.noRate')
  const c = rate.currency as Currency
  return PARTS.filter((p) => rate[p] != null)
    .map((p) => t(`reports:drivers.part.${p}`, { amount: p === 'revenuePercent' ? `${rate[p]!.toLocaleString('uk-UA')} %` : formatMoney(rate[p], c), value: rate[p] }))
    .join(' · ')
}
