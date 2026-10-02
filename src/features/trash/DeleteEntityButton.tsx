import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { showApiError } from '@/lib/api/problem'
import { deleteEntity, type TrashEntity } from './api'

/** Soft-deletes a client / car / warehouse / user after confirmation; the backend decides whether it is allowed. */
export function DeleteEntityButton({
  entity,
  id,
  iconOnly = false,
  onDeleted,
}: {
  entity: Exclude<TrashEntity, 'parcels' | 'trips'>
  id: number
  iconOnly?: boolean
  onDeleted?: () => void
}) {
  const { t } = useTranslation(['trash', 'common'])
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: () => deleteEntity(entity, id),
    onSuccess: () => {
      queryClient.invalidateQueries()
      toast.success(t('trash:deleted'))
      setOpen(false)
      onDeleted?.()
    },
    onError: showApiError,
  })
  return (
    <>
      {iconOnly ? (
        <Button variant="ghost" size="icon-sm" aria-label={t('common:actions.delete')} onClick={() => setOpen(true)}>
          <Trash2 />
        </Button>
      ) : (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 />
          {t('common:actions.delete')}
        </Button>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t(`trash:deleteConfirm.${entity}.title`)}
        description={t(`trash:deleteConfirm.${entity}.description`)}
        confirmLabel={t('common:actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </>
  )
}
