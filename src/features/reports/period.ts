import { cn } from '@/lib/utils'
import type { Period } from './api'

export type PeriodPreset = 'today' | 'week' | 'month' | 'lastMonth'
export const PERIOD_PRESETS: PeriodPreset[] = ['today', 'week', 'month', 'lastMonth']

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The days of a preset, counted from {@code now}; the week starts on Monday. */
export function presetPeriod(preset: PeriodPreset, now = new Date()): Period {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (preset) {
    case 'today':
      return { from: iso(today), to: iso(today) }
    case 'week': {
      const monday = new Date(today)
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      return { from: iso(monday), to: iso(today) }
    }
    case 'month':
      return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) }
    case 'lastMonth':
      return { from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: iso(new Date(today.getFullYear(), today.getMonth(), 0)) }
  }
}

/** Which preset the days are, if any. */
export function presetOf(period: Period, now = new Date()): PeriodPreset | undefined {
  return PERIOD_PRESETS.find((p) => {
    const q = presetPeriod(p, now)
    return q.from === period.from && q.to === period.to
  })
}

/** Days lying: amber after a week, red after two. */
export const daysClass = (days = 0, amber = 7, red = 14) =>
  cn('text-right tabular-nums', days > red ? 'font-semibold text-destructive' : days > amber && 'text-amber-700 dark:text-amber-400')
