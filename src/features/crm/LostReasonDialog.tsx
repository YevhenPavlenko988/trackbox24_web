import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

/** Asks why a deal is lost before it moves to a LOST stage. */
export function LostReasonDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  pending?: boolean
  onConfirm: (reason: string) => void
}) {
  const { t } = useTranslation(['crm', 'common'])
  const [reason, setReason] = useState('')
  return (
    <Dialog open={open} onOpenChange={(o) => { setReason(''); onOpenChange(o) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('crm:lost.title')}</DialogTitle>
        </DialogHeader>
        <Textarea rows={3} value={reason} placeholder={t('crm:lost.placeholder')} onChange={(e) => setReason(e.target.value)} aria-label={t('crm:fields.lostReason')} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="destructive" disabled={pending || !reason.trim()} onClick={() => onConfirm(reason.trim())}>
            {t('common:actions.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
