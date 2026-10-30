import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAccess } from '@/features/auth/access'
import { useFinishSeatCheck, useSeatCheck } from '@/features/parcels/queries'
import { WarehouseSelect } from '@/features/warehouses/WarehouseSelect'
import { showApiError } from '@/lib/api/problem'
import type { ParcelResponse, SeatCheckStage } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const STAGES: SeatCheckStage[] = ['LOAD', 'WAREHOUSE', 'DELIVER']

/**
 * «Чого бракує» after scanning the items in any order: how many of all are where they should be, the missing ones
 * with what they are and where they are now, and «Закінчили сканування», which writes the result into the history.
 */
export function SeatCheckDialog({ parcel, onOpenChange }: { parcel: ParcelResponse; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['moves', 'parcels', 'common'])
  const { canEdit } = useAccess()
  const [stage, setStage] = useState<SeatCheckStage>(guessStage(parcel))
  const [warehouseId, setWarehouseId] = useState<number>()
  const [comment, setComment] = useState('')
  const check = useSeatCheck(parcel.id!, stage, stage === 'WAREHOUSE' ? warehouseId : undefined)
  const finish = useFinishSeatCheck(parcel.id!)
  const r = check.data
  const missing = r?.missing ?? []
  const needsComment = stage === 'DELIVER' && missing.length > 0

  const submit = async () => {
    try {
      await finish.mutateAsync({ stage, warehouseId: stage === 'WAREHOUSE' ? warehouseId : undefined, comment: comment.trim() || undefined })
      toast.success(t('moves:check.finished'))
      onOpenChange(false)
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('moves:check.title')}</DialogTitle>
          <DialogDescription>{t('moves:check.hint')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="check-stage">{t('moves:check.stage')}</FieldLabel>
            <Select value={stage} onValueChange={(v) => setStage(v as SeatCheckStage)}>
              <SelectTrigger id="check-stage" className="w-full">
                <SelectValue>{t(`moves:check.${stage}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`moves:check.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {stage === 'WAREHOUSE' && (
            <Field>
              <FieldLabel htmlFor="check-warehouse">{t('parcels:fields.warehouse')}</FieldLabel>
              <WarehouseSelect id="check-warehouse" className="w-full" value={warehouseId} onChange={setWarehouseId} noneLabel={t('moves:check.anyWarehouse')} />
            </Field>
          )}
        </div>

        {check.isPending || !r ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-baseline justify-between">
                <span className={cn('text-2xl font-semibold tabular-nums', missing.length ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300')}>
                  {t('moves:check.progress', { done: r.done, total: r.total })}
                </span>
                {missing.length === 0 && <span className="text-sm text-emerald-700 dark:text-emerald-300">{t('moves:check.allHere')}</span>}
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', missing.length ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${r.total ? (100 * (r.done ?? 0)) / r.total : 0}%` }}
                />
              </div>
            </div>
            {missing.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">{t('moves:check.missing', { count: missing.length })}</p>
                <ul className="max-h-56 overflow-y-auto rounded-md border text-sm">
                  {missing.map((s) => (
                    <li key={s.seatNumber} className="flex items-baseline justify-between gap-3 border-b px-3 py-1.5 last:border-b-0">
                      <span>
                        <span className="font-semibold tabular-nums">№{s.seatNumber}</span> {s.description ?? <span className="text-muted-foreground">—</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t('moves:check.where', { status: [t(`common:parcelStatus.${s.status}`), s.warehouseName].filter(Boolean).join(', ') })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canEdit && (
              <Field>
                <FieldLabel htmlFor="check-comment">{needsComment ? t('moves:check.commentRequired') : t('moves:check.comment')}</FieldLabel>
                <Textarea id="check-comment" rows={2} maxLength={1000} placeholder={t('moves:check.commentPlaceholder')} value={comment} onChange={(e) => setComment(e.target.value)} />
              </Field>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          {canEdit && (
            <Button disabled={!r || finish.isPending || (needsComment && !comment.trim())} onClick={submit}>
              {t('moves:check.finish')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The likely step from where the move is now: in a car — handing over, otherwise loading. */
function guessStage(p: ParcelResponse): SeatCheckStage {
  if (p.seats?.some((s) => s.status === 'IN_CAR' || s.status === 'DELIVERED_TO_CLIENT')) return 'DELIVER'
  return 'LOAD'
}
