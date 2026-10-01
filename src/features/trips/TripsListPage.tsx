import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useAccess } from '@/features/auth/access'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { TripResponse, TripStatus } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { useCreateTrip, useTrips } from './queries'
import { routeText, TRIP_STATUSES } from './status'
import { TripDialog } from './TripDialog'
import { TripStatusBadge } from './TripStatusBadge'

export function TripsListPage() {
  const { t } = useTranslation(['trips', 'common'])
  const navigate = useNavigate()
  const { canEdit } = useAccess()
  const { page, size, get, set, setPage, setSize } = useListParams()
  const status = get('status') as TripStatus | undefined
  const [creating, setCreating] = useState(false)
  const create = useCreateTrip()

  const query = useTrips({ status, page, size })
  const data = query.data ?? emptyPage<TripResponse>()

  const columns: Column<TripResponse>[] = [
    { key: 'id', header: '#', cell: (s) => <span className="font-medium">{s.id}</span>, className: 'w-16' },
    { key: 'status', header: t('trips:fields.status'), cell: (s) => <TripStatusBadge status={s.status} /> },
    { key: 'departure', header: t('trips:fields.plannedDepartureAt'), cell: (s) => formatDateTime(s.plannedDepartureAt) },
    { key: 'route', header: t('trips:fields.route'), cell: (s) => routeText(s) },
    { key: 'car', header: t('trips:fields.car'), cell: (s) => s.carPlateNumber ?? '—' },
    { key: 'driver', header: t('trips:fields.driver'), cell: (s) => s.driverName ?? '—' },
    { key: 'departed', header: t('trips:fields.departedAt'), cell: (s) => formatDateTime(s.departedAt) },
    { key: 'arrived', header: t('trips:fields.arrivedAt'), cell: (s) => formatDateTime(s.arrivedAt) },
  ]

  return (
    <>
      <PageHeader
        title={t('trips:title')}
        actions={
          canEdit && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {t('common:actions.add')}
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={status ? 'outline' : 'default'} onClick={() => set({ status: undefined })}>
          {t('trips:filters.all')}
        </Button>
        {TRIP_STATUSES.map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => set({ status: s })}>
            {t(`trips:status.${s}`)}
          </Button>
        ))}
      </div>
      <DataTable columns={columns} rows={data.content} rowKey={(s) => s.id ?? 0} onRowClick={(s) => navigate(`/trips/${s.id}`)} isLoading={query.isPending} />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
      <TripDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={async (body) => {
          const created = await create.mutateAsync(body)
          navigate(`/trips/${created.id}`)
        }}
      />
    </>
  )
}
