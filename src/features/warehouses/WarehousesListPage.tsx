import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAccess } from '@/features/auth/access'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { WarehouseResponse } from '@/lib/api/types'
import { useWarehouses } from './queries'
import { WarehouseDialog } from './WarehouseDialog'

export function WarehousesListPage() {
  const { t } = useTranslation(['warehouses', 'common'])
  const { canEdit } = useAccess()
  const { page, size, setPage, setSize } = useListParams()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<WarehouseResponse | null>(null)

  const query = useWarehouses({ page, size })
  const data = query.data ?? emptyPage<WarehouseResponse>()

  const columns: Column<WarehouseResponse>[] = [
    { key: 'name', header: t('warehouses:fields.name'), cell: (w) => <span className="font-medium">{w.name}</span> },
    { key: 'address', header: t('warehouses:fields.address'), cell: (w) => w.address ?? '—' },
    { key: 'notes', header: t('warehouses:fields.notes'), cell: (w) => w.notes ?? '—' },
    {
      key: 'active',
      header: t('warehouses:fields.active'),
      cell: (w) => (w.active === false ? <Badge variant="destructive">{t('warehouses:status.inactive')}</Badge> : <Badge variant="secondary">{t('warehouses:status.active')}</Badge>),
    },
    {
      key: 'parcels',
      header: '',
      className: 'text-right',
      cell: (w) => (
        <Link to={`/parcels?status=AT_WAREHOUSE&warehouseId=${w.id}`} className="text-sm underline underline-offset-4" onClick={(e) => e.stopPropagation()}>
          {t('common:nav.parcels')}
        </Link>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('warehouses:title')}
        actions={
          canEdit && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('common:actions.add')}
            </Button>
          )
        }
      />
      <DataTable columns={columns} rows={data.content} rowKey={(w) => w.id ?? 0} onRowClick={canEdit ? (w) => setEditing(w) : undefined} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
      <WarehouseDialog open={creating} onOpenChange={setCreating} />
      <WarehouseDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} warehouse={editing} />
    </>
  )
}
