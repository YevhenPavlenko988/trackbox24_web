import { AlertCircle, ArrowLeft, Pencil, Printer, RefreshCw, Repeat } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { DetailsList } from '@/components/common/DetailsList'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { showApiError } from '@/lib/api/problem'
import { formatDate, formatDateTime, formatMoney, formatPhone, formatWeight } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { ParcelEditDialog } from './ParcelEditDialog'
import { ParcelHistory } from './ParcelHistory'
import { ParcelStatusBadge } from './ParcelStatusBadge'
import { useParcel, useParcelHistory, useRefreshParcelFromNp } from './queries'
import { canEditParcel, isFinalStatus } from './status'
import { StatusChangeDialog } from './StatusChangeDialog'

export function ParcelPage() {
  const { id } = useParams()
  const parcelId = Number(id)
  const { t } = useTranslation(['parcels', 'common'])
  const query = useParcel(parcelId)
  const history = useParcelHistory(parcelId)
  const refresh = useRefreshParcelFromNp(parcelId)
  const [editing, setEditing] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  if (query.isPending) return <Skeleton className="h-60 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const p = query.data

  const onRefresh = async () => {
    try {
      await refresh.mutateAsync()
      history.refetch()
      toast.success(t('parcels:actions.refreshed'))
    } catch (e) {
      showApiError(e)
    }
  }

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="mb-2" to="/parcels">
        <ArrowLeft />
        {t('parcels:title')}
      </LinkButton>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{p.barcode ?? (p.npTtn ? `${t('parcels:fields.npTtnShort')} ${p.npTtn}` : `#${p.id}`)}</span>
            <ParcelStatusBadge status={p.status} />
            {p.needsEnrichment && (
              <Badge variant="outline" className="border-amber-400 text-amber-700">
                <AlertCircle />
                {t('parcels:needsEnrichment')}
              </Badge>
            )}
          </span>
        }
        description={`${t('parcels:fields.statusChangedAt')}: ${formatDateTime(p.statusChangedAt)}${p.statusChangedBy ? ` · ${p.statusChangedBy}` : ''}`}
        actions={
          <>
            {p.npTtn && (
              <Button variant="outline" onClick={onRefresh} disabled={refresh.isPending}>
                <RefreshCw className={refresh.isPending ? 'animate-spin' : undefined} />
                {t('parcels:actions.refreshNp')}
              </Button>
            )}
            {p.barcode && (
              <LinkButton variant="outline" to={`/parcels/${p.id}/labels`}>
                <Printer />
                {t('parcels:actions.printLabels')}
              </LinkButton>
            )}
            {!isFinalStatus(p.status) && (
              <Button variant="outline" onClick={() => setChangingStatus(true)}>
                <Repeat />
                {t('parcels:actions.changeStatus')}
              </Button>
            )}
            {canEditParcel(p) && (
              <Button onClick={() => setEditing(true)}>
                <Pencil />
                {t('common:actions.edit')}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('parcels:sections.seats')}</CardTitle>
          </CardHeader>
          <CardContent>
            {p.seats?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>{t('parcels:fields.barcode')}</TableHead>
                    <TableHead>{t('parcels:fields.status')}</TableHead>
                    <TableHead>{t('parcels:fields.statusChangedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.seats.map((s) => (
                    <TableRow key={s.seatNumber}>
                      <TableCell>{s.seatNumber}</TableCell>
                      <TableCell className="font-mono">{s.barcode}</TableCell>
                      <TableCell>
                        <ParcelStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{formatDateTime(s.statusChangedAt)}</span>
                          {s.statusChangedBy && <span className="text-xs">{s.statusChangedBy}</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('parcels:sections.seatsPending', { count: p.seatsAmount ?? 1 })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('parcels:sections.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailsList
              items={[
                {
                  label: t('parcels:fields.client'),
                  value: p.clientId ? (
                    <Link to={`/clients/${p.clientId}`} className="underline underline-offset-4">
                      {p.clientName}
                    </Link>
                  ) : undefined,
                },
                { label: t('clients:fields.phone', { ns: 'clients' }), value: formatPhone(p.clientPhone) },
                { label: t('parcels:fields.representative'), value: p.representativeName },
                { label: t('parcels:fields.source'), value: p.source ? t(`parcels:source.${p.source}`) : undefined },
                { label: t('parcels:fields.description'), value: p.description },
                { label: t('parcels:fields.seatsAmount'), value: p.seatsAmount },
                { label: t('parcels:fields.weightKg'), value: formatWeight(p.weightKg) },
                { label: t('parcels:fields.declaredValue'), value: formatMoney(p.declaredValue) },
                { label: t('parcels:fields.senderName'), value: p.senderName },
                { label: t('parcels:fields.senderPhone'), value: formatPhone(p.senderPhone) },
                { label: t('parcels:fields.senderCity'), value: p.senderCity },
                { label: t('parcels:fields.notes'), value: p.notes },
                {
                  label: t('trips:fields.plannedTrip', { ns: 'trips' }),
                  value: p.plannedTripId != null ? (
                    <Link to={`/trips/${p.plannedTripId}`} className="underline underline-offset-4">
                      {t('trips:one', { ns: 'trips', id: p.plannedTripId })}
                    </Link>
                  ) : undefined,
                },
                {
                  label: t('trips:fields.trip', { ns: 'trips' }),
                  value: p.tripId != null ? (
                    <Link to={`/trips/${p.tripId}`} className="underline underline-offset-4">
                      {t('trips:one', { ns: 'trips', id: p.tripId })}
                    </Link>
                  ) : undefined,
                },
                { label: t('common:common.createdAt'), value: formatDateTime(p.createdAt) },
              ]}
            />
          </CardContent>
        </Card>

        {p.npTtn && (
          <Card>
            <CardHeader>
              <CardTitle>{t('parcels:sections.novaPoshta')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailsList
                items={[
                  { label: t('parcels:fields.npTtn'), value: <span className="font-mono">{p.npTtn}</span> },
                  {
                    label: t('parcels:fields.npStatus'),
                    value: p.npStatusText ? `${p.npStatusText}${p.npStatusCode ? ` (${p.npStatusCode})` : ''}` : undefined,
                  },
                  { label: t('parcels:fields.npStatusUpdatedAt'), value: formatDateTime(p.npStatusUpdatedAt) },
                  { label: t('parcels:fields.npRecipientWarehouse'), value: p.npRecipientWarehouse },
                  { label: t('parcels:fields.npCreatedAt'), value: formatDateTime(p.npCreatedAt) },
                  { label: t('parcels:fields.npScheduledDeliveryAt'), value: formatDate(p.npScheduledDeliveryAt) },
                  { label: t('parcels:fields.npArrivedAt'), value: formatDateTime(p.npArrivedAt) },
                  { label: t('parcels:fields.npReceivedAt'), value: formatDateTime(p.npReceivedAt) },
                  { label: t('parcels:fields.npReturnAt'), value: formatDate(p.npReturnAt) },
                  { label: t('parcels:fields.npPaidStorageFrom'), value: formatDate(p.npPaidStorageFrom) },
                  { label: t('parcels:fields.npDeliveryCost'), value: formatMoney(p.npDeliveryCost) },
                  { label: t('parcels:fields.npCodAmount'), value: formatMoney(p.npCodAmount) },
                ]}
              />
            </CardContent>
          </Card>
        )}

        <Card className={p.npTtn ? undefined : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle>{t('parcels:history.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ParcelHistory entries={history.data} isLoading={history.isPending} />
          </CardContent>
        </Card>
      </div>

      <ParcelEditDialog parcel={p} open={editing} onOpenChange={setEditing} />
      <StatusChangeDialog parcel={p} open={changingStatus} onOpenChange={setChangingStatus} />
    </>
  )
}
