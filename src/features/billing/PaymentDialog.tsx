import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { showApiError } from '@/lib/api/problem'
import type { BillingPaymentResponse } from '@/lib/api/types'
import { parseNumber } from '@/features/parcels/status'
import { CURRENCY_SYMBOL, type MoneyCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CompanySelect } from './CompanySelect'
import { formatEur, formatPeriod, isoDate } from './format'
import { useDeletePayment, useInvoices, usePaymentMethods, useSavePayment } from './queries'

const NO_INVOICE = '__none__'
const OTHER_CURRENCIES: MoneyCurrency[] = ['UAH', 'USD', 'PLN']

/**
 * A payment of a client, new or corrected: who, when, how much in euros, how, and the invoice it pays (or none — an
 * advance). Money that came in hryvnias keeps what actually arrived next to the euros credited.
 */
export function PaymentDialog({
  payment,
  companyId: fixedCompanyId,
  onOpenChange,
}: {
  /** Corrected; none — a new one. */
  payment?: BillingPaymentResponse
  /** The client of a new payment, when it is entered from the client's page. */
  companyId?: number
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation(['billing', 'common'])
  const methods = usePaymentMethods().data ?? []
  const save = useSavePayment()
  const remove = useDeletePayment()
  const [companyId, setCompanyId] = useState<number | undefined>(payment?.company?.id ?? fixedCompanyId)
  const [invoiceId, setInvoiceId] = useState<number | undefined>(payment?.invoiceId)
  const [paidOn, setPaidOn] = useState(() => payment?.paidOn ?? isoDate(new Date()))
  const [amount, setAmount] = useState(payment?.amountEur != null ? String(payment.amountEur).replace('.', ',') : '')
  const [methodId, setMethodId] = useState<number | undefined>(payment?.method?.id ?? methods.find((m) => m.active)?.id)
  const [received, setReceived] = useState(payment?.receivedAmount != null ? String(payment.receivedAmount).replace('.', ',') : '')
  const [currency, setCurrency] = useState<MoneyCurrency>((payment?.receivedCurrency as MoneyCurrency | undefined) ?? 'UAH')
  const [reference, setReference] = useState(payment?.reference ?? '')
  const [note, setNote] = useState(payment?.note ?? '')
  const [deleting, setDeleting] = useState(false)

  // the client's invoices still to pay, and the one this payment is already on even if it is paid now
  const invoices = useInvoices({ companyId, status: ['DRAFT', 'SENT', 'PAID'], size: 100 }).data?.content ?? []
  const choices = invoices.filter((i) => i.status !== 'PAID' || i.id === payment?.invoiceId)
  const invoice = choices.find((i) => i.id === invoiceId)
  const offered = methods.filter((m) => m.active || m.id === payment?.method?.id)
  // the first active method once the list has loaded
  const method = methodId ?? offered.find((m) => m.active)?.id
  const value = parseNumber(amount)
  const receivedValue = parseNumber(received)
  const ok = companyId != null && method != null && !!paidOn && value != null && value > 0

  const pickInvoice = (id: number | undefined) => {
    setInvoiceId(id)
    const picked = choices.find((i) => i.id === id)
    // what is left on it is what usually comes in
    if (picked && !amount) setAmount(String(picked.remainingEur ?? picked.amountEur ?? '').replace('.', ','))
  }

  const submit = async () => {
    if (!ok) return
    try {
      await save.mutateAsync({
        id: payment?.id,
        body: {
          companyId: companyId!,
          invoiceId,
          paidOn,
          amountEur: value!,
          methodId: method!,
          receivedAmount: receivedValue,
          receivedCurrency: receivedValue != null ? currency : undefined,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
        },
      })
      toast.success(t(payment ? 'billing:toasts.paymentSaved' : 'billing:toasts.paid'))
      onOpenChange(false)
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t(payment ? 'billing:payment.editTitle' : 'billing:payment.newTitle')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            {fixedCompanyId == null && (
              <Field>
                <FieldLabel htmlFor="payment-company">{t('billing:payment.client')}</FieldLabel>
                <CompanySelect
                  id="payment-company"
                  value={companyId}
                  onChange={(id) => {
                    setCompanyId(id)
                    setInvoiceId(undefined)
                  }}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="payment-invoice">{t('billing:payment.invoice')}</FieldLabel>
              <Select value={invoiceId != null ? String(invoiceId) : NO_INVOICE} onValueChange={(v) => pickInvoice(v && v !== NO_INVOICE ? Number(v) : undefined)}>
                <SelectTrigger id="payment-invoice" className="w-full" disabled={companyId == null}>
                  <SelectValue>{invoice ? invoiceLabel(invoice) : t('billing:payment.noInvoice')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INVOICE}>{t('billing:payment.noInvoice')}</SelectItem>
                  {choices.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {invoiceLabel(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{invoice ? t('billing:payment.invoiceHint') : t('billing:payment.noInvoiceHint')}</FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="payment-date">{t('billing:fields.paidOn')}</FieldLabel>
                <Input id="payment-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="payment-amount">{t('billing:payment.amount')}</FieldLabel>
                <Input id="payment-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>{t('billing:payment.method')}</FieldLabel>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('billing:payment.method')}>
                {offered.map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    size="sm"
                    role="radio"
                    aria-checked={m.id === method}
                    variant={m.id === method ? 'default' : 'outline'}
                    onClick={() => setMethodId(m.id)}
                  >
                    {m.name}
                  </Button>
                ))}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-received">{t('billing:payment.received')}</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="payment-received"
                  inputMode="decimal"
                  className="flex-1"
                  placeholder={t('billing:payment.receivedPlaceholder')}
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                />
                <div className="flex gap-1" role="radiogroup" aria-label={t('billing:payment.receivedCurrency')}>
                  {OTHER_CURRENCIES.map((c) => (
                    <Button
                      key={c}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={c === currency}
                      variant={c === currency ? 'secondary' : 'ghost'}
                      className={cn('h-9 min-w-10', c === currency && 'ring-1 ring-border')}
                      onClick={() => setCurrency(c)}
                    >
                      {CURRENCY_SYMBOL[c]}
                    </Button>
                  ))}
                </div>
              </div>
              <FieldDescription>{t('billing:payment.receivedHint')}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-reference">{t('billing:payment.reference')}</FieldLabel>
              <Input id="payment-reference" maxLength={100} placeholder={t('billing:payment.referencePlaceholder')} value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-note">{t('billing:fields.note')}</FieldLabel>
              <Textarea id="payment-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter className="flex-wrap gap-2">
            {payment && (
              <Button variant="ghost" className="text-destructive sm:mr-auto" onClick={() => setDeleting(true)}>
                <Trash2 />
                {t('billing:payment.delete')}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button disabled={!ok || save.isPending} onClick={submit}>
              {t(payment ? 'common:actions.save' : 'billing:payment.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {payment && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={t('billing:payment.delete')}
          description={t('billing:payment.deleteConfirm')}
          confirmLabel={t('billing:payment.delete')}
          destructive
          pending={remove.isPending}
          onConfirm={async () => {
            try {
              await remove.mutateAsync(payment.id!)
              toast.success(t('billing:toasts.paymentDeleted'))
              setDeleting(false)
              onOpenChange(false)
            } catch (e) {
              showApiError(e)
            }
          }}
        />
      )}
    </>
  )

  function invoiceLabel(i: { id?: number; period?: string; amountEur?: number; remainingEur?: number; status?: string }) {
    const left = i.status === 'PAID' ? t('billing:status.PAID') : t('billing:payment.left', { amount: formatEur(i.remainingEur) })
    return `№${i.id} · ${formatPeriod(i.period)} · ${formatEur(i.amountEur)} (${left})`
  }
}
