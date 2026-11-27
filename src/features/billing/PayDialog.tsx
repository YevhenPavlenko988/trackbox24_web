import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { parseNumber } from '@/features/parcels/status'
import { showApiError } from '@/lib/api/problem'
import type { InvoiceResponse } from '@/lib/api/types'
import { formatEur, isoDate } from './format'
import { usePaymentMethods, usePayInvoice } from './queries'

/** A payment of the invoice received outside the system: when, how much (what is left unless said otherwise), how. */
export function PayDialog({
  invoice,
  open,
  onOpenChange,
  onPaid,
}: {
  invoice: InvoiceResponse
  open: boolean
  onOpenChange: (o: boolean) => void
  onPaid?: () => void
}) {
  const { t } = useTranslation(['billing', 'common'])
  const pay = usePayInvoice()
  const [paidOn, setPaidOn] = useState(() => isoDate(new Date()))
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [reference, setReference] = useState('')
  const methods = (usePaymentMethods().data ?? []).filter((m) => m.active)
  const [methodId, setMethodId] = useState<number>()
  const method = methodId ?? methods[0]?.id
  const left = invoice.remainingEur ?? invoice.amountEur

  const submit = async () => {
    try {
      await pay.mutateAsync({ id: invoice.id!, body: { paidOn, amountEur: parseNumber(amount), methodId: method, reference: reference.trim() || undefined, note: note.trim() || undefined } })
      toast.success(t('billing:toasts.paid'))
      onOpenChange(false)
      onPaid?.()
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('billing:pay.title', { id: invoice.id })}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="paid-on">{t('billing:fields.paidOn')}</FieldLabel>
            <Input id="paid-on" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="paid-amount">{t('billing:fields.paidAmount')}, €</FieldLabel>
            <Input id="paid-amount" inputMode="decimal" placeholder={String(left ?? '').replace('.', ',')} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <FieldDescription>
              {left !== invoice.amountEur
                ? t('billing:pay.amountLeftHint', { amount: formatEur(invoice.amountEur), left: formatEur(left) })
                : t('billing:pay.amountHint', { amount: formatEur(invoice.amountEur) })}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{t('billing:payment.method')}</FieldLabel>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('billing:payment.method')}>
              {methods.map((m) => (
                <Button key={m.id} type="button" size="sm" role="radio" aria-checked={m.id === method} variant={m.id === method ? 'default' : 'outline'} onClick={() => setMethodId(m.id)}>
                  {m.name}
                </Button>
              ))}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="paid-reference">{t('billing:payment.reference')}</FieldLabel>
            <Input id="paid-reference" maxLength={100} placeholder={t('billing:payment.referencePlaceholder')} value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="paid-note">{t('billing:fields.note')}</FieldLabel>
            <Textarea id="paid-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button disabled={pay.isPending || !paidOn} onClick={submit}>
            {t('billing:actions.pay')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
