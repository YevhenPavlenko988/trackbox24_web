import { AlertCircle, ArrowLeft, BadgeCheck, BadgeX, CalendarClock, Copy, Hash, Info, Link2, Package, Pencil, Printer, RefreshCw, Repeat, Send, Sofa, Trash2, Truck, UserRound, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import i18n from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { legNo } from '@/features/trips/status'
import { NpNumber } from '@/components/common/NpNumber'
import { InfoGroup, MissingFields, type InfoRow } from '@/components/common/InfoGroup'
import { LinkButton } from '@/components/common/LinkButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAccess } from '@/features/auth/access'
import { isApiError, showApiError } from '@/lib/api/problem'
import { formatDate, formatDateTime, formatMoney, formatPhone, formatWeight } from '@/lib/format'
import { NotFoundPage } from '@/routes/ErrorPages'
import { ParcelEditDialog } from './ParcelEditDialog'
import { isNpDeliveryPaid, NpPaymentCard } from './NpPaymentCard'
import { NpShipmentCard } from './NpShipmentCard'
import { ChannelBadge } from '@/features/channels/channel'
import { MoveBillCard } from '@/features/moves/MoveBillCard'
import { MovePaymentCard } from '@/features/moves/MovePaymentCard'
import { OnlinePaymentsCard } from '@/features/payments/OnlinePaymentsCard'
import { MoveSeatsCard } from '@/features/moves/MoveSeatsCard'
import { NpStateBadge } from './NpStateBadge'
import { ParcelHistory } from './ParcelHistory'
import { ParcelPhotosCard } from './ParcelPhotosCard'
import { ParcelStatusBadge } from './ParcelStatusBadge'
import { MarkPaidDialog } from './PaymentDialog'
import { paidInLine } from '@/features/currency/PaidCurrency'
import { DiscountOffButton } from '@/features/referral/DiscountOffButton'
import { useDeleteParcel, useParcel, useParcelHistory, useRefreshParcelFromNp, useSetParcelPayment } from './queries'
import { canEditParcel, isFinalStatus, isParcelDeletable } from './status'
import { StatusChangeDialog } from './StatusChangeDialog'

export function ParcelPage() {
  const { id } = useParams()
  const parcelId = Number(id)
  const { t } = useTranslation(['parcels', 'common', 'clients', 'trips', 'warehouses', 'moves', 'currency'])
  const { canEdit, canEditMoves, canSeeMoney, isManager } = useAccess()
  const query = useParcel(parcelId)
  const history = useParcelHistory(parcelId)
  const refresh = useRefreshParcelFromNp(parcelId)
  const setPayment = useSetParcelPayment(parcelId)
  const [editing, setEditing] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [unpaying, setUnpaying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const remove = useDeleteParcel()
  const navigate = useNavigate()
  // A parcel can vanish between requests when Nova Poshta redirects it and the backend merges it into another one.
  const gone = query.isError && isApiError(query.error) && query.error.status === 404
  useEffect(() => {
    if (gone) {
      toast.info(t('parcels:np.gone'))
      navigate('/parcels', { replace: true })
    }
  }, [gone]) // eslint-disable-line react-hooks/exhaustive-deps

  if (query.isPending) return <Skeleton className="h-60 w-full" />
  if (query.isError || !query.data) return <NotFoundPage />
  const p = query.data
  const hasPrice = p.deliveryPrice != null
  const hasSeatWarehouse = !!p.seats?.some((s) => s.warehouseName)
  // Backend rule: a parcel can be deleted while it is not in a car and not delivered.
  const deletable = canEdit && isParcelDeletable(p)
  const move = p.kind === 'MOVE'

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

  const tripLink = (tripId: number | undefined, number: number | undefined) =>
    tripId != null ? (
      <Link to={`/trips/${tripId}`} className="underline underline-offset-4">
        {t('trips:one', { number: legNo(number ?? tripId, p.tripLegNumber) })}
      </Link>
    ) : undefined

  const clientRows: InfoRow[] = [
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
  ]
  // a move made for the client themself has them as the sender too: one block is enough then
  const showSender = !move || (p.senderClientId ?? null) !== (p.clientId ?? null) || (!!p.senderName && p.senderName !== p.clientName)
  const senderRows: InfoRow[] = [
    { label: t('parcels:fields.senderName'), value: p.senderName },
    { label: t('parcels:fields.senderPhone'), value: formatPhone(p.senderPhone) },
    { label: t('parcels:fields.senderCity'), value: p.senderCity },
  ]
  // Nova Poshta's figure, nothing to fill in: never listed as missing
  const volumeRow: InfoRow = { label: t('parcels:fields.npVolumeWeight'), value: formatWeight(p.npVolumeWeight) }
  const route = [p.senderCity, p.deliveryCity].filter(Boolean).join(' → ')
  const cargoRows: InfoRow[] = move
    ? [
        { label: t('parcels:fields.description'), value: p.description },
        { label: t('parcels:fields.seatsAmount'), value: p.seatsAmount },
        { label: t('parcels:groups.route'), value: route || undefined },
      ]
    : [
        { label: t('parcels:fields.description'), value: p.description },
        { label: t('parcels:fields.seatsAmount'), value: p.seatsAmount },
        { label: t('parcels:fields.weightKg'), value: formatWeight(p.weightKg) },
        volumeRow,
        {
          label: t('parcels:fields.dimensions'),
          value: p.lengthCm != null || p.widthCm != null || p.heightCm != null ? [p.lengthCm, p.widthCm, p.heightCm].map((v) => v ?? '?').join(' × ') : undefined,
        },
        { label: t('parcels:fields.declaredValue'), value: formatMoney(p.declaredValue) },
      ]
  const logisticsRows: InfoRow[] = [
    { label: t('parcels:fields.deliveryCity'), value: p.deliveryCity },
    { label: t('parcels:fields.representative'), value: p.representativeName },
    { label: t('parcels:fields.warehouse'), value: p.warehouseName },
    { label: t('trips:fields.plannedTrip'), value: tripLink(p.plannedTripId, p.plannedTripNumber) },
    { label: t('trips:fields.trip'), value: tripLink(p.tripId, p.tripNumber) },
  ]
  const otherRows: InfoRow[] = [
    { label: t('common:channelField.label'), value: p.channel ? <ChannelBadge channel={p.channel} details={p.channelDetails} /> : undefined },
    { label: t('parcels:fields.notes'), value: p.notes },
    // how the parcel got here (by hand or from Nova Poshta) and when, in one line
    {
      label: t('parcels:groups.added'),
      value: [formatDateTime(p.createdAt), p.source ? t(`parcels:source.${p.source}`).toLowerCase() : undefined].filter((v) => v && v !== '—').join(' · ') || undefined,
    },
  ]
  const paymentRows: InfoRow[] = [
    { label: t('parcels:payment.price'), value: formatMoney(p.deliveryPrice, p.deliveryPriceCurrency) },
    // «Реферальна програма»: the referred client's discount (a manager may take it off before payment) and the points spent
    {
      label: t('parcels:payment.referralDiscount'),
      value: p.referralDiscount ? (
        <span className="flex flex-wrap items-center gap-2">
          −{formatMoney(p.referralDiscount, p.deliveryPriceCurrency)}
          {isManager && p.paymentStatus !== 'PAID' && <DiscountOffButton parcelId={p.id!} off />}
        </span>
      ) : p.referralDiscountOff ? (
        <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
          {t('parcels:payment.discountRemoved')}
          {isManager && p.paymentStatus !== 'PAID' && <DiscountOffButton parcelId={p.id!} off={false} />}
        </span>
      ) : undefined,
    },
    {
      label: t('parcels:payment.pointsRedeemed'),
      value: p.pointsRedeemed ? `${p.pointsRedeemed} · −${formatMoney(p.pointsValue, p.deliveryPriceCurrency)}` : undefined,
    },
    {
      label: t('parcels:payment.due'),
      value:
        p.dueAmount != null && p.deliveryPrice != null && p.dueAmount !== p.deliveryPrice ? (
          <span className="font-semibold">{formatMoney(p.dueAmount, p.deliveryPriceCurrency)}</span>
        ) : undefined,
    },
    {
      label: t('parcels:payment.status'),
      value: hasPrice ? (
        <Badge variant={p.paymentStatus === 'PAID' ? 'secondary' : 'outline'} className={p.paymentStatus === 'PAID' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
          {t(`parcels:payment.${p.paymentStatus ?? 'UNPAID'}`)}
        </Badge>
      ) : undefined,
    },
    {
      label: t('parcels:online.claimedBadge'),
      value: p.paymentClaimedAt ? <span className="font-medium text-amber-700 dark:text-amber-300">{formatDateTime(p.paymentClaimedAt)}</span> : undefined,
    },
    { label: t('parcels:payment.paidAt'), value: formatDateTime(p.paidAt) },
    { label: t('parcels:payment.paidBy'), value: p.paidBy },
    { label: t('parcels:payment.method'), value: p.paymentMethod ? t(`common:paymentMethod.${p.paymentMethod}`) : undefined },
    // paid in another currency than the price: what the client gave, at the rate of that moment
    { label: t('currency:paidIn'), value: paidInLine(t, p) },
    { label: t('parcels:fields.npDeliveryCost'), value: p.npDeliveryCost ? formatMoney(p.npDeliveryCost) : undefined },
    { label: t('parcels:fields.npCodAmount'), value: p.npCodAmount ? formatMoney(p.npCodAmount) : undefined },
  ]
  // storage is only charged while the parcel still sits at the branch
  const paidStorageDue = p.status === 'IN_NOVA_POSHTA' && !!p.npPaidStorageFrom && new Date(p.npPaidStorageFrom) <= new Date()

  return (
    <>
      <LinkButton variant="ghost" size="sm" className="mb-2" to={move ? '/moves' : '/parcels'}>
        <ArrowLeft />
        {move ? t('moves:title') : t('parcels:title')}
      </LinkButton>
      <PageHeader
        title={
          <span className="font-mono break-all">
            {p.barcode ?? (p.npTtn ? <>{t('parcels:fields.npTtnShort')} <NpNumber value={p.npTtn} /></> : `#${p.id}`)}
          </span>
        }
        badges={
          <>
            {move && <Badge className="bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200">{t('moves:badge')}</Badge>}
            <ParcelStatusBadge status={p.status} />
            {p.status === 'IN_NOVA_POSHTA' && <NpStateBadge parcel={p} />}
            {p.warehouseName && <span className="text-sm text-muted-foreground">{p.warehouseName}</span>}
            {p.needsEnrichment && (
              <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                <AlertCircle />
                {t('parcels:needsEnrichment')}
              </Badge>
            )}
          </>
        }
        description={`${t('parcels:fields.statusChangedAt')}: ${formatDateTime(p.statusChangedAt)}${p.statusChangedBy ? ` · ${p.statusChangedBy}` : ''}`}
        actions={
          <>
            {p.trackingUrl && (
              <Button variant="outline" onClick={() => copyTrackingLink(p.trackingUrl!)}>
                <Link2 />
                {t('parcels:actions.copyTrackingLink')}
              </Button>
            )}
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
            {(canEdit || (p.kind === 'MOVE' && canEditMoves)) && canEditParcel(p) && (
              <Button onClick={() => setEditing(true)}>
                <Pencil />
                {t('common:actions.edit')}
              </Button>
            )}
            {deletable && (
              <Button variant="destructive" onClick={() => setDeleting(true)}>
                <Trash2 />
                {t('parcels:actions.delete')}
              </Button>
            )}
          </>
        }
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('parcels:deleteConfirm.title')}
        description={
          // The backend deletes our outgoing waybill in Nova Poshta along with the parcel; say so before the click.
          p.npShipment?.waybillNumber ? (
            <>
              {t('parcels:deleteConfirm.description')}{' '}
              <span className="font-medium text-foreground">{t('parcels:deleteConfirm.withWaybill', { number: p.npShipment.waybillNumber })}</span>
            </>
          ) : (
            t('parcels:deleteConfirm.description')
          )
        }
        confirmLabel={t('parcels:actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(p.id!)
            toast.success(t('common:common.saved'))
            navigate(move ? '/moves' : '/parcels')
          } catch (e) {
            showApiError(e)
          }
        }}
      />

      {/* a move: its items and bill need the whole width; then the same two columns as a parcel */}
      {move && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <MoveSeatsCard parcel={p} />
          <MoveBillCard parcel={p} />
        </div>
      )}
      {/* Two independent columns: a short card never leaves a hole next to a tall one. The facts come first on a phone. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
        <div className="flex flex-col gap-4 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle>{t(move ? 'parcels:sections.moveDetails' : 'parcels:sections.details')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <InfoGroup icon={UserRound} title={t('parcels:groups.client')} rows={clientRows} />
              {showSender && <InfoGroup icon={Send} title={t('parcels:groups.sender')} rows={senderRows} />}
              <InfoGroup icon={move ? Sofa : Package} title={t(move ? 'parcels:groups.move' : 'parcels:groups.cargo')} rows={cargoRows} />
              {!move && <InfoGroup icon={Truck} title={t('parcels:groups.logistics')} rows={logisticsRows} />}
              <InfoGroup icon={Info} title={t('parcels:groups.other')} rows={otherRows} />
              <MissingFields label={t('parcels:groups.missing')} rows={[...clientRows, ...(showSender ? senderRows : []), ...cargoRows.filter((r) => r !== volumeRow)]} />
            </CardContent>
          </Card>

          {/* a move: the client pays the whole bill, so «Оплата» sums it up instead of a separate transport payment */}
          {move && canSeeMoney && <MovePaymentCard parcel={p} />}
          {!move && canSeeMoney && (
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
              <CardContent className="flex flex-col gap-2">
                <InfoGroup rows={paymentRows} />
                {!hasPrice && <p className="text-sm text-muted-foreground">{t('parcels:payment.noPrice')}</p>}
              </CardContent>
            </Card>
          )}
          {/* «Онлайн-оплата»: the client's invoices and «Я оплатив» for a transfer, waiting for the manager */}
          {canSeeMoney && <OnlinePaymentsCard parcel={p} canDecide={isManager} />}

          <ParcelPhotosCard parcel={p} />
        </div>

        <div className="flex flex-col gap-4 lg:order-1">
          {!move && (
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
                  <p className="text-sm text-muted-foreground">
                    {p.seatsAmount == null ? t('parcels:sections.seatsUnknown') : t('parcels:sections.seatsPending', { count: p.seatsAmount })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {p.npTtn && (
            <Card>
              <CardHeader>
                <CardTitle>{t('parcels:sections.novaPoshta')}</CardTitle>
              </CardHeader>
              <CardContent>
                {!p.npStatusUpdatedAt && <p className="mb-3 rounded-md bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-900 dark:text-amber-300">{t('parcels:np.noTrackingHint')}</p>}
                <div className="flex flex-col gap-4">
                  <InfoGroup
                    icon={Hash}
                    title={t('parcels:groups.npNumbers')}
                    rows={[
                      { label: t('parcels:fields.npTtn'), value: <CopyableCode value={p.npTtn} /> },
                      {
                        label: t('parcels:np.previousTtnLabel'),
                        value: p.npPreviousTtn ? <CopyableCode value={p.npPreviousTtn} hint={t('parcels:np.previousTtn', { ttn: p.npPreviousTtn })} /> : undefined,
                      },
                      { label: t('parcels:fields.npRecipientWarehouse'), value: p.npRecipientWarehouse },
                    ]}
                  />
                  <InfoGroup
                    icon={Wallet}
                    title={t('parcels:groups.npPayment')}
                    rows={[
                      { label: t('parcels:np.payerType'), value: p.npPayerType ? t(`parcels:np.payer.${p.npPayerType}`, { defaultValue: p.npPayerType }) : undefined },
                      { label: t('parcels:np.paymentMethod'), value: p.npPaymentMethod ? t(`parcels:np.method.${p.npPaymentMethod}`, { defaultValue: p.npPaymentMethod }) : undefined },
                      // Nova Poshta only reports these when the representative's phone matches the recipient in the waybill.
                      { label: t('parcels:fields.npPaymentStatus'), value: isNpDeliveryPaid(p) ? t('parcels:np.paidOnline') : p.npPaymentStatus },
                      { label: t('parcels:fields.npDeliveryAmountDue'), value: p.npDeliveryAmountDue != null ? formatMoney(p.npDeliveryAmountDue) : undefined },
                    ]}
                  />
                  <InfoGroup
                    icon={CalendarClock}
                    title={t('parcels:groups.npStatus')}
                    rows={[
                      { label: t('parcels:fields.npStatus'), value: p.npStatusText ? `${p.npStatusText}${p.npStatusCode ? ` (${p.npStatusCode})` : ''}` : undefined },
                      { label: t('parcels:fields.npStatusUpdatedAt'), value: formatDateTime(p.npStatusUpdatedAt) },
                      { label: t('parcels:fields.npCreatedAt'), value: formatDateTime(p.npCreatedAt) },
                      { label: t('parcels:fields.npScheduledDeliveryAt'), value: formatDate(p.npScheduledDeliveryAt) },
                      { label: t('parcels:fields.npArrivedAt'), value: formatDateTime(p.npArrivedAt) },
                      { label: t('parcels:fields.npReceivedAt'), value: formatDateTime(p.npReceivedAt) },
                      { label: t('parcels:fields.npReturnAt'), value: formatDate(p.npReturnAt) },
                      {
                        label: t('parcels:fields.npPaidStorageFrom'),
                        value: p.npPaidStorageFrom ? <span className={paidStorageDue ? 'text-destructive' : undefined}>{formatDate(p.npPaidStorageFrom)}</span> : undefined,
                      },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {p.npTtn && <NpPaymentCard parcel={p} />}

          {!move && <NpShipmentCard parcel={p} />}

          <Card>
            <CardHeader>
              <CardTitle>{t('parcels:history.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ParcelHistory entries={history.data} isLoading={history.isPending} />
            </CardContent>
          </Card>
        </div>
      </div>

      <ParcelEditDialog parcel={p} open={editing} onOpenChange={setEditing} />
      <StatusChangeDialog parcel={p} open={changingStatus} onOpenChange={setChangingStatus} />
      <MarkPaidDialog parcel={p} open={markingPaid} onOpenChange={setMarkingPaid} />
      <ConfirmDialog open={unpaying} onOpenChange={setUnpaying} title={t('parcels:payment.unpaidConfirm')} confirmLabel={t('parcels:payment.markUnpaid')} destructive pending={setPayment.isPending} onConfirm={onUnpaid} />
    </>
  )
}

/** The public tracking page of the parcel, for the sender or recipient; the URL is there only when the company has the option on. */
function copyTrackingLink(url: string) {
  const done = () => toast.success(i18n.t('parcels:actions.trackingLinkCopied'))
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => window.prompt(i18n.t('parcels:actions.copyTrackingLink'), url))
  else window.prompt(i18n.t('parcels:actions.copyTrackingLink'), url)
}

/** Monospace code with a copy button (TTN numbers are typed into the Nova Poshta site/app by hand otherwise). */
function CopyableCode({ value, hint }: { value: string; hint?: string }) {
  const { t } = useTranslation('parcels')
  const copy = () => navigator.clipboard?.writeText(value).then(() => toast.success(t('np.copied')))
  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-1">
        <NpNumber value={value} />
        <Button variant="ghost" size="icon-sm" aria-label={t('np.copied')} onClick={copy}>
          <Copy />
        </Button>
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </span>
  )
}
