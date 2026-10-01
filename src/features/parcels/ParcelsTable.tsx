import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ParcelResponse } from '@/lib/api/types'
import { formatDate, formatDateTime, formatPhone } from '@/lib/format'
import { ParcelStatusBadge } from './ParcelStatusBadge'

export function seatsProgress(p: ParcelResponse): string {
  const total = p.seatsAmount ?? p.seats?.length ?? 1
  if (!p.seats?.length || !p.status) return String(total)
  const reached = p.seats.filter((s) => s.status === p.status).length
  return reached === total ? String(total) : `${reached} / ${total}`
}

export function isPaidStorageDue(p: ParcelResponse): boolean {
  return !!p.npPaidStorageFrom && new Date(p.npPaidStorageFrom).getTime() <= Date.now()
}

export function ParcelsTable({
  rows,
  isLoading,
  hideClient = false,
}: {
  rows: ParcelResponse[]
  isLoading?: boolean
  hideClient?: boolean
}) {
  const { t } = useTranslation(['parcels', 'common'])
  const navigate = useNavigate()

  const columns: Column<ParcelResponse>[] = [
    {
      key: 'code',
      header: t('parcels:fields.barcode'),
      cell: (p) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium">{p.barcode ?? '—'}</span>
          {p.npTtn && <span className="text-xs text-muted-foreground">{t('parcels:fields.npTtnShort')} {p.npTtn}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('parcels:fields.status'),
      cell: (p) => (
        <div className="flex items-center gap-1.5">
          <ParcelStatusBadge status={p.status} />
          {p.needsEnrichment && (
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <AlertCircle className="size-4 text-amber-600" />
              </TooltipTrigger>
              <TooltipContent>{t('parcels:needsEnrichment')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
    ...(hideClient
      ? []
      : [
          {
            key: 'client',
            header: t('parcels:fields.client'),
            cell: (p: ParcelResponse) => (
              <div className="flex flex-col">
                <span>{p.clientName ?? '—'}</span>
                {p.clientPhone && <span className="text-xs text-muted-foreground">{formatPhone(p.clientPhone)}</span>}
              </div>
            ),
          },
        ]),
    {
      key: 'sender',
      header: t('parcels:fields.sender'),
      cell: (p) => (
        <div className="flex flex-col">
          <span>{p.senderName ?? '—'}</span>
          {p.senderCity && <span className="text-xs text-muted-foreground">{p.senderCity}</span>}
        </div>
      ),
    },
    { key: 'seats', header: t('parcels:fields.seats'), cell: (p) => seatsProgress(p), className: 'text-center' },
    { key: 'delivery', header: t('parcels:fields.npScheduledDeliveryAt'), cell: (p) => formatDate(p.npScheduledDeliveryAt) },
    {
      key: 'paidStorage',
      header: t('parcels:fields.npPaidStorageFrom'),
      cell: (p) =>
        isPaidStorageDue(p) ? (
          <Badge variant="destructive">{formatDate(p.npPaidStorageFrom)}</Badge>
        ) : (
          formatDate(p.npPaidStorageFrom)
        ),
    },
    { key: 'createdAt', header: t('common:common.createdAt'), cell: (p) => formatDateTime(p.createdAt) },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(p) => p.id ?? 0}
      onRowClick={(p) => navigate(`/parcels/${p.id}`)}
      rowClassName={(p) => (isPaidStorageDue(p) ? 'bg-destructive/5' : undefined)}
      isLoading={isLoading}
    />
  )
}
