import { Play } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { ActualShipmentResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { useActualShipments } from './queries'
import { ActualStatusBadge } from './ShipmentStatusBadge'
import { StartShipmentDialog } from './StartShipmentDialog'

export function odometerText(s: ActualShipmentResponse): string {
  if (s.startOdometerKm == null && s.endOdometerKm == null) return '—'
  return `${s.startOdometerKm ?? '?'} → ${s.endOdometerKm ?? '…'}`
}

export function ShipmentsListPage() {
  const { t } = useTranslation(['shipments', 'common'])
  const navigate = useNavigate()
  const { page, size, setPage, setSize } = useListParams()
  const [starting, setStarting] = useState(false)

  const query = useActualShipments({ page, size })
  const data = query.data ?? emptyPage<ActualShipmentResponse>()

  const columns: Column<ActualShipmentResponse>[] = [
    { key: 'id', header: '#', cell: (s) => <span className="font-medium">{s.id}</span>, className: 'w-16' },
    { key: 'departed', header: t('shipments:fields.departedAt'), cell: (s) => formatDateTime(s.departedAt) },
    { key: 'arrived', header: t('shipments:fields.arrivedAt'), cell: (s) => formatDateTime(s.arrivedAt) },
    { key: 'car', header: t('shipments:fields.car'), cell: (s) => s.carPlateNumber ?? '—' },
    { key: 'driver', header: t('shipments:fields.driver'), cell: (s) => s.driverName ?? '—' },
    { key: 'odometer', header: t('shipments:fields.odometer'), cell: (s) => odometerText(s) },
    { key: 'status', header: t('shipments:fields.status'), cell: (s) => <ActualStatusBadge status={s.status} /> },
  ]

  return (
    <>
      <PageHeader
        title={t('shipments:actual.title')}
        actions={
          <Button onClick={() => setStarting(true)}>
            <Play />
            {t('shipments:actual.actions.start')}
          </Button>
        }
      />
      <DataTable columns={columns} rows={data.content} rowKey={(s) => s.id ?? 0} onRowClick={(s) => navigate(`/shipments/${s.id}`)} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
      <StartShipmentDialog open={starting} onOpenChange={setStarting} />
    </>
  )
}
