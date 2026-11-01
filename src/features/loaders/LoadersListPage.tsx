import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, type Column } from '@/components/common/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useAccess } from '@/features/auth/access'
import { DeleteEntityButton } from '@/features/trash/DeleteEntityButton'
import type { LoaderResponse } from '@/lib/api/types'
import { formatPhone } from '@/lib/format'
import { LoaderDialog } from './LoaderDialog'
import { useLoaders } from './queries'

/** The company's loaders to pick into moves' loading and unloading. */
export function LoadersListPage() {
  const { t } = useTranslation(['moves', 'common'])
  const { canEdit } = useAccess()
  const query = useLoaders()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<LoaderResponse | null>(null)

  const columns: Column<LoaderResponse>[] = [
    { key: 'name', header: t('moves:loaders.name'), cell: (l) => <span className="font-medium">{l.fullName}</span> },
    { key: 'phone', header: t('moves:loaders.phone'), cell: (l) => (l.phone ? formatPhone(l.phone) : '—') },
    { key: 'notes', header: t('moves:loaders.notes'), className: 'whitespace-normal', cell: (l) => l.notes ?? '—' },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: '',
            className: 'w-12 text-right',
            cell: (l: LoaderResponse) => (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DeleteEntityButton entity="loaders" id={l.id!} iconOnly />
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title={t('moves:loaders.title')}
        description={t('moves:loaders.hint')}
        actions={
          canEdit && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('common:actions.add')}
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        rows={query.data?.content ?? []}
        rowKey={(l) => l.id ?? 0}
        onRowClick={canEdit ? (l) => setEditing(l) : undefined}
        isLoading={query.isPending}
        emptyText={t('moves:loaders.empty')}
      />
      <LoaderDialog open={creating} onOpenChange={setCreating} />
      <LoaderDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} loader={editing} />
    </>
  )
}
