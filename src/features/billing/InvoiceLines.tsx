import { useTranslation } from 'react-i18next'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { InvoiceLineResponse } from '@/lib/api/types'
import { formatEur, formatPeriod } from './format'

/**
 * Rows of an invoice or of the month's forecast: item, days billed of the month, monthly price, amount. Corrections of
 * the month before (options changed mid-month) come greyed, with the difference in days and money.
 */
export function InvoiceLines({ lines, total }: { lines: InvoiceLineResponse[]; total?: number }) {
  const { t } = useTranslation('billing')
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('fields.item')}</TableHead>
          <TableHead>{t('fields.days')}</TableHead>
          <TableHead className="text-right">{t('fields.monthlyPrice')}</TableHead>
          <TableHead className="text-right">{t('fields.amount')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((l, i) => (
          <TableRow key={i} className={l.adjustmentFor ? 'text-muted-foreground' : undefined}>
            <TableCell className="whitespace-normal">{l.adjustmentFor ? t('lines.adjustment', { item: l.label, period: formatPeriod(l.adjustmentFor) }) : l.label}</TableCell>
            <TableCell className="text-muted-foreground">
              {l.adjustmentFor
                ? t('lines.adjustmentDays', { sign: (l.days ?? 0) > 0 ? '+' : '', days: l.days })
                : t('lines.days', { days: l.days, total: l.daysInMonth })}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatEur(l.monthlyPriceEur)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatEur(l.amountEur)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      {total != null && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>{t('fields.total')}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatEur(total)}</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}
