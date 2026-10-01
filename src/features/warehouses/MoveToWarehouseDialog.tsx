import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { showApiError } from '@/lib/api/problem'
import { useMoveParcelsToWarehouse } from './queries'
import { WarehouseSelect } from './WarehouseSelect'

export function MoveToWarehouseDialog({
  open,
  onOpenChange,
  parcelIds,
  onMoved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  parcelIds: number[]
  onMoved?: () => void
}) {
  const { t } = useTranslation(['warehouses', 'common'])
  const move = useMoveParcelsToWarehouse()
  const [warehouseId, setWarehouseId] = useState<number | undefined>()
  const [comment, setComment] = useState('')

  const submit = async () => {
    if (!warehouseId) return
    try {
      await move.mutateAsync({ warehouseId, parcelIds, comment: comment.trim() || undefined })
      toast.success(t('warehouses:move.done'))
      onOpenChange(false)
      onMoved?.()
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('warehouses:move.title')}</DialogTitle>
          <DialogDescription>{t('warehouses:move.description', { count: parcelIds.length })}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="mv-warehouse">{t('warehouses:fields.warehouse')}</FieldLabel>
            <WarehouseSelect id="mv-warehouse" value={warehouseId} onChange={setWarehouseId} />
          </Field>
          <Field>
            <FieldLabel htmlFor="mv-comment">{t('warehouses:move.comment')}</FieldLabel>
            <Textarea id="mv-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button disabled={!warehouseId || move.isPending} onClick={submit}>
              {t('warehouses:move.action')}
            </Button>
          </div>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  )
}
