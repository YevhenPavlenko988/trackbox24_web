import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAddSeats } from '@/features/parcels/queries'
import { showApiError } from '@/lib/api/problem'
import type { ParcelResponse } from '@/lib/api/types'
import { itemLines } from './items'

/** Items forgotten at creation, one per line; they get the next numbers and their labels can be printed at once. */
export function AddItemsDialog({ parcel, open, onOpenChange }: { parcel: ParcelResponse; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['moves', 'common'])
  const add = useAddSeats(parcel.id!)
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const lines = itemLines(text)

  const submit = async () => {
    const first = (parcel.seats?.length ?? 0) + 1
    try {
      await add.mutateAsync(lines)
      const last = first + lines.length - 1
      toast.success(t('moves:add.added', { count: lines.length }), {
        action: { label: t('moves:add.printNew'), onClick: () => navigate(`/parcels/${parcel.id}/labels?seats=${first}-${last}`) },
        duration: 10000,
      })
      setText('')
      onOpenChange(false)
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('moves:add.title')}</DialogTitle>
          <DialogDescription>{t('moves:add.hint')}</DialogDescription>
        </DialogHeader>
        <Textarea rows={8} className="font-mono text-sm" placeholder={t('moves:items.listPlaceholder')} value={text} onChange={(e) => setText(e.target.value)} aria-label={t('moves:add.title')} />
        <p className="text-sm text-muted-foreground">{t('moves:items.willCreate', { count: lines.length })}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button disabled={!lines.length || add.isPending} onClick={submit}>
            {t('moves:add.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
