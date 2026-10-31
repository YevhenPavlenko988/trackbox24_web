import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { LinkButton } from '@/components/common/LinkButton'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAccess } from '@/features/auth/access'
import { routeText, tripNo } from '@/features/trips/status'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { RouteResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'
import { useRoutes } from './queries'
import { RouteStatusBadge } from './RouteStatusBadge'

/** Routes, newest first: the legs with their cars and where the cargo is. */
export function RoutesListPage() {
  const { t } = useTranslation(['routes', 'common'])
  const navigate = useNavigate()
  const { canEdit } = useAccess()
  const { page, size, setPage, setSize } = useListParams()
  const query = useRoutes({ page, size })
  const data = query.data ?? emptyPage<RouteResponse>()

  const columns: Column<RouteResponse>[] = [
    { key: 'number', header: t('routes:fields.number'), cell: (r) => <span className="font-medium">{r.number}</span>, className: 'w-16' },
    { key: 'status', header: t('routes:fields.status'), cell: (r) => <RouteStatusBadge status={r.status} /> },
    { key: 'route', header: t('routes:fields.route'), cell: (r) => routeText(r) || '—' },
    {
      key: 'legs',
      header: t('routes:fields.legs'),
      className: 'whitespace-normal',
      cell: (r) => (
        <div className="flex flex-col gap-0.5 text-sm">
          {(r.legs ?? []).map((l) => (
            <span key={l.id}>
              <span className="font-medium">{tripNo(l)}</span> · {[l.carPlateNumber, l.driverName].filter(Boolean).join(', ') || '—'}
              {l.plannedDepartureAt && <span className="text-muted-foreground"> · {formatDateTime(l.plannedDepartureAt)}</span>}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'cargo',
      header: t('routes:fields.cargo'),
      className: 'whitespace-nowrap',
      cell: (r) => (
        <span className="text-sm">
          {r.parcelCount ?? 0}
          {(r.parcelCount ?? 0) > 0 && (
            <span className="text-muted-foreground">
              {' '}
              ({t('routes:counters.inCar')} {r.inCarCount}, {t('routes:counters.atWarehouse').toLowerCase()} {r.atWarehouseCount}, {t('routes:counters.delivered').toLowerCase()}{' '}
              {r.deliveredCount})
            </span>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('routes:title')}
        description={t('routes:hint')}
        actions={
          canEdit && (
            <LinkButton to="/routes/new">
              <Plus />
              {t('routes:new')}
            </LinkButton>
          )
        }
      />
      <DataTable
        columns={columns}
        rows={data.content}
        rowKey={(r) => r.id ?? 0}
        onRowClick={(r) => navigate(`/routes/${r.id}`)}
        isLoading={query.isPending}
        emptyText={t('routes:empty')}
      />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
    </>
  )
}
