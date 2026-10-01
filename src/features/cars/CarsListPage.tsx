import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAccess } from '@/features/auth/access'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { CarResponse } from '@/lib/api/types'
import { CarDialog } from './CarDialog'
import { useCars } from './queries'

export function CarsListPage() {
  const { t } = useTranslation(['cars', 'common'])
  const { page, size, setPage, setSize } = useListParams()
  const { canEdit } = useAccess()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CarResponse | null>(null)

  const query = useCars({ page, size })
  const data = query.data ?? emptyPage<CarResponse>()

  const columns: Column<CarResponse>[] = [
    { key: 'plate', header: t('cars:fields.plateNumber'), cell: (c) => <span className="font-mono font-medium">{c.plateNumber}</span> },
    { key: 'model', header: `${t('cars:fields.brand')} / ${t('cars:fields.model')}`, cell: (c) => [c.brand, c.model].filter(Boolean).join(' ') || '—' },
    { key: 'capacity', header: t('cars:fields.capacityKg'), cell: (c) => c.capacityKg ?? '—' },
    { key: 'volume', header: t('cars:fields.volumeM3'), cell: (c) => c.volumeM3 ?? '—' },
    { key: 'driver', header: t('cars:fields.defaultDriver'), cell: (c) => c.defaultDriverName ?? '—' },
    {
      key: 'active',
      header: t('cars:fields.active'),
      cell: (c) => (c.active === false ? <Badge variant="destructive">{t('cars:status.inactive')}</Badge> : <Badge variant="secondary">{t('cars:status.active')}</Badge>),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('cars:title')}
        actions={
          canEdit && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('common:actions.add')}
            </Button>
          )
        }
      />
      <DataTable columns={columns} rows={data.content} rowKey={(c) => c.id ?? 0} onRowClick={canEdit ? (c) => setEditing(c) : undefined} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
      <CarDialog open={creating} onOpenChange={setCreating} />
      <CarDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} car={editing} />
    </>
  )
}
