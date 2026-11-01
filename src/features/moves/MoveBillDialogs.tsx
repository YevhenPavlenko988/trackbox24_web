import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldErrorText } from '@/components/common/FieldErrorText'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { loaderCities, sameCity } from '@/features/loaders/cities'
import { LoaderDialog } from '@/features/loaders/LoaderDialog'
import { useLoaders } from '@/features/loaders/queries'
import { PAYMENT_METHODS } from '@/features/parcels/paymentMethod'
import { parseNumber } from '@/features/parcels/status'
import { WarehouseSelect } from '@/features/warehouses/WarehouseSelect'
import { showApiError } from '@/lib/api/problem'
import type { MoveBillWork, MoveWorkKind, PaymentMethod } from '@/lib/api/types'
import { formatPhone, fromDateTimeLocal, toDateTimeLocal } from '@/lib/format'
import { useAddPayment, useAddStorage, useAddWork, useUpdateWork } from './billApi'

/** The ticked loaders first, then the others; a search keeps the ticked ones and filters the rest by name or phone. */
function pickList<T extends { id?: number; fullName?: string; phone?: string }>(all: T[], ticked: number[], search: string): T[] {
  const q = search.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  const matches = (l: T) => !q || (l.fullName ?? '').toLowerCase().includes(q) || (digits.length > 0 && (l.phone ?? '').includes(digits))
  return [...all.filter((l) => ticked.includes(l.id!)), ...all.filter((l) => !ticked.includes(l.id!) && matches(l))]
}

const amount = z
  .string()
  .trim()
  .refine((s) => s === '' || (parseNumber(s) ?? -1) >= 0, 'number')
const required = amount.refine((s) => s !== '', 'required')
const num = (s: string) => (s === '' ? undefined : parseNumber(s))

const workSchema = z.object({
  kind: z.enum(['LOAD', 'UNLOAD']),
  plannedAt: z.string(),
  plannedHours: amount,
  clientRate: amount,
  loaderRate: amount,
  notes: z.string().trim(),
  loaderIds: z.array(z.number()),
})

