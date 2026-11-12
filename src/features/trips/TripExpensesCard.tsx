import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { parseNumber } from '@/features/parcels/status'
import { tripKeys } from './queries'
import { api } from '@/lib/api/client'
import { showApiError, unwrap } from '@/lib/api/problem'
import type { Currency, ExpenseKind, ExpensePaidFrom, TripExpenseRequest, TripExpenseResponse, TripResponse } from '@/lib/api/types'
import { CURRENCY_SYMBOL, formatDateTime, formatMoney, fromDateTimeLocal, MONEY_ORDER, toDateTimeLocal } from '@/lib/format'

const KINDS: ExpenseKind[] = ['FUEL', 'TOLL', 'PARKING', 'REPAIR', 'FINE', 'OTHER']
const PAID_FROM: ExpensePaidFrom[] = ['COLLECTED_CASH', 'OWN', 'COMPANY']

const key = (tripId: number) => ['trips', tripId, 'expenses'] as const

function useExpenses(tripId: number) {
  return useQuery({
    queryKey: key(tripId),
    queryFn: () => unwrap(api.GET('/api/trips/{tripId}/expenses', { params: { path: { tripId } } })),
  })
}

/** «Витрати рейсу»: what the trip cost, with receipts; a manager adds and corrects, the driver adds from the app. */
export function TripExpensesCard({ trip, canEdit }: { trip: TripResponse; canEdit: boolean }) {
  const { t } = useTranslation(['trips', 'common'])
  const tripId = trip.id!
  const query = useExpenses(tripId)
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE('/api/trips/{tripId}/expenses/{id}', { params: { path: { tripId, id } } })),
    // the list and the trip's history, where the change is written
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['trips', tripId] }), queryClient.invalidateQueries({ queryKey: tripKeys.history(tripId) })]),
  })
  const [editing, setEditing] = useState<TripExpenseResponse | 'new' | null>(null)
  const [removing, setRemoving] = useState<TripExpenseResponse | null>(null)
  const rows = query.data ?? []
  const totals = MONEY_ORDER.map((c) => [c, rows.filter((e) => e.currency === c).reduce((n, e) => n + (e.amount ?? 0), 0)] as const).filter(([, v]) => v > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>
            {t('trips:expenses.title')} ({rows.length})
          </CardTitle>
          <CardDescription>
            {totals.length ? totals.map(([c, v]) => formatMoney(v, c)).join(' + ') : t('trips:expenses.hint')}
          </CardDescription>
        </div>
        {canEdit && trip.status !== 'CANCELLED' && (
          <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
            <Plus />
            {t('trips:expenses.add')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <p className="text-sm text-muted-foreground">{t('trips:expenses.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('trips:expenses.when')}</TableHead>
                <TableHead>{t('trips:expenses.what')}</TableHead>
                <TableHead>{t('trips:expenses.who')}</TableHead>
                <TableHead>{t('trips:expenses.paidFrom')}</TableHead>
                <TableHead className="text-right">{t('trips:expenses.amount')}</TableHead>
                <TableHead>{t('trips:expenses.receipt')}</TableHead>
                {canEdit && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(e.spentAt)}</TableCell>
                  <TableCell>
                    {e.kindLabel}
                    {e.note && <span className="block text-xs text-muted-foreground">{e.note}</span>}
                  </TableCell>
                  <TableCell>{e.spentByName ?? '—'}</TableCell>
                  <TableCell>{e.paidFromLabel}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatMoney(e.amount, e.currency as Currency)}</TableCell>
                  <TableCell>
                    {e.receiptUrl ? (
                      <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="inline-block">
                        <img src={e.receiptThumbUrl ?? e.receiptUrl} alt={t('trips:expenses.receipt')} className="h-10 w-10 rounded border object-cover" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right whitespace-nowrap">
                      {e.editable && (
                        <>
                          <Button variant="ghost" size="icon-sm" aria-label={t('common:actions.edit')} onClick={() => setEditing(e)}>
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label={t('common:actions.delete')} onClick={() => setRemoving(e)}>
                            <Trash2 />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editing && <ExpenseDialog trip={trip} expense={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={removing != null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('trips:expenses.deleteTitle')}
        description={removing ? `${removing.kindLabel}: ${formatMoney(removing.amount, removing.currency as Currency)}` : undefined}
        confirmLabel={t('common:actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(removing!.id!)
            setRemoving(null)
          } catch (e) {
            showApiError(e)
          }
        }}
      />
    </Card>
  )
}

function ExpenseDialog({ trip, expense, onClose }: { trip: TripResponse; expense?: TripExpenseResponse; onClose: () => void }) {
  const { t } = useTranslation(['trips', 'common'])
  const tripId = trip.id!
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<ExpenseKind>((expense?.kind as ExpenseKind) ?? 'FUEL')
  const [amount, setAmount] = useState(expense?.amount != null ? String(expense.amount) : '')
  const [currency, setCurrency] = useState<Currency>((expense?.currency as Currency) ?? 'EUR')
  const [paidFrom, setPaidFrom] = useState<ExpensePaidFrom>((expense?.paidFrom as ExpensePaidFrom) ?? 'COLLECTED_CASH')
  const [spentById, setSpentById] = useState<number | undefined>(expense?.spentById ?? trip.driverId)
  const [spentAt, setSpentAt] = useState(() => toDateTimeLocal(expense?.spentAt ?? new Date().toISOString()))
  const [note, setNote] = useState(expense?.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const value = parseNumber(amount)
  const valid = value != null && value > 0
  const drivers = [
    { id: trip.driverId, name: trip.driverName },
    { id: trip.coDriverId, name: trip.coDriverName },
  ].filter((d) => d.id != null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const body: TripExpenseRequest = { kind, amount: value, currency, paidFrom, spentById, spentAt: fromDateTimeLocal(spentAt), note: note.trim() || undefined }
    try {
      const saved = expense
        ? await unwrap(api.PUT('/api/trips/{tripId}/expenses/{id}', { params: { path: { tripId, id: expense.id! } }, body }))
        : await unwrap(api.POST('/api/trips/{tripId}/expenses', { params: { path: { tripId } }, body }))
      if (file) {
        const form = new FormData()
        form.append('file', file)
        try {
          await unwrap(
            api.POST('/api/trips/{tripId}/expenses/{id}/receipt', {
              params: { path: { tripId, id: saved.id! } },
              body: form as unknown as { file: string },
              bodySerializer: (b) => b as unknown as FormData,
            }),
          )
        } catch (err) {
          // the expense itself is saved; only its photo did not make it
          showApiError(err)
        }
      }
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['trips', tripId] }), queryClient.invalidateQueries({ queryKey: tripKeys.history(tripId) })])
      toast.success(t('common:common.saved'))
      onClose()
    } catch (err) {
      showApiError(err)
    } finally {
      setSaving(false)
    }
  }

  const radios = (id: string, values: readonly string[], current: string, set: (v: string) => void, label: (v: string) => string) => (
    <RadioGroup id={id} value={current} onValueChange={(v) => set(String(v))} className="flex flex-wrap gap-x-4 gap-y-2">
      {values.map((v) => (
        <Label key={v} className="flex items-center gap-2 font-normal">
          <RadioGroupItem value={v} />
          {label(v)}
        </Label>
      ))}
    </RadioGroup>
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(expense ? 'trips:expenses.editTitle' : 'trips:expenses.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel>{t('trips:expenses.what')}</FieldLabel>
              {radios('ex-kind', KINDS, kind, (v) => setKind(v as ExpenseKind), (v) => t(`trips:expenses.kind.${v}`))}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!valid && amount !== ''}>
                <FieldLabel htmlFor="ex-amount">{t('trips:expenses.amount')}</FieldLabel>
                <Input id="ex-amount" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ex-at">{t('trips:expenses.when')}</FieldLabel>
                <Input id="ex-at" type="datetime-local" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel>{t('trips:expenses.currency')}</FieldLabel>
              {radios('ex-currency', MONEY_ORDER, currency, (v) => setCurrency(v as Currency), (c) => CURRENCY_SYMBOL[c as Currency])}
            </Field>
            <Field>
              <FieldLabel>{t('trips:expenses.paidFrom')}</FieldLabel>
              {radios('ex-paid', PAID_FROM, paidFrom, (v) => setPaidFrom(v as ExpensePaidFrom), (v) => t(`trips:expenses.from.${v}`))}
            </Field>
            {drivers.length > 1 && (
              <Field>
                <FieldLabel>{t('trips:expenses.who')}</FieldLabel>
                {radios('ex-who', drivers.map((d) => String(d.id)), String(spentById), (v) => setSpentById(Number(v)), (v) => drivers.find((d) => String(d.id) === v)?.name ?? v)}
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="ex-note">{t('trips:expenses.note')}</FieldLabel>
              <Input id="ex-note" placeholder={t('trips:expenses.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ex-receipt">
                <Receipt className="size-4" />
                {t(expense?.receiptUrl ? 'trips:expenses.replaceReceipt' : 'trips:expenses.addReceipt')}
              </FieldLabel>
              <Input id="ex-receipt" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={!valid || saving}>
                {t('common:actions.save')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
