import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { PlannedShipmentResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { PlannedShipmentDialog } from './PlannedShipmentDialog'
import { useCreatePlanned, usePlannedShipments } from './queries'
import { PlannedStatusBadge } from './ShipmentStatusBadge'

export function routeText(s: { origin?: string; destination?: string }): string {
  return [s.origin, s.destination].filter(Boolean).join(' → ') || '—'
}

export function PlannedShipmentsListPage() {
  const { t } = useTranslation(['shipments', 'common'])
  const navigate = useNavigate()
  const { page, size, setPage, setSize } = useListParams()
  const [creating, setCreating] = useState(false)
  const create = useCreatePlanned()

  const query = usePlannedShipments({ page, size })
  const data = query.data ?? emptyPage<PlannedShipmentResponse>()

  const columns: Column<PlannedShipmentResponse>[] = [
    { key: 'id', header: '#', cell: (s) => <span className="font-medium">{s.id}</span>, className: 'w-16' },
    { key: 'departure', header: t('shipments:fields.plannedDepartureAt'), cell: (s) => formatDateTime(s.plannedDepartureAt) },
    { key: 'route', header: t('shipments:fields.route'), cell: (s) => routeText(s) },
    { key: 'car', header: t('shipments:fields.car'), cell: (s) => s.carPlateNumber ?? '—' },
    { key: 'driver', header: t('shipments:fields.driver'), cell: (s) => s.driverName ?? '—' },
    { key: 'status', header: t('shipments:fields.status'), cell: (s) => <PlannedStatusBadge status={s.status} /> },
  ]

  return (
    <>
      <PageHeader
        title={t('shipments:planned.title')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            {t('common:actions.add')}
          </Button>
        }
      />
      <DataTable columns={columns} rows={data.content} rowKey={(s) => s.id ?? 0} onRowClick={(s) => navigate(`/planned-shipments/${s.id}`)} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
      <PlannedShipmentDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={async (body) => {
          const created = await create.mutateAsync(body)
          navigate(`/planned-shipments/${created.id}`)
        }}
      />
    </>
  )
}