/** Loading or unloading: when, planned hours, the two rates, who. A new loader is added to the directory and ticked. */
export function WorkDialog({ parcelId, work, onClose }: { parcelId: number; work?: MoveBillWork; onClose: () => void }) {
  const { t } = useTranslation(['moves', 'common'])
  const add = useAddWork(parcelId)
  const update = useUpdateWork(parcelId)
  const loaders = useLoaders().data?.content ?? []
  const [addingLoader, setAddingLoader] = useState(false)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const cities = loaderCities(loaders)
  const form = useForm<z.infer<typeof workSchema>>({
    resolver: zodResolver(workSchema),
    defaultValues: {
      kind: work?.kind ?? 'LOAD',
      plannedAt: toDateTimeLocal(work?.plannedAt),
      plannedHours: work?.plannedHours?.toString() ?? '',
      clientRate: work?.clientRate?.toString() ?? '',
      loaderRate: work?.loaderRate?.toString() ?? '',
      notes: work?.notes ?? '',
      loaderIds: (work?.loaders ?? []).map((l) => l.loaderId!),
    },
  })
  const { errors, isSubmitting } = form.formState
  const submit = form.handleSubmit(async (v) => {
    const body = {
      kind: v.kind as MoveWorkKind,
      plannedAt: fromDateTimeLocal(v.plannedAt),
      plannedHours: num(v.plannedHours),
      clientRate: num(v.clientRate),
      loaderRate: num(v.loaderRate),
      notes: v.notes || undefined,
      loaderIds: v.loaderIds,
    }
    try {
      if (work) await update.mutateAsync({ workId: work.id!, body })
      else await add.mutateAsync(body)
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      showApiError(e)
    }
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{work ? t('moves:bill.editWork') : t('moves:bill.addWork')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                  {(['LOAD', 'UNLOAD'] as const).map((k) => (
                    <Label key={k} className="flex items-center gap-2 font-normal">
                      <RadioGroupItem value={k} />
                      {t(`moves:bill.kind.${k}`)}
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="wk-at">{t('moves:bill.plannedAt')}</FieldLabel>
                <Input id="wk-at" type="datetime-local" {...form.register('plannedAt')} />
              </Field>
              <Field data-invalid={!!errors.plannedHours}>
                <FieldLabel htmlFor="wk-hours">{t('moves:bill.plannedHours')}</FieldLabel>
                <Input id="wk-hours" inputMode="decimal" {...form.register('plannedHours')} />
                <FieldErrorText error={errors.plannedHours} />
              </Field>
              <Field data-invalid={!!errors.clientRate}>
                <FieldLabel htmlFor="wk-client">{t('moves:bill.clientRate')}</FieldLabel>
                <Input id="wk-client" inputMode="decimal" {...form.register('clientRate')} />
                <FieldErrorText error={errors.clientRate} />
              </Field>
              <Field data-invalid={!!errors.loaderRate}>
                <FieldLabel htmlFor="wk-loader">{t('moves:bill.loaderRate')}</FieldLabel>
                <Input id="wk-loader" inputMode="decimal" {...form.register('loaderRate')} />
                <FieldErrorText error={errors.loaderRate} />
              </Field>
            </div>
            <Controller
              control={form.control}
              name="loaderIds"
              render={({ field }) => (
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>{t('moves:bill.loaders')}</FieldLabel>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAddingLoader(true)}>
                      <UserPlus />
                      {t('moves:loaders.new')}
                    </Button>
                  </div>
                  {/* a long directory: find by name or phone; the ticked ones stay on top */}
                  <div className="flex flex-wrap gap-2">
                    <Input className="min-w-40 flex-1" placeholder={t('moves:loaders.search')} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t('moves:loaders.search')} />
                    {cities.length > 0 && (
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        aria-label={t('moves:loaders.city')}
                      >
                        <option value="">{t('moves:loaders.allCities')}</option>
                        {cities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-lg border">
                    {loaders.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t('moves:loaders.empty')}</p>}
                    {pickList(loaders.filter((l) => field.value.includes(l.id!) || sameCity(l, city)), field.value, search).map((l) => (
                      <Label key={l.id} className="flex items-center gap-3 border-b px-3 py-2 font-normal last:border-b-0">
                        <Checkbox
                          checked={field.value.includes(l.id!)}
                          onCheckedChange={(c) => field.onChange(c ? [...field.value, l.id!] : field.value.filter((x) => x !== l.id))}
                        />
                        <span className="flex-1">
                          {l.fullName}
                          {l.city && <span className="text-muted-foreground"> · {l.city}</span>}
                        </span>
                        {l.phone && <span className="text-sm text-muted-foreground">{formatPhone(l.phone)}</span>}
                      </Label>
                    ))}
                  </div>
                  <LoaderDialog open={addingLoader} onOpenChange={setAddingLoader} onCreated={(l) => field.onChange([...field.value, l.id!])} />
                </Field>
              )}
            />
            <Field>
              <FieldLabel htmlFor="wk-notes">{t('moves:bill.notes')}</FieldLabel>
              <Textarea id="wk-notes" rows={2} {...form.register('notes')} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t('common:actions.save')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const storageSchema = z.object({ warehouseId: z.number().optional(), days: required, rate: required, notes: z.string().trim() })

export function StorageDialog({ parcelId, onClose }: { parcelId: number; onClose: () => void }) {
  const { t } = useTranslation(['moves', 'common'])
  const add = useAddStorage(parcelId)
  const form = useForm<z.infer<typeof storageSchema>>({ resolver: zodResolver(storageSchema), defaultValues: { days: '', rate: '', notes: '' } })
  const { errors, isSubmitting } = form.formState
  const submit = form.handleSubmit(async (v) => {
    try {
      await add.mutateAsync({ warehouseId: v.warehouseId, days: num(v.days)!, rate: num(v.rate)!, notes: v.notes || undefined })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      showApiError(e)
    }
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('moves:bill.addStorage')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="st-wh">{t('moves:bill.warehouse')}</FieldLabel>
                  <WarehouseSelect id="st-wh" value={field.value} onChange={field.onChange} noneLabel={t('moves:bill.anyWarehouse')} />
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.days}>
                <FieldLabel htmlFor="st-days">{t('moves:bill.days')}</FieldLabel>
                <Input id="st-days" inputMode="decimal" {...form.register('days')} />
                <FieldErrorText error={errors.days} />
              </Field>
              <Field data-invalid={!!errors.rate}>
                <FieldLabel htmlFor="st-rate">{t('moves:bill.dayRate')}</FieldLabel>
                <Input id="st-rate" inputMode="decimal" {...form.register('rate')} />
                <FieldErrorText error={errors.rate} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="st-notes">{t('moves:bill.notes')}</FieldLabel>
              <Input id="st-notes" {...form.register('notes')} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t('common:actions.save')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const paymentSchema = z.object({ amount: required, method: z.string(), paidOn: z.string(), note: z.string().trim() })

/** The client's money: a prepayment or the rest. */
export function ClientPaymentDialog({ parcelId, onClose }: { parcelId: number; onClose: () => void }) {
  const { t } = useTranslation(['moves', 'common'])
  const add = useAddPayment(parcelId)
  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '', method: 'CASH', paidOn: new Date().toISOString().slice(0, 10), note: '' },
  })
  const { errors, isSubmitting } = form.formState
  const submit = form.handleSubmit(async (v) => {
    try {
      await add.mutateAsync({ amount: num(v.amount)!, method: (v.method || undefined) as PaymentMethod | undefined, paidOn: v.paidOn || undefined, note: v.note || undefined })
      toast.success(t('common:common.saved'))
      onClose()
    } catch (e) {
      showApiError(e)
    }
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('moves:bill.addPayment')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="pm-amount">{t('moves:bill.amount')}</FieldLabel>
                <Input id="pm-amount" inputMode="decimal" autoFocus {...form.register('amount')} />
                <FieldErrorText error={errors.amount} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pm-date">{t('moves:bill.paidOn')}</FieldLabel>
                <Input id="pm-date" type="date" {...form.register('paidOn')} />
              </Field>
            </div>
            <Controller
              control={form.control}
              name="method"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-4">
                  {PAYMENT_METHODS.map((m) => (
                    <Label key={m} className="flex items-center gap-2 font-normal">
                      <RadioGroupItem value={m} />
                      {t(`common:paymentMethod.${m}`)}
                    </Label>
                  ))}
                </RadioGroup>
              )}
            />
            <Field>
              <FieldLabel htmlFor="pm-note">{t('moves:bill.note')}</FieldLabel>
              <Input id="pm-note" placeholder={t('moves:bill.prepayment')} {...form.register('note')} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t('common:actions.save')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
