import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { LinkButton } from '@/components/common/LinkButton'
import { Pagination } from '@/components/common/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { useAccess } from '@/features/auth/access'
import { ParcelStatusBadge } from '@/features/parcels/ParcelStatusBadge'
import { useParcels } from '@/features/parcels/queries'
import { useListParams } from '@/hooks/use-list-params'
import { emptyPage } from '@/lib/api/page'
import type { ParcelResponse } from '@/lib/api/types'
import { formatDateTime } from '@/lib/format'

/** Moves of the company: one order with many items each, newest first. */
export function MovesListPage() {
  const { t } = useTranslation(['moves', 'common'])
  const { canEdit } = useAccess()
  const navigate = useNavigate()
  const { page, size, setPage, setSize, get, set } = useListParams()
  const search = get('query') ?? ''
  const query = useParcels({ kind: 'MOVE', query: search, page, size, sort: 'createdAt,desc' })
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
    { key: 'status', header: t('moves:fields.status'), cell: (p) => <ParcelStatusBadge status={p.status} /> },
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
      <Input
        className="mb-4 max-w-sm"
        placeholder={t('moves:search')}
        defaultValue={search}
        onChange={(e) => set({ query: e.target.value.trim() || undefined })}
        aria-label={t('moves:search')}
      />
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
