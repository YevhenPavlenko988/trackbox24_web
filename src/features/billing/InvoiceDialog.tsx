import { Ban, Calculator, CheckCircle2, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { showApiError } from '@/lib/api/problem'
import type { InvoiceResponse } from '@/lib/api/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { formatEur, formatPeriod } from './format'
import { InvoiceLines } from './InvoiceLines'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { PayDialog } from './PayDialog'
import { useCancelInvoice, useRecalculateInvoice, useSendInvoice } from './queries'

/** One invoice: its lines, dates and the next step — send a draft, enter the payment, or cancel. */
export function InvoiceDialog({ invoice, onOpenChange }: { invoice: InvoiceResponse | null; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['billing', 'common'])
  const send = useSendInvoice()
  const cancel = useCancelInvoice()
  const recalculate = useRecalculateInvoice()
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  if (!invoice) return null
  const id = invoice.id!
  const open = invoice.status === 'DRAFT' || invoice.status === 'SENT'

  const run = async (action: () => Promise<InvoiceResponse>, message: (i: InvoiceResponse) => string) => {
    try {
      const updated = await action()
      toast.success(message(updated))
      onOpenChange(false)
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {t('billing:invoice.title', { id, period: formatPeriod(invoice.period) })}
              <InvoiceStatusBadge invoice={invoice} />
            </DialogTitle>
          </DialogHeader>
          <DetailsList
            items={[
              {
                label: t('billing:fields.company'),
                value: (
                  <Link to={`/companies/${invoice.company?.id}?tab=billing`} className="hover:underline" onClick={() => onOpenChange(false)}>
                    {invoice.company?.name}
                  </Link>
                ),
              },
              { label: t('billing:fields.amount'), value: <span className="font-semibold">{formatEur(invoice.amountEur)}</span> },
              ...(invoice.sentAt ? [{ label: t('billing:fields.sentAt'), value: formatDateTime(invoice.sentAt) }] : []),
              ...(invoice.dueOn ? [{ label: t('billing:fields.dueOn'), value: formatDate(invoice.dueOn) }] : []),
              ...(invoice.paidOn
                ? [
                    { label: t('billing:fields.paidOn'), value: formatDate(invoice.paidOn) },
                    { label: t('billing:fields.paidAmount'), value: formatEur(invoice.paidAmountEur) },
                  ]
                : []),
              ...(invoice.paymentNote ? [{ label: t('billing:fields.note'), value: invoice.paymentNote }] : []),
            ]}
          />
          <InvoiceLines lines={invoice.lines ?? []} total={invoice.amountEur} />
          {invoice.status === 'DRAFT' && <p className="text-sm text-muted-foreground">{t('billing:invoice.sendHint')}</p>}
          {open && (
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="ghost" className="text-destructive sm:mr-auto" onClick={() => setCancelling(true)}>
                <Ban />
                {t('billing:actions.cancel')}
              </Button>
              {invoice.status === 'DRAFT' && (
                <>
                  <Button variant="outline" disabled={recalculate.isPending} onClick={() => run(() => recalculate.mutateAsync(id), () => t('billing:toasts.recalculated'))}>
                    <Calculator />
                    {t('billing:actions.recalculate')}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={send.isPending}
                    onClick={() => run(() => send.mutateAsync(id), (i) => t('billing:toasts.sent', { date: formatDate(i.dueOn) }))}
                  >
                    <Send />
                    {t('billing:actions.send')}
                  </Button>
                </>
              )}
              <Button onClick={() => setPaying(true)}>
                <CheckCircle2 />
                {t('billing:actions.pay')}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {paying && (
<PayDialog invoice={invoice} open onOpenChange={setPaying} onPaid={() => onOpenChange(false)} />
      )}
      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title={t('billing:actions.cancel')}
        description={t('billing:invoice.cancelConfirm')}
        confirmLabel={t('billing:actions.cancel')}
        destructive
        pending={cancel.isPending}
        onConfirm={() => run(() => cancel.mutateAsync(id), () => t('billing:toasts.cancelled')).then(() => setCancelling(false))}
      />
    </>
  )
}
