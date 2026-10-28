import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { InvoiceResponse, InvoiceStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const STYLES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  SENT: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
  PAID: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
}

/** Overdue wins over «Надіслано»: it is what the team has to act on. */
export function InvoiceStatusBadge({ invoice }: { invoice: Pick<InvoiceResponse, 'status' | 'overdue' | 'daysOverdue'> }) {
  const { t } = useTranslation('billing')
  if (!invoice.status) return null
  if (invoice.overdue) {
    return <Badge variant="destructive">{t('status.overdue', { days: invoice.daysOverdue })}</Badge>
  }
  return (
    <Badge variant="secondary" className={cn(STYLES[invoice.status])}>
      {t(`status.${invoice.status}`)}
    </Badge>
  )
}

/** Row tint of an overdue invoice in the tables. */
export const overdueRow = (i: InvoiceResponse) => (i.overdue ? 'bg-red-50 hover:bg-red-100/70 dark:bg-red-950/30 dark:hover:bg-red-950/50' : undefined)
