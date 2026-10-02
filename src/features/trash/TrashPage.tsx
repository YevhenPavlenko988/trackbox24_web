import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAccess } from '@/features/auth/access'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import { showApiError } from '@/lib/api/problem'
import { formatDateTime } from '@/lib/format'
import { listDeleted, restoreDeleted, TRASH_ENTITIES, type TrashEntity, type TrashRow } from './api'

/** Deleted records of the company, per entity, with restore. Deletion itself lives on each entity's page. */
export function TrashPage() {
  const { t } = useTranslation(['trash', 'common'])
  const { canEdit, canManageUsers } = useAccess()
  const { page, size, get, set, setPage, setSize } = useListParams()
  const entity = (TRASH_ENTITIES.includes(get('entity') as TrashEntity) ? get('entity') : 'parcels') as TrashEntity
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: ['trash', entity, { page, size }], queryFn: () => listDeleted(entity, { page, size }) })
  const data = query.data ?? emptyPage<TrashRow>()
  const restore = useMutation({
    mutationFn: (id: number) => restoreDeleted(entity, id),
    onSuccess: () => {
      // The restored record reappears in its own lists.
      queryClient.invalidateQueries()
      toast.success(t('trash:restored'))
    },
    onError: showApiError,
  })
  const canRestore = entity === 'users' ? canManageUsers : canEdit

  const columns: Column<TrashRow>[] = [
    {
      key: 'item',
      header: t(`trash:entity.${entity}`),
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.title}</span>
          {r.subtitle && <span className="text-xs text-muted-foreground">{r.subtitle}</span>}
        </div>
      ),
    },
    { key: 'deletedAt', header: t('trash:deletedAt'), cell: (r) => formatDateTime(r.deletedAt) },
    { key: 'deletedBy', header: t('trash:deletedBy'), cell: (r) => r.deletedBy ?? '—' },
    ...(canRestore
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-40 text-right',
            cell: (r: TrashRow) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(r.id)}>
                  <RotateCcw />
                  {t('trash:restore')}
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader title={t('trash:title')} description={t('trash:description')} />
      <Tabs value={entity} onValueChange={(v) => set({ entity: v === 'parcels' ? undefined : String(v), page: undefined })} className="mb-4">
        <TabsList>
          {TRASH_ENTITIES.map((e) => (
            <TabsTrigger key={e} value={e}>
              {t(`trash:entity.${e}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataTable columns={columns} rows={data.content} rowKey={(r) => r.id} isLoading={query.isPending} emptyText={t('trash:empty')} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
    </>
  )
}
