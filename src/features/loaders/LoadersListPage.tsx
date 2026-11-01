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
import { loaderCities, sameCity } from './cities'
import { LoaderDialog } from './LoaderDialog'
import { useLoaders } from './queries'

/** The company's loaders to pick into moves' loading and unloading. */
export function LoadersListPage() {
  const { t } = useTranslation(['moves', 'common'])
  const { canEdit, canEditMoves } = useAccess()
  const query = useLoaders()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<LoaderResponse | null>(null)
  const [city, setCity] = useState('')
  const all = query.data?.content ?? []
  const cities = loaderCities(all)

  const columns: Column<LoaderResponse>[] = [
    { key: 'name', header: t('moves:loaders.name'), cell: (l) => <span className="font-medium">{l.fullName}</span> },
    { key: 'phone', header: t('moves:loaders.phone'), cell: (l) => (l.phone ? formatPhone(l.phone) : '—') },
    { key: 'city', header: t('moves:loaders.city'), cell: (l) => l.city ?? '—' },
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
          canEditMoves && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('common:actions.add')}
            </Button>
          )
        }
      />
      {cities.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" variant={city ? 'outline' : 'default'} onClick={() => setCity('')}>
            {t('moves:loaders.allCities')}
          </Button>
          {cities.map((c) => (
            <Button key={c} size="sm" variant={city === c ? 'default' : 'outline'} onClick={() => setCity(c)}>
              {c}
            </Button>
          ))}
        </div>
      )}
      <DataTable
        columns={columns}
        rows={all.filter((l) => sameCity(l, city))}
        rowKey={(l) => l.id ?? 0}
        onRowClick={canEditMoves ? (l) => setEditing(l) : undefined}
        isLoading={query.isPending}
        emptyText={t('moves:loaders.empty')}
      />
      <LoaderDialog open={creating} onOpenChange={setCreating} />
      <LoaderDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} loader={editing} />
    </>
  )
}
