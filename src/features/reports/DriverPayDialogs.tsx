import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { parseNumber } from '@/features/parcels/status'
import { showApiError } from '@/lib/api/problem'
import type { Currency, DriverPayRateResponse, DriverSettlement } from '@/lib/api/types'
import { CURRENCY_SYMBOL, formatDate, formatMoney, MONEY_ORDER } from '@/lib/format'
import { useDeleteRate, usePayout, useSaveRate } from './api'
import { type Part, PARTS, rateSummary } from './driverPay'
import { iso } from './period'

function CurrencyRadios({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as Currency)} className="flex flex-wrap gap-x-4 gap-y-2">
      {MONEY_ORDER.map((c) => (
        <Label key={c} className="flex items-center gap-2 font-normal">
          <RadioGroupItem value={c} />
          {CURRENCY_SYMBOL[c]}
        </Label>
      ))}
    </RadioGroup>
  )
}

/**
 * The manager sets how a driver is paid from a day on: what is filled in adds up. Earlier trips keep the rate they had;
 * the rates so far are listed below, the latest first.
 */
export function RateDialog({ driver, onClose }: { driver: DriverSettlement; onClose: () => void }) {
  const { t } = useTranslation(['reports', 'common'])
  const save = useSaveRate()
  const remove = useDeleteRate()
  const current = driver.rate
  const [editing, setEditing] = useState<DriverPayRateResponse | undefined>(undefined)
  const base = editing ?? current
  const [validFrom, setValidFrom] = useState(() => iso(new Date()))
  const [currency, setCurrency] = useState<Currency>((base?.currency as Currency) ?? (driver.currency as Currency) ?? 'EUR')
  const [values, setValues] = useState<Record<Part, string>>(() => Object.fromEntries(PARTS.map((p) => [p, base?.[p] != null ? String(base[p]).replace('.', ',') : ''])) as Record<Part, string>)
  const [note, setNote] = useState(editing?.note ?? '')
  const parsed = Object.fromEntries(PARTS.map((p) => [p, parseNumber(values[p])])) as Record<Part, number | undefined>
  const valid = !!validFrom && PARTS.some((p) => (parsed[p] ?? 0) > 0) && (parsed.revenuePercent ?? 0) <= 100

  const edit = (r: DriverPayRateResponse) => {
    setEditing(r)
    setValidFrom(r.validFrom!)
    setCurrency(r.currency as Currency)
    setValues(Object.fromEntries(PARTS.map((p) => [p, r[p] != null ? String(r[p]).replace('.', ',') : ''])) as Record<Part, string>)
    setNote(r.note ?? '')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    try {
      await save.mutateAsync({
        userId: driver.userId!,
        id: editing?.id,
        body: { validFrom, currency, ...Object.fromEntries(PARTS.map((p) => [p, parsed[p]])), note: note.trim() || undefined },
      })
      toast.success(t('reports:drivers.rateSaved'))
      onClose()
    } catch (err) {
      showApiError(err)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(editing ? 'reports:drivers.editRate' : 'reports:drivers.newRate', { name: driver.name })}</DialogTitle>
          <DialogDescription>{t('reports:drivers.rateHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rate-from">{t('reports:drivers.validFrom')}</FieldLabel>
              <Input id="rate-from" type="date" className="w-44" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>{t('reports:drivers.currency')}</FieldLabel>
              <CurrencyRadios value={currency} onChange={setCurrency} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {PARTS.map((p) => (
                <Field key={p}>
                  <FieldLabel htmlFor={`rate-${p}`}>{t(`reports:drivers.field.${p}`)}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input id={`rate-${p}`} inputMode="decimal" value={values[p]} onChange={(e) => setValues({ ...values, [p]: e.target.value })} />
                    <span className="shrink-0 text-sm text-muted-foreground">{p === 'revenuePercent' ? '%' : CURRENCY_SYMBOL[currency]}</span>
                  </div>
                </Field>
              ))}
            </div>
            <Field>
              <FieldLabel htmlFor="rate-note">{t('reports:drivers.note')}</FieldLabel>
              <Input id="rate-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {!!driver.rates?.length && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{t('reports:drivers.history')}</p>
                {driver.rates.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <button type="button" className="flex-1 text-left hover:underline" onClick={() => edit(r)}>
                      <span className="font-medium">{t('reports:drivers.since', { date: formatDate(r.validFrom) })}</span>
                      <span className="block text-muted-foreground">{rateSummary(t, r)}</span>
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={t('common:actions.delete')}
                      disabled={remove.isPending}
                      onClick={async () => {
                        try {
                          await remove.mutateAsync({ userId: driver.userId!, id: r.id! })
                          onClose()
                        } catch (err) {
                          showApiError(err)
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={!valid || save.isPending}>
                {t('common:actions.save')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** The manager records money given to a driver; what is owed is offered. */
export function PayoutDialog({ driver, onClose }: { driver: DriverSettlement; onClose: () => void }) {
  const { t } = useTranslation(['reports', 'common'])
  const payout = usePayout()
  const owed = Math.max(0, driver.closing ?? 0)
  const [currency, setCurrency] = useState<Currency>(driver.currency as Currency)
  const [amount, setAmount] = useState(owed > 0 ? String(owed).replace('.', ',') : '')
  const [paidOn, setPaidOn] = useState(() => iso(new Date()))
  const [fromCash, setFromCash] = useState(false)
  const [note, setNote] = useState('')
  const value = parseNumber(amount)
  const valid = value != null && value > 0 && !!paidOn

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    try {
      await payout.mutateAsync({ userId: driver.userId!, body: { amount: value, currency, paidOn, fromCollectedCash: fromCash, note: note.trim() || undefined } })
      toast.success(t('reports:drivers.paidDone'))
      onClose()
    } catch (err) {
      showApiError(err)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reports:drivers.payTitle', { name: driver.name })}</DialogTitle>
          <DialogDescription>
            {(driver.closing ?? 0) >= 0
              ? t('reports:drivers.owedNow', { amount: formatMoney(driver.closing, driver.currency as Currency) })
              : t('reports:drivers.overpaidNow', { amount: formatMoney(-(driver.closing ?? 0), driver.currency as Currency) })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={!valid}>
              <FieldLabel htmlFor="pay-amount">{t('reports:drivers.amount')}</FieldLabel>
              <Input id="pay-amount" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>{t('reports:drivers.currency')}</FieldLabel>
              <CurrencyRadios value={currency} onChange={setCurrency} />
            </Field>
            <Field>
              <FieldLabel htmlFor="pay-on">{t('reports:drivers.paidOn')}</FieldLabel>
              <Input id="pay-on" type="date" className="w-44" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </Field>
            <Label className="flex items-start gap-2 font-normal">
              <Checkbox checked={fromCash} onCheckedChange={(c) => setFromCash(c === true)} />
              <span>
                {t('reports:drivers.fromCash')}
                <span className="block text-sm text-muted-foreground">{t('reports:drivers.fromCashHint')}</span>
              </span>
            </Label>
            <Field>
              <FieldLabel htmlFor="pay-note">{t('reports:drivers.note')}</FieldLabel>
              <Input id="pay-note" placeholder={t('reports:drivers.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={!valid || payout.isPending}>
                {t('reports:drivers.pay')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
