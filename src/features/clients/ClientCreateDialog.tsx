import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ClientResponse } from '@/lib/api/types'
import { ClientForm } from './ClientForm'
import { clientKeys, useCreateClient } from './queries'
import { emptyClientValues, type ClientFormValues } from './schema'

/** Creates a client without leaving the current form (parcel create/edit). */
export function ClientCreateDialog({
  open,
  onOpenChange,
  onCreated,
  initialSearch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (client: ClientResponse) => void
  /** What the user typed into the picker before choosing "create": digits go to the phone, anything else to the last name. */
  initialSearch?: string
}) {
  const { t } = useTranslation(['clients', 'common'])
  const create = useCreateClient()
  const queryClient = useQueryClient()

  const search = initialSearch?.trim() ?? ''
  const defaultValues: ClientFormValues = {
    ...emptyClientValues,
    ...(search ? (/^\+?\d+$/.test(search) ? { phone: search.replace(/^\+/, '') } : { lastName: search }) : {}),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('clients:createTitle')}</DialogTitle>
        </DialogHeader>
        {open && (
          <ClientForm
            idPrefix="nc-"
            defaultValues={defaultValues}
            submitLabel={t('common:actions.create')}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (body) => {
              const created = await create.mutateAsync(body)
              queryClient.setQueryData(clientKeys.detail(created.id!), created)
              toast.success(t('common:common.saved'))
              onCreated(created)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
