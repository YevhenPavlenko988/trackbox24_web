import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ParcelPickList } from './ParcelPickList'

export function ParcelPickerDialog({
  open,
  onOpenChange,
  excludeIds,
  onAdd,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  excludeIds: number[]
  onAdd: (ids: number[]) => Promise<unknown>
  pending?: boolean
}) {
  const { t } = useTranslation(['shipments', 'common'])
  const [selected, setSelected] = useState<number[]>([])

  const close = (o: boolean) => {
    if (!o) setSelected([])
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('shipments:picker.title')}</DialogTitle>
        </DialogHeader>
        {open && <ParcelPickList selected={selected} onChange={setSelected} excludeIds={excludeIds} />}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => close(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            disabled={selected.length === 0 || pending}
            onClick={async () => {
              await onAdd(selected)
              close(false)
            }}
          >
            {t('common:actions.add')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
