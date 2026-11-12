import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { parseNumber } from '@/features/parcels/status'
import { showApiError } from '@/lib/api/problem'
import type { CashOnHand, Currency } from '@/lib/api/types'
import { formatMoney } from '@/lib/format'
import { useHandOver } from './api'

/** The manager takes cash a person holds: all of it by default, or a part. */
export function HandoverDialog({ onHand, onClose }: { onHand: CashOnHand; onClose: () => void }) {
  const { t } = useTranslation(['reports', 'common'])
  const handOver = useHandOver()
  const currency = onHand.currency as Currency
  const [amount, setAmount] = useState(String(onHand.onHand ?? ''))
  const [note, setNote] = useState('')
  const value = parseNumber(amount)
  const valid = value != null && value > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    try {
      await handOver.mutateAsync({ holderId: onHand.userId!, amount: value, currency, note: note.trim() || undefined })
      toast.success(t('reports:handover.done'))
      onClose()
    } catch (err) {
      showApiError(err)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reports:handover.title')}</DialogTitle>
          <DialogDescription>{t('reports:handover.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <p className="text-sm">
              <span className="text-muted-foreground">{t('reports:handover.from')}: </span>
              <span className="font-medium">{onHand.name}</span>
            </p>
            <Field data-invalid={!valid}>
              <FieldLabel htmlFor="ho-amount">
                {t('reports:handover.amount')}, {currency}
              </FieldLabel>
              <Input id="ho-amount" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-sm text-muted-foreground">
                {t('reports:handover.onHandNow', { amount: formatMoney(onHand.onHand, currency) })}
                {valid && ` · ${t('reports:handover.leftAfter', { amount: formatMoney(Math.round(((onHand.onHand ?? 0) - value) * 100) / 100, currency) })}`}
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="ho-note">{t('reports:handover.note')}</FieldLabel>
              <Input id="ho-note" placeholder={t('reports:handover.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={!valid || handOver.isPending}>
                {t('reports:handover.submit')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
