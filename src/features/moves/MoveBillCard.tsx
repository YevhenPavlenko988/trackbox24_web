import { Banknote, FileText, Pencil, Plus, Trash2, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { LinkButton } from '@/components/common/LinkButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAccess } from '@/features/auth/access'
import { parseNumber } from '@/features/parcels/status'
import { showApiError } from '@/lib/api/problem'
import type { MoveBillResponse, MoveBillWork, MoveBillWorkLoader, ParcelResponse } from '@/lib/api/types'
import { formatDate, formatDateTime, formatMoney, formatPhone } from '@/lib/format'
import { useDeletePayment, useDeleteStorage, useDeleteWork, useMoveBill, useSetBillCurrency, useSetFact } from './billApi'
import { ClientPaymentDialog, StorageDialog, WorkDialog } from './MoveBillDialogs'

/**
 * A move's money on its card: loading and unloading with loaders at two rates (planned, then actual hours and paying
 * the loaders), storage, the client's payments, the totals and the bill to print.
 */
export function MoveBillCard({ parcel }: { parcel: ParcelResponse }) {
  const { t } = useTranslation(['moves', 'common'])
  const { canEditMoves: canEdit } = useAccess()
  const id = parcel.id!
  const setCurrency = useSetBillCurrency(id)
  const query = useMoveBill(id)
  const deleteWork = useDeleteWork(id)
  const deleteStorage = useDeleteStorage(id)
  const deletePayment = useDeletePayment(id)
  const [work, setWork] = useState<MoveBillWork | 'new' | null>(null)
  const [storing, setStoring] = useState(false)
  const [paying, setPaying] = useState(false)

  if (query.isPending) return <Skeleton className="h-40 w-full lg:col-span-2" />
  const bill = query.data
  if (!bill) return null
  const money = (v?: number) => formatMoney(v, bill.currency)
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      toast.success(t('common:common.saved'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>{t('moves:bill.title')}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              {/* the currency of the whole move: transport, rates, storage and payments */}
              <div className="flex rounded-md border p-0.5" role="group" aria-label={t('moves:bill.currency')}>
                {(['EUR', 'UAH'] as const).map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={bill.currency === c ? 'default' : 'ghost'}
                    className="h-7 px-3"
                    onClick={() => bill.currency !== c && run(() => setCurrency.mutateAsync(c))}
                  >
                    {c === 'EUR' ? '€' : 'грн'}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setWork('new')}>
                <Plus />
                {t('moves:bill.addWork')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStoring(true)}>
                <Warehouse />
                {t('moves:bill.addStorage')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPaying(true)}>
                <Banknote />
                {t('moves:bill.addPayment')}
              </Button>
            </>
          )}
          <LinkButton variant="outline" size="sm" to={`/moves/${id}/invoice`}>
            <FileText />
            {t('moves:bill.invoice')}
          </LinkButton>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Totals bill={bill} money={money} />

        {(bill.works ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('moves:bill.noWorks')}</p>}
        {(bill.works ?? []).map((w) => (
          <div key={w.id} className="rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold">{w.kindLabel}</span>
                {w.plannedAt && <span className="text-sm text-muted-foreground">{formatDateTime(w.plannedAt)}</span>}
                {w.plannedHours != null && <span className="text-sm text-muted-foreground">{t('moves:bill.plan', { hours: w.plannedHours })}</span>}
                <span className="text-sm text-muted-foreground">{t('moves:bill.rates', { client: money(w.clientRate), loader: money(w.loaderRate) })}</span>
                {w.notes && <span className="text-sm">{w.notes}</span>}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label={t('moves:bill.editWork')} onClick={() => setWork(w)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={t('common:actions.delete')} onClick={() => run(() => deleteWork.mutateAsync(w.id!))}>
                    <Trash2 />
                  </Button>
                </div>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('moves:bill.loaders')}</TableHead>
                  <TableHead className="w-28">{t('moves:bill.hours')}</TableHead>
                  <TableHead className="w-24">{t('moves:bill.paid')}</TableHead>
                  <TableHead className="text-right">{t('moves:bill.toClient')}</TableHead>
                  <TableHead className="text-right">{t('moves:bill.toLoader')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(w.loaders ?? []).map((l) => (
                  <LoaderRow key={l.loaderId} parcelId={id} work={w} loader={l} editable={canEdit} money={money} />
                ))}
                <TableRow className="font-medium">
                  <TableCell colSpan={3} />
                  <TableCell className="text-right tabular-nums">{money(w.clientAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(w.loaderAmount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ))}

        {(bill.storages ?? []).length > 0 && (
          <div>
            <h3 className="mb-1 font-semibold">{t('moves:bill.storage')}</h3>
            {(bill.storages ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm last:border-b-0">
                <span>
                  {s.warehouseName ?? t('moves:bill.noWarehouse')} · {t('moves:bill.daysTimes', { days: s.days, rate: money(s.rate) })}
                  {s.notes && <span className="text-muted-foreground"> · {s.notes}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{money(s.amount)}</span>
                  {canEdit && (
                    <Button variant="ghost" size="icon-sm" aria-label={t('common:actions.delete')} onClick={() => run(() => deleteStorage.mutateAsync(s.id!))}>
                      <Trash2 />
                    </Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        <div>
          <h3 className="mb-1 font-semibold">{t('moves:bill.payments')}</h3>
          {(bill.payments ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t('moves:bill.noPayments')}</p>}
          {(bill.payments ?? []).map((p, i) => (
            <div key={p.id ?? `own-${i}`} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm last:border-b-0">
              <span>
                {formatDate(p.paidOn)} · {p.methodLabel ?? '—'}
                {p.note && <span> · {p.note}</span>}
                {p.by && <span className="text-muted-foreground"> · {p.by}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{money(p.amount)}</span>
                {canEdit && p.id != null && (
                  <Button variant="ghost" size="icon-sm" aria-label={t('common:actions.delete')} onClick={() => run(() => deletePayment.mutateAsync(p.id!))}>
                    <Trash2 />
                  </Button>
                )}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      {work && <WorkDialog parcelId={id} work={work === 'new' ? undefined : work} onClose={() => setWork(null)} />}
      {storing && <StorageDialog parcelId={id} onClose={() => setStoring(false)} />}
      {paying && <ClientPaymentDialog parcelId={id} onClose={() => setPaying(false)} />}
    </Card>
  )
}

function Totals({ bill, money }: { bill: MoveBillResponse; money: (v?: number) => string }) {
  const { t } = useTranslation('moves')
  const items = [
    [t('bill.transport'), bill.transport],
    [t('bill.loadersTotal'), bill.loadersTotal],
    [t('bill.storageTotal'), bill.storageTotal],
    [t('bill.total'), bill.total],
    [t('bill.paidTotal'), bill.paid],
    [t('bill.due'), bill.due],
  ] as const
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(([label, value], i) => (
          <div key={label} className={i >= 3 ? 'rounded-lg bg-muted px-3 py-2' : 'rounded-lg border px-3 py-2'}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={i === 5 ? 'text-lg font-bold tabular-nums' : 'font-semibold tabular-nums'}>{money(value)}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{t('bill.payout', { owed: money(bill.loaderPayout), paid: money(bill.loaderPaid) })}</p>
    </div>
  )
}

/** A loader on a work: the actual hours saved on leaving the field, «paid» saved at once. */
function LoaderRow({
  parcelId,
  work,
  loader,
  editable,
  money,
}: {
  parcelId: number
  work: MoveBillWork
  loader: MoveBillWorkLoader
  editable: boolean
  money: (v?: number) => string
}) {
  const { t } = useTranslation('moves')
  const setFact = useSetFact(parcelId)
  const [hours, setHours] = useState(loader.actualHours?.toString() ?? '')
  const save = async (actualHours: string, paid: boolean) => {
    const value = actualHours.trim() === '' ? undefined : parseNumber(actualHours)
    try {
      await setFact.mutateAsync({ workId: work.id!, loaderId: loader.loaderId!, body: { actualHours: value, paid } })
    } catch (e) {
      showApiError(e)
    }
  }
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span>{loader.name}</span>
          {loader.phone && <span className="text-xs text-muted-foreground">{formatPhone(loader.phone)}</span>}
        </div>
      </TableCell>
      <TableCell>
        {editable ? (
          <Input
            className="h-8 w-20"
            inputMode="decimal"
            placeholder={work.plannedHours?.toString() ?? ''}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onBlur={() => hours !== (loader.actualHours?.toString() ?? '') && save(hours, !!loader.paid)}
            aria-label={t('bill.hours')}
          />
        ) : (
          (loader.actualHours ?? '—')
        )}
      </TableCell>
      <TableCell>
        <Checkbox checked={!!loader.paid} disabled={!editable} onCheckedChange={(c) => save(hours, c === true)} aria-label={t('bill.paid')} />
      </TableCell>
      <TableCell className="text-right tabular-nums">{money(loader.clientAmount)}</TableCell>
      <TableCell className="text-right tabular-nums">{money(loader.loaderAmount)}</TableCell>
    </TableRow>
  )
}
