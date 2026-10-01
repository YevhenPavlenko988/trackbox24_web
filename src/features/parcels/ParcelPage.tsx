import { AlertCircle, ArrowLeft, BadgeCheck, BadgeX, Pencil, Printer, RefreshCw, Repeat } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DetailsList } from '@/components/common/DetailsList'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAccess } from '@/features/auth/access'
import { showApiError } from '@/lib/api/problem'
import { formatDate, formatDateTime, formatMoney, formatPhone, formatWeight } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { ParcelEditDialog } from './ParcelEditDialog'
import { ParcelHistory } from './ParcelHistory'
import { ParcelStatusBadge } from './ParcelStatusBadge'
import { MarkPaidDialog } from './PaymentDialog'
import { useParcel, useParcelHistory, useRefreshParcelFromNp, useSetParcelPayment } from './queries'
import { canEditParcel, isFinalStatus } from './status'
import { StatusChangeDialog } from './StatusChangeDialog'

export function ParcelPage() {
  const { id } = useParams()
  const parcelId = Number(id)
  const { t } = useTranslation(['parcels', 'common', 'clients', 'trips', 'warehouses'])
  const { canEdit, canSeeMoney } = useAccess()
  const query = useParcel(parcelId)
  const history = useParcelHistory(parcelId)
  const refresh = useRefreshParcelFromNp(parcelId)
  const setPayment = useSetParcelPayment(parcelId)
  const [editing, setEditing] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [unpaying, setUnpaying] = useState(false)

  if (query.isPending) return <Skeleton className="h-60 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const p = query.data
  const hasPrice = p.deliveryPrice != null
  const hasSeatWarehouse = !!p.seats?.some((s) => s.warehouseName)

  const onRefresh = async () => {
    try {
      await refresh.mutateAsync()
      history.refetch()
      toast.success(t('parcels:actions.refreshed'))
    } catch (e) {
      showApiError(e)
    }
  }

  const onUnpaid = async () => {
    try {
      await setPayment.mutateAsync({ status: 'UNPAID' })
      toast.success(t('common:common.saved'))
      setUnpaying(false)
    } catch (e) {
      showApiError(e)
    }
  }

  const tripLink = (tripId: number | undefined) =>
    tripId != null ? (
      <Link to={`/trips/${tripId}`} className="underline underline-offset-4">
        {t('trips:one', { id: tripId })}
      </Link>
    ) : undefined

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
            {p.warehouseName && <span className="text-sm text-muted-foreground">{p.warehouseName}</span>}
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
            {canEdit && p.npTtn && (
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
            {canEdit && !isFinalStatus(p.status) && (
              <Button variant="outline" onClick={() => setChangingStatus(true)}>
                <Repeat />
                {t('parcels:actions.changeStatus')}
              </Button>
            )}
            {canEdit && canEditParcel(p) && (
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
                    {hasSeatWarehouse && <TableHead>{t('parcels:fields.warehouse')}</TableHead>}
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
                      {hasSeatWarehouse && <TableCell>{s.warehouseName ?? '—'}</TableCell>}
                      <TableCell className="whitespace-normal text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">{t('parcels:sections.seatsPending', { count: p.seatsAmount ?? 1 })}</p>
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
                { label: t('clients:fields.phone'), value: formatPhone(p.clientPhone) },
                { label: t('parcels:fields.clientCity'), value: p.clientCity },
                { label: t('parcels:fields.clientAddress'), value: p.clientAddress },
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
                { label: t('parcels:fields.warehouse'), value: p.warehouseName },
                { label: t('trips:fields.plannedTrip'), value: tripLink(p.plannedTripId) },
                { label: t('trips:fields.trip'), value: tripLink(p.tripId) },
                { label: t('common:common.createdAt'), value: formatDateTime(p.createdAt) },
              ]}
            />
          </CardContent>
        </Card>

        {canSeeMoney && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <CardTitle>{t('parcels:payment.title')}</CardTitle>
              {canEdit &&
                (p.paymentStatus === 'PAID' ? (
                  <Button size="sm" variant="outline" onClick={() => setUnpaying(true)}>
                    <BadgeX />
                    {t('parcels:payment.markUnpaid')}
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger render={<span />}>
                      <Button size="sm" disabled={!hasPrice} onClick={() => setMarkingPaid(true)}>
                        <BadgeCheck />
                        {t('parcels:payment.markPaid')}
                      </Button>
                    </TooltipTrigger>
                    {!hasPrice && <TooltipContent>{t('parcels:payment.noPrice')}</TooltipContent>}
                  </Tooltip>
                ))}
            </CardHeader>
            <CardContent>
              <DetailsList
                items={[
                  { label: t('parcels:payment.price'), value: formatMoney(p.deliveryPrice, p.deliveryPriceCurrency) },
                  {
                    label: t('parcels:payment.status'),
                    value: hasPrice ? (
                      <Badge variant={p.paymentStatus === 'PAID' ? 'secondary' : 'outline'} className={p.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-900' : 'text-amber-700'}>
                        {t(`parcels:payment.${p.paymentStatus ?? 'UNPAID'}`)}
                      </Badge>
                    ) : undefined,
                  },
                  { label: t('parcels:payment.paidAt'), value: formatDateTime(p.paidAt) },
                  { label: t('parcels:payment.paidBy'), value: p.paidBy },
                  { label: t('parcels:fields.npDeliveryCost'), value: formatMoney(p.npDeliveryCost) },
                  { label: t('parcels:fields.npCodAmount'), value: formatMoney(p.npCodAmount) },
                ]}
              />
            </CardContent>
          </Card>
        )}

        {p.npTtn && (
          <Card>
            <CardHeader>
              <CardTitle>{t('parcels:sections.novaPoshta')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailsList
                items={[
                  { label: t('parcels:fields.npTtn'), value: <span className="font-mono">{p.npTtn}</span> },
                  { label: t('parcels:fields.npStatus'), value: p.npStatusText ? `${p.npStatusText}${p.npStatusCode ? ` (${p.npStatusCode})` : ''}` : undefined },
                  { label: t('parcels:fields.npStatusUpdatedAt'), value: formatDateTime(p.npStatusUpdatedAt) },
                  { label: t('parcels:fields.npRecipientWarehouse'), value: p.npRecipientWarehouse },
                  { label: t('parcels:fields.npCreatedAt'), value: formatDateTime(p.npCreatedAt) },
                  { label: t('parcels:fields.npScheduledDeliveryAt'), value: formatDate(p.npScheduledDeliveryAt) },
                  { label: t('parcels:fields.npArrivedAt'), value: formatDateTime(p.npArrivedAt) },
                  { label: t('parcels:fields.npReceivedAt'), value: formatDateTime(p.npReceivedAt) },
                  { label: t('parcels:fields.npReturnAt'), value: formatDate(p.npReturnAt) },
                  { label: t('parcels:fields.npPaidStorageFrom'), value: formatDate(p.npPaidStorageFrom) },
                ]}
              />
            </CardContent>
          </Card>
        )}

        <Card className="lg:col-span-2">
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
      <MarkPaidDialog parcel={p} open={markingPaid} onOpenChange={setMarkingPaid} />
      <ConfirmDialog open={unpaying} onOpenChange={setUnpaying} title={t('parcels:payment.unpaidConfirm')} confirmLabel={t('parcels:payment.markUnpaid')} destructive pending={setPayment.isPending} onConfirm={onUnpaid} />
    </>
  )
}
