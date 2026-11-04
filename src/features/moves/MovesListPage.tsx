import { BellRing, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { LinkButton } from '@/components/common/LinkButton'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/features/auth/access'
import { useCurrentCompany } from '@/features/companies/queries'
import { useClaimedCount } from '@/features/payments/queries'
import { ParcelStatusBadge } from '@/features/parcels/ParcelStatusBadge'
import { useParcels } from '@/features/parcels/queries'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { ParcelResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'

/** Moves of the company: one order with many items each, newest first. */
export function MovesListPage() {
  const { t } = useTranslation(['moves', 'parcels', 'common'])
  const { canEditMoves: canEdit, canSeeMoney } = useAccess()
  const navigate = useNavigate()
  const { page, size, setPage, setSize, get, set } = useListParams()
  const search = get('query') ?? ''
  // «Повідомили про оплату»: the client says they transferred, the manager checks the money
  const paymentClaimed = get('paymentClaimed') === 'true'
  const company = useCurrentCompany()
  const claimed = useClaimedCount(canSeeMoney && company.data?.onlinePaymentsEnabled === true).data?.moves ?? 0
  const query = useParcels({ kind: 'MOVE', query: search, paymentClaimed, page, size, sort: 'createdAt,desc' })
  const data = query.data ?? emptyPage<ParcelResponse>()

  const columns: Column<ParcelResponse>[] = [
    { key: 'code', header: t('moves:fields.code'), cell: (p) => <span className="font-mono font-medium">{p.barcode}</span> },
    { key: 'name', header: t('moves:fields.name'), cell: (p) => p.description ?? '—' },
    { key: 'customer', header: t('moves:fields.customer'), cell: (p) => p.clientName ?? '—' },
    {
      key: 'route',
      header: `${t('moves:fields.from')} → ${t('moves:fields.to')}`,
      cell: (p) => `${p.senderCity ?? '—'} → ${p.deliveryCity ?? p.clientCity ?? '—'}`,
    },
    {
      key: 'seats',
      header: t('moves:fields.seats'),
      cell: (p) => {
        const total = p.seats?.length ?? p.seatsAmount ?? 0
        const delivered = p.seats?.filter((s) => s.status === 'DELIVERED_TO_CLIENT').length ?? 0
        return <span className="tabular-nums">{delivered > 0 && delivered < total ? `${delivered} / ${total}` : total}</span>
      },
    },
    {
      key: 'status',
      header: t('moves:fields.status'),
      cell: (p) => (
        <div className="flex flex-col items-start gap-1">
          <ParcelStatusBadge status={p.status} />
          {canSeeMoney && p.paymentClaimedAt && (
            <span className="rounded bg-amber-100 px-1.5 text-xs font-medium text-amber-900">{t('parcels:online.claimedBadge')}</span>
          )}
        </div>
      ),
    },
    // the trip it is in (or planned into): a leg shows as №14.1
    {
      key: 'trip',
      header: t('moves:fields.trip'),
      cell: (p) => {
        const leg = (n?: number) => (n == null ? '' : p.tripLegNumber ? `${n}.${p.tripLegNumber}` : String(n))
        if (p.tripId && p.tripNumber != null)
          return (
            <Link to={`/trips/${p.tripId}`} className="whitespace-nowrap underline underline-offset-4" onClick={(e) => e.stopPropagation()}>
              №{leg(p.tripNumber)}
            </Link>
          )
        if (p.plannedTripId && p.plannedTripNumber != null)
          return (
            <Link to={`/trips/${p.plannedTripId}`} className="whitespace-nowrap text-muted-foreground underline underline-offset-4" onClick={(e) => e.stopPropagation()}>
              {t('moves:fields.tripPlanned', { trip: leg(p.plannedTripNumber) })}
            </Link>
          )
        return <span className="text-muted-foreground">—</span>
      },
    },
    { key: 'createdAt', header: t('moves:fields.createdAt'), cell: (p) => formatDateTime(p.createdAt) },
  ]

  return (
    <>
      <PageHeader
        title={t('moves:title')}
        description={t('moves:subtitle')}
        actions={
          canEdit && (
            <LinkButton to="/moves/new">
              <Plus />
              {t('moves:new')}
            </LinkButton>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          className="max-w-sm"
          placeholder={t('moves:search')}
          defaultValue={search}
          onChange={(e) => set({ query: e.target.value.trim() || undefined })}
          aria-label={t('moves:search')}
        />
        {canSeeMoney && (paymentClaimed || claimed > 0) && (
          <Button
            size="sm"
            variant={paymentClaimed ? 'default' : 'outline'}
            aria-pressed={paymentClaimed}
            onClick={() => set({ paymentClaimed: paymentClaimed ? undefined : 'true' })}
          >
            <BellRing />
            {t('parcels:filters.paymentClaimed')}
            {claimed > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-xs text-amber-950">{claimed}</span>}
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={data.content}
        rowKey={(p) => p.id ?? 0}
        onRowClick={(p) => navigate(`/moves/${p.id}`)}
        isLoading={query.isPending}
        emptyText={t('moves:empty')}
      />
      <div className="mt-4">
        <Pagination page={data} onPageChange={setPage} onSizeChange={setSize} />
      </div>
    </>
  )
}
