import { format, parseISO } from 'date-fns'
import { uk } from 'date-fns/locale'
import { formatMoney } from '@/lib/format'

/** `2026-10-01` → «жовтень 2026». */
export function formatPeriod(iso?: string): string {
  return iso ? format(parseISO(iso), 'LLLL yyyy', { locale: uk }) : '—'
}

export const formatEur = (value?: number) => formatMoney(value, 'EUR')

/** Local date as `yyyy-MM-dd`, the way the backend takes a LocalDate. */
export const isoDate = (d: Date) => format(d, 'yyyy-MM-dd')
