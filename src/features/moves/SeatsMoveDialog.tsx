import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { useMoveSeats } from '@/features/parcels/queries'
import { TripSelect } from '@/features/trips/TripSelect'
import { WarehouseSelect } from '@/features/warehouses/WarehouseSelect'
import { showApiError } from '@/lib/api/problem'
import type { ParcelResponse } from '@/lib/api/types'

export type SeatsMoveTarget = 'WAREHOUSE' | 'DELIVER' | 'LOAD'

/**
 * Chosen items moved without scanning (a torn label): into a trip's car, onto a warehouse or handed over. A hand-over
 * that leaves items behind needs a reason, as at the end of a scan.
 */
export function SeatsMoveDialog({
  parcel,
  seatNumbers,
  target,
  plannedTripId,
  onClose,
  onMoved,
}: {
  parcel: ParcelResponse
  seatNumbers: number[]
  target: SeatsMoveTarget
  /** LOAD: the trip the move is planned on, preselected */
  plannedTripId?: number
  onClose: () => void
  onMoved: () => void
}) {
  const { t } = useTranslation(['moves', 'common'])
  const move = useMoveSeats(parcel.id!)
  const [warehouseId, setWarehouseId] = useState<number | undefined>()
  const [tripId, setTripId] = useState<number | undefined>(plannedTripId)
  const [comment, setComment] = useState('')
  const chosen = new Set(seatNumbers)
  const left = target === 'DELIVER' ? (parcel.seats ?? []).filter((s) => s.status !== 'DELIVERED_TO_CLIENT' && !chosen.has(s.seatNumber!)).length : 0
  const needsComment = left > 0 && comment.trim() === ''
  const ready = (target === 'DELIVER' || (target === 'WAREHOUSE' ? warehouseId != null : tripId != null)) && !needsComment

  const submit = async () => {
    try {
      await move.mutateAsync({
        seatNumbers,
        target,
        warehouseId: target === 'WAREHOUSE' ? warehouseId : undefined,
        tripId: target === 'LOAD' ? tripId : undefined,
        comment: comment.trim() || undefined,
      })
      toast.success(t('moves:manual.done', { count: seatNumbers.length }))
      onMoved()
      onClose()
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`moves:manual.title${target}`)}</DialogTitle>
          <DialogDescription>{t('moves:manual.hint', { count: seatNumbers.length })}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {target === 'LOAD' && (
            <Field>
              <FieldLabel htmlFor="seats-trip">{t('moves:manual.trip')}</FieldLabel>
              <TripSelect id="seats-trip" value={tripId} onChange={setTripId} />
            </Field>
          )}
          {target === 'WAREHOUSE' && (
            <Field>
              <FieldLabel htmlFor="seats-warehouse">{t('moves:manual.warehouse')}</FieldLabel>
              <WarehouseSelect id="seats-warehouse" value={warehouseId} onChange={setWarehouseId} />
            </Field>
          )}
          <Field data-invalid={needsComment || undefined}>
            <FieldLabel htmlFor="seats-comment">{t('moves:manual.comment')}</FieldLabel>
            <Textarea id="seats-comment" rows={2} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} aria-invalid={needsComment || undefined} />
            {left > 0 && <p className="text-sm text-destructive">{t('moves:manual.commentRequired', { count: left })}</p>}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            <Button disabled={!ready || move.isPending} onClick={submit}>
              {t('moves:manual.submit')}
            </Button>
          </div>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}
