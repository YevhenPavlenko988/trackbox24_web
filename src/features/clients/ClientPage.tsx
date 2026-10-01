import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { DetailsList } from '@/components/common/DetailsList'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAccess } from '@/features/auth/access'
import { ParcelStatusSelect } from '@/features/parcels/ParcelStatusSelect'
import { ParcelsTable } from '@/features/parcels/ParcelsTable'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { ClientResponse, ParcelResponse, ParcelStatus } from '@/lib/api/types'
import { formatPhone } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { clientDisplayName } from './api'
import { ClientForm } from './ClientForm'
import { useClient, useClientParcels, useUpdateClient } from './queries'
import { clientToFormValues } from './schema'

export function ClientPage() {
  const { id } = useParams()
  const clientId = Number(id)
  const { t } = useTranslation(['clients', 'common'])
  const query = useClient(clientId)
  const { canEdit } = useAccess()
  const [editing, setEditing] = useState(false)
  const { get, set } = useListParams()
  const tab = get('tab') ?? 'info'

  if (query.isPending) return <Skeleton className="h-40 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const client = query.data

  return (
    <>
      <PageHeader
        title={clientDisplayName(client)}
        description={client.type ? t(`common:clientType.${client.type}`) : undefined}
        actions={
          canEdit && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              {t('common:actions.edit')}
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === 'info' ? undefined : String(v), page: undefined })}>
        <TabsList>
          <TabsTrigger value="info">{t('clients:tabs.info')}</TabsTrigger>
          <TabsTrigger value="parcels">{t('clients:tabs.parcels')}</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent>
              <DetailsList
                items={[
                  { label: t('clients:fields.lastName'), value: client.lastName },
                  { label: t('clients:fields.firstName'), value: client.firstName },
                  { label: t('clients:fields.middleName'), value: client.middleName },
                  { label: t('clients:fields.organizationName'), value: client.organizationName },
                  { label: t('clients:fields.phone'), value: formatPhone(client.phone) },
                  { label: t('clients:fields.email'), value: client.email },
                  { label: t('clients:fields.city'), value: client.city },
                  { label: t('clients:fields.address'), value: client.address },
                  { label: t('clients:fields.notes'), value: client.notes },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="parcels" className="mt-4">
          {tab === 'parcels' && <ClientParcels clientId={clientId} />}
        </TabsContent>
      </Tabs>

      <EditClientDialog client={client} open={editing} onOpenChange={setEditing} />
    </>
  )
}

function ClientParcels({ clientId }: { clientId: number }) {
  const { page, size, get, set, setPage, setSize } = useListParams()
  const status = get('status') as ParcelStatus | undefined
  const query = useClientParcels(clientId, { status, page, size })
  const data = query.data ?? emptyPage<ParcelResponse>()

  return (
    <>
      <div className="mb-4">
        <ParcelStatusSelect value={status} onChange={(v) => set({ status: v })} />
      </div>
      <ParcelsTable rows={data.content} isLoading={query.isPending} hideClient />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
    </>
  )
}

function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: ClientResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation(['clients', 'common'])
  const update = useUpdateClient(client.id!)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('clients:editTitle')}</DialogTitle>
        </DialogHeader>
        {open && (
          <ClientForm
            defaultValues={clientToFormValues(client)}
            submitLabel={t('common:actions.save')}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (body) => {
              await update.mutateAsync(body)
              toast.success(t('common:common.saved'))
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
